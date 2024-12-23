#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import OpenAI from 'openai';
import { ChatCompletionMessageParam } from 'openai/resources/chat/completions.js';
import axios, { AxiosError, AxiosInstance } from 'axios';
import { setTimeout } from 'timers/promises';

interface OpenRouterModel {
  id: string;
  name: string;
  description?: string;
  context_length: number;
  pricing: {
    prompt: string;
    completion: string;
    unit: number;
  };
  top_provider?: {
    max_completion_tokens?: number;
    max_context_length?: number;
  };
  capabilities?: {
    functions?: boolean;
    tools?: boolean;
    vision?: boolean;
    json_mode?: boolean;
  };
}

interface OpenRouterModelResponse {
  data: OpenRouterModel[];
  timestamp?: number;
}

interface CachedModelResponse extends OpenRouterModelResponse {
  timestamp: number;
}

interface RateLimitState {
  remaining: number;
  reset: number;
  total: number;
}

const RETRY_DELAYS = [1000, 2000, 4000]; // Exponential backoff delays in ms

// Simple in-memory state management
class ModelCache {
  private static instance: ModelCache;
  private cachedModels: CachedModelResponse | null = null;
  private readonly cacheExpiry = 3600000; // 1 hour in milliseconds

  private constructor() {}

  static getInstance(): ModelCache {
    if (!ModelCache.instance) {
      ModelCache.instance = new ModelCache();
    }
    return ModelCache.instance;
  }

  private validateCache(): boolean {
    if (!this.cachedModels) return false;
    return Date.now() - this.cachedModels.timestamp <= this.cacheExpiry;
  }

  setCachedModels(models: OpenRouterModelResponse & { timestamp: number }) {
    this.cachedModels = models as CachedModelResponse;
  }

  getCachedModels(): CachedModelResponse | null {
    return this.validateCache() ? this.cachedModels : null;
  }

  clearCache() {
    this.cachedModels = null;
  }

  async validateModel(model: string): Promise<boolean> {
    const models = this.getCachedModels();
    if (!models) return false;
    return models.data.some(m => m.id === model);
  }

  async getModelInfo(model: string): Promise<OpenRouterModel | undefined> {
    const models = this.getCachedModels();
    if (!models) return undefined;
    return models.data.find(m => m.id === model);
  }
}

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const DEFAULT_MODEL = process.env.OPENROUTER_DEFAULT_MODEL;

if (!OPENROUTER_API_KEY) {
  throw new Error('OPENROUTER_API_KEY environment variable is required');
}

class OpenRouterServer {
  private server: Server;
  private openai: OpenAI;
  private modelCache: ModelCache;
  private axiosInstance: AxiosInstance;
  private rateLimit: RateLimitState = {
    remaining: 50, // Default conservative value
    reset: Date.now() + 60000,
    total: 50
  };

  constructor() {
    this.modelCache = ModelCache.getInstance();
    
    // Initialize axios instance for OpenRouter API
    this.axiosInstance = axios.create({
      baseURL: 'https://openrouter.ai/api/v1',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'HTTP-Referer': 'https://github.com/heltonteixeira/openrouterai',
        'X-Title': 'MCP OpenRouter Server'
      }
    });

    // Add response interceptor for rate limit headers
    this.axiosInstance.interceptors.response.use(
      (response: any) => {
        const remaining = parseInt(response.headers['x-ratelimit-remaining'] || '50');
        const reset = parseInt(response.headers['x-ratelimit-reset'] || '60');
        const total = parseInt(response.headers['x-ratelimit-limit'] || '50');

        this.rateLimit = {
          remaining,
          reset: Date.now() + (reset * 1000),
          total
        };

        return response;
      },
      async (error: AxiosError) => {
        if (error.response?.status === 429) {
          console.error('Rate limit exceeded, waiting for reset...');
          const resetAfter = parseInt(error.response.headers['retry-after'] || '60');
          await setTimeout(resetAfter * 1000);
          return this.axiosInstance.request(error.config!);
        }
        throw error;
      }
    );
    this.server = new Server(
      {
        name: 'openrouter-server',
        version: '0.1.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.openai = new OpenAI({
      apiKey: OPENROUTER_API_KEY,
      baseURL: 'https://openrouter.ai/api/v1',
      defaultHeaders: {
        'HTTP-Referer': 'https://github.com/heltonteixeira/openrouterai',
        'X-Title': 'MCP OpenRouter Server',
      },
    });

    this.setupToolHandlers();
    
