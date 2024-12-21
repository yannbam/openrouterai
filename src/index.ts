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

interface OpenRouterModel {
  id: string;
  name: string;
  description?: string;
  context_length: number;
  pricing: {
    prompt: string;
    completion: string;
  };
}

interface OpenRouterModelResponse {
  data: OpenRouterModel[];
}

// Simple in-memory state management
class StateManager {
  private static instance: StateManager;
  private defaultModel: string | undefined;
  private cachedModels: OpenRouterModelResponse | null = null;

  private constructor() {}

  static getInstance(): StateManager {
    if (!StateManager.instance) {
      StateManager.instance = new StateManager();
    }
    return StateManager.instance;
  }

  setDefaultModel(model: string) {
    this.defaultModel = model;
  }

  getDefaultModel(): string | undefined {
    return this.defaultModel;
  }

  clearDefaultModel() {
    this.defaultModel = undefined;
  }

  setCachedModels(models: OpenRouterModelResponse) {
    this.cachedModels = models;
  }

  getCachedModels(): OpenRouterModelResponse | null {
    return this.cachedModels;
  }

  clearCachedModels() {
    this.cachedModels = null;
  }

  async validateModel(model: string): Promise<boolean> {
    const models = await this.getCachedModels();
    if (!models) return false;
    return models.data.some(m => m.id === model);
  }

  async getModelInfo(model: string): Promise<OpenRouterModel | undefined> {
    const models = await this.getCachedModels();
    if (!models) return undefined;
    return models.data.find(m => m.id === model);
  }
}

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
if (!OPENROUTER_API_KEY) {
  throw new Error('OPENROUTER_API_KEY environment variable is required');
}

class OpenRouterServer {
  private server: Server;
  private openai: OpenAI;
  private stateManager: StateManager;

  constructor() {
    this.stateManager = StateManager.getInstance();
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
          name: 'set_default_model',
          description: 'Set the default model for subsequent chat completions',
          inputSchema: {
            type: 'object',
            properties: {
              model: {
                type: 'string',
                description: 'The model ID to set as default',
              },
            },
            required: ['model'],
          },
        },
        {
          name: 'clear_default_model',
          description: 'Clear the default model setting',
          inputSchema: {
            type: 'object',
            properties: {},
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
          
          const model = args.model || this.stateManager.getDefaultModel();
          if (!model) {
            return {
              content: [
                {
                  type: 'text',
                  text: 'No model specified and no default model set. Please specify a model or set a default model.',
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
            // Use cached models if available
            let models = this.stateManager.getCachedModels();
            if (!models) {
              const response = await this.openai.models.list();
              // Convert OpenAI model format to OpenRouter format
              const openRouterModels: OpenRouterModelResponse = {
                data: response.data.map(model => ({
                  id: model.id,
                  name: model.id.split('/').pop() || model.id,
                  context_length: 4096, // Default value, should be fetched from OpenRouter API
                  pricing: {
                    prompt: "0.000", // Default value, should be fetched from OpenRouter API
                    completion: "0.000" // Default value, should be fetched from OpenRouter API
                  }
                }))
              };
              this.stateManager.setCachedModels(openRouterModels);
              models = openRouterModels;
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
            // Use cached models if available
            let models = this.stateManager.getCachedModels();
            if (!models) {
              const response = await this.openai.models.list();
              // Convert OpenAI model format to OpenRouter format
              const openRouterModels: OpenRouterModelResponse = {
                data: response.data.map(model => ({
                  id: model.id,
                  name: model.id.split('/').pop() || model.id,
                  context_length: 4096, // Default value, should be fetched from OpenRouter API
                  pricing: {
                    prompt: "0.000", // Default value, should be fetched from OpenRouter API
                    completion: "0.000" // Default value, should be fetched from OpenRouter API
                  }
                }))
              };
              this.stateManager.setCachedModels(openRouterModels);
              models = openRouterModels;
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

        case 'set_default_model': {
          const { model } = request.params.arguments as { model: string };
          
          // Validate model before setting
          const isValid = await this.stateManager.validateModel(model);
          if (!isValid) {
            return {
              content: [
                {
                  type: 'text',
                  text: `Invalid model ID: ${model}. Please use a valid model ID.`,
                },
              ],
              isError: true,
            };
          }

          this.stateManager.setDefaultModel(model);
          const modelInfo = await this.stateManager.getModelInfo(model);
          
          return {
            content: [
              {
                type: 'text',
                text: `Default model set to: ${model}\nModel Info: ${JSON.stringify(modelInfo, null, 2)}`,
              },
            ],
          };
        }

        case 'clear_default_model': {
          this.stateManager.clearDefaultModel();
          return {
            content: [
              {
                type: 'text',
                text: 'Default model has been cleared.',
              },
            ],
          };
        }

        case 'get_model_info': {
          const { model } = request.params.arguments as { model: string };
          const modelInfo = await this.stateManager.getModelInfo(model);
          
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
          const isValid = await this.stateManager.validateModel(model);
          
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
