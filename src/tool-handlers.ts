import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import OpenAI from 'openai';

import { ModelCache } from './model-cache.js';
import { OpenRouterAPIClient } from './openrouter-api.js';
import { handleChatCompletion, ChatCompletionToolRequest } from './tool-handlers/chat-completion.js';
import { handleSearchModels, SearchModelsToolRequest } from './tool-handlers/search-models.js';
import { handleGetModelInfo, GetModelInfoToolRequest } from './tool-handlers/get-model-info.js';
import { handleValidateModel, ValidateModelToolRequest } from './tool-handlers/validate-model.js';

export class ToolHandlers {
  private server: Server;
  private openai: OpenAI;
  private modelCache: ModelCache;
  private apiClient: OpenRouterAPIClient;
  private defaultModel?: string;

  constructor(
    server: Server, 
    apiKey: string, 
    defaultModel?: string
  ) {
    this.server = server;
    this.modelCache = ModelCache.getInstance();
    this.apiClient = new OpenRouterAPIClient(apiKey);
    this.defaultModel = defaultModel;

    this.openai = new OpenAI({
      apiKey: apiKey,
      baseURL: 'https://openrouter.ai/api/v1',
      defaultHeaders: {
        'HTTP-Referer': 'https://github.com/heltonteixeira/openrouterai',
        'X-Title': 'MCP OpenRouter Server',
      },
    });

    this.setupToolHandlers();
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
                description: 'The model to use (e.g., "google/gemini-2.0-flash-thinking-exp:free", "undi95/toppy-m-7b:free"). If not provided, uses the default model if set.',
              },
              messages: {
                type: 'array',
                description: 'An array of conversation messages with roles and content',
                minItems: 1,
                maxItems: 100,
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
                }              },
              temperature: {
                type: 'number',
                description: 'Sampling temperature (0-2)',
                minimum: 0,
                maximum: 2,
              },
            },
            required: ['messages'],
          },
          // Context window management details can be added as a separate property
           maxContextTokens: 200000
        },
        {
          name: 'search_models',
          description: 'Search and filter OpenRouter.ai models based on various criteria',
          inputSchema: {
            type: 'object',
            properties: {
              query: {
                type: 'string',
                description: 'Optional search query to filter by name, description, or provider',
              },
              provider: {
                type: 'string',
                description: 'Filter by specific provider (e.g., "anthropic", "openai", "cohere")',
              },
              minContextLength: {
                type: 'number',
                description: 'Minimum context length in tokens',
              },
              maxContextLength: {
                type: 'number',
                description: 'Maximum context length in tokens',
              },
              maxPromptPrice: {
                type: 'number',
                description: 'Maximum price per 1K tokens for prompts',
              },
              maxCompletionPrice: {
                type: 'number',
                description: 'Maximum price per 1K tokens for completions',
              },
              capabilities: {
                type: 'object',
                description: 'Filter by model capabilities',
                properties: {
                  functions: {
                    type: 'boolean',
                    description: 'Requires function calling capability',
                  },
                  tools: {
                    type: 'boolean',
                    description: 'Requires tools capability',
                  },
                  vision: {
                    type: 'boolean',
                    description: 'Requires vision capability',
                  },
                  json_mode: {
                    type: 'boolean',
                    description: 'Requires JSON mode capability',
                  }
                }
              },
              limit: {
                type: 'number',
                description: 'Maximum number of results to return (default: 10)',
                minimum: 1,
                maximum: 50
              }
            }
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
        case 'chat_completion':
          return handleChatCompletion({
            params: {
              arguments: request.params.arguments as unknown as ChatCompletionToolRequest
            }
          }, this.openai, this.defaultModel);
        
        case 'search_models':
          return handleSearchModels({
            params: {
              arguments: request.params.arguments as SearchModelsToolRequest
            }
          }, this.apiClient, this.modelCache);
        
        case 'get_model_info':
          return handleGetModelInfo({
            params: {
              arguments: request.params.arguments as unknown as GetModelInfoToolRequest
            }
          }, this.modelCache);
        
        case 'validate_model':
          return handleValidateModel({
            params: {
              arguments: request.params.arguments as unknown as ValidateModelToolRequest
            }
          }, this.modelCache);
        
        default:
          throw new McpError(
            ErrorCode.MethodNotFound,
            `Unknown tool: ${request.params.name}`
          );
      }
    });
  }
}