    // Error handling
    this.server.onerror = (error) => console.error('[MCP Error]', error);
    process.on('SIGINT', async () => {
      await this.server.close();
      process.exit(0);
    });
  }

  private setupToolHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'chat_completion',
          description: 'Send a message to OpenRouter.ai and get a response',
          inputSchema: {
            type: 'object',
            properties: {
              model: {
                type: 'string',
                description: 'The model to use (e.g., "anthropic/claude-3.5-sonnet", "cohere/command-r-08-2024"). If not provided, uses the default model if set.',
              },
              messages: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    role: {
                      type: 'string',
                      enum: ['system', 'user', 'assistant'],
                      description: 'The role of the message sender',
                    },
                    content: {
                      type: 'string',
                      description: 'The content of the message',
                    },
                  },
                  required: ['role', 'content'],
                },
                description: 'The conversation messages',
              },
              temperature: {
                type: 'number',
                description: 'Sampling temperature (0-2)',
                minimum: 0,
                maximum: 2,
              },
            },
            required: ['messages'],
          },
        },
        {
          name: 'list_models',
          description: 'List all available models from OpenRouter.ai with pricing and context length',
          inputSchema: {
            type: 'object',
            properties: {},
          },
        },
        {
          name: 'search_models',
          description: 'Search for specific models by name or provider',
          inputSchema: {
            type: 'object',
            properties: {
              query: {
                type: 'string',
                description: 'Search query (e.g., "gpt", "anthropic", "claude")',
              },
            },
            required: ['query'],
          },
        },
        {
          name: 'get_model_info',
          description: 'Get detailed information about a specific model',
          inputSchema: {
            type: 'object',
            properties: {
              model: {
                type: 'string',
                description: 'The model ID to get information for',
              },
            },
            required: ['model'],
          },
        },
        {
          name: 'validate_model',
          description: 'Check if a model ID is valid',
          inputSchema: {
            type: 'object',
            properties: {
              model: {
                type: 'string',
                description: 'The model ID to validate',
              },
            },
            required: ['model'],
          },
        },
      ],
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      switch (request.params.name) {
        case 'chat_completion': {
          const args = request.params.arguments as {
            model?: string;
            messages: ChatCompletionMessageParam[];
            temperature?: number;
          };
          
          const model = args.model || DEFAULT_MODEL;
          if (!model) {
            return {
              content: [
                {
                  type: 'text',
                  text: 'No model specified and no default model configured in MCP settings. Please specify a model or set OPENROUTER_DEFAULT_MODEL in the MCP configuration.',
                },
              ],
              isError: true,
            };
          }

          try {
            const completion = await this.openai.chat.completions.create({
              model,
              messages: args.messages,
              temperature: args.temperature ?? 1,
            });

            return {
              content: [
                {
                  type: 'text',
                  text: completion.choices[0].message.content || '',
                },
              ],
            };
          } catch (error) {
            if (error instanceof Error) {
              return {
                content: [
                  {
                    type: 'text',
                    text: `OpenRouter API error: ${error.message}`,
                  },
                ],
                isError: true,
              };
            }
            throw error;
          }
        }

        case 'list_models': {
          try {
            // Check rate limits before making request
            if (this.rateLimit.remaining <= 0 && Date.now() < this.rateLimit.reset) {
              const waitTime = this.rateLimit.reset - Date.now();
              await setTimeout(waitTime);
            }

            // Use cached models if available and valid
            let models = this.modelCache.getCachedModels();
            
            if (!models) {
              for (let i = 0; i <= RETRY_DELAYS.length; i++) {
                try {
                  const response = await this.axiosInstance.get<OpenRouterModelResponse>('/models');
                  models = {
                    data: response.data.data,
                    timestamp: Date.now()
                  };
                  this.modelCache.setCachedModels(models);
                  break;
                } catch (error) {
                  if (i === RETRY_DELAYS.length) throw error;
                  await setTimeout(RETRY_DELAYS[i]);
                }
              }
            }

            if (!models) {
              return {
                content: [
                  {
                    type: 'text',
                    text: 'Failed to fetch models. Please try again.',
                  },
                ],
                isError: true,
              };
            }

            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(models.data, null, 2),
                },
              ],
            };
          } catch (error) {
            if (error instanceof Error) {
              return {
                content: [
                  {
                    type: 'text',
                    text: `Failed to fetch models: ${error.message}`,
                  },
                ],
                isError: true,
              };
            }
            throw error;
          }
        }

        case 'search_models': {
          const { query } = request.params.arguments as { query: string };
          try {
            // Check rate limits before making request
            if (this.rateLimit.remaining <= 0 && Date.now() < this.rateLimit.reset) {
              const waitTime = this.rateLimit.reset - Date.now();
              await setTimeout(waitTime);
            }

            // Use cached models if available
            let models = this.modelCache.getCachedModels();
            if (!models) {
              for (let i = 0; i <= RETRY_DELAYS.length; i++) {
                try {
                  const response = await this.axiosInstance.get<OpenRouterModelResponse>('/models');
                  models = {
                    data: response.data.data,
                    timestamp: Date.now()
                  };
                  this.modelCache.setCachedModels(models);
                  break;
                } catch (error) {
                  if (i === RETRY_DELAYS.length) throw error;
                  await setTimeout(RETRY_DELAYS[i]);
                }
              }
            }

            if (!models) {
              return {
                content: [
                  {
                    type: 'text',
                    text: 'Failed to fetch models. Please try again.',
                  },
                ],
                isError: true,
              };
            }

            const searchResults = models.data.filter(model =>
              model.id.toLowerCase().includes(query.toLowerCase())
            );

            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(searchResults, null, 2),
                },
              ],
            };
          } catch (error) {
            if (error instanceof Error) {
              return {
                content: [
                  {
                    type: 'text',
                    text: `Failed to search models: ${error.message}`,
                  },
                ],
                isError: true,
              };
            }
            throw error;
          }
        }

        case 'get_model_info': {
          const { model } = request.params.arguments as { model: string };
          const modelInfo = await this.modelCache.getModelInfo(model);
          
          if (!modelInfo) {
            return {
              content: [
                {
                  type: 'text',
                  text: `Model not found: ${model}`,
                },
              ],
              isError: true,
            };
          }

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(modelInfo, null, 2),
              },
            ],
          };
        }

        case 'validate_model': {
          const { model } = request.params.arguments as { model: string };
          const isValid = await this.modelCache.validateModel(model);
          
          return {
            content: [
              {
                type: 'text',
                text: isValid ? 'Model ID is valid.' : 'Model ID is invalid.',
              },
            ],
          };
        }

        default:
          throw new McpError(
            ErrorCode.MethodNotFound,
            `Unknown tool: ${request.params.name}`
          );
      }
    });
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('OpenRouter MCP server running on stdio');
  }
}

const server = new OpenRouterServer();
server.run().catch(console.error);
