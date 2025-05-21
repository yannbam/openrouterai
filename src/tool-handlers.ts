import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  CallToolRequestSchema,
  CallToolRequest,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import OpenAI from 'openai';

import { ConversationManager } from './conversation-manager';
// ConversationMessage is not directly used, but Conversation is for type hints if needed.
// For now, direct usage is within ConversationManager.
// import { ConversationMessage, Conversation } from './conversation';
import { ModelCache } from './model-cache.js';
import { OpenRouterAPIClient } from './openrouter-api.js';
import { handleChatCompletion, ChatCompletionToolRequest } from './tool-handlers/chat-completion.js';
import { handleSearchModels, SearchModelsToolRequest } from './tool-handlers/search-models.js';
import { handleGetModelInfo, GetModelInfoToolRequest } from './tool-handlers/get-model-info.js';
import { handleValidateModel, ValidateModelToolRequest } from './tool-handlers/validate-model.js';
import { handleListConversations, ListConversationsToolRequest } from './tool-handlers/list-conversations';
import { handleGetConversationHistory, GetConversationHistoryToolRequest } from './tool-handlers/get-conversation-history';
import { handleDeleteConversation, DeleteConversationToolRequest } from './tool-handlers/delete-conversation';

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
        // Note: The inputSchema for chat_completion already includes conversationId
        {
          name: 'chat_completion',
          description: 'Send a message to OpenRouter.ai and get a response',
          inputSchema: {
            type: 'object',
            properties: {
              conversationId: {
                type: 'string',
                description: 'Optional ID of an existing conversation to continue.',
              },
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
        {
          name: 'list_conversations',
          description: 'Lists all available conversations.',
          inputSchema: {
            type: 'object',
            properties: {}, // Explicitly empty
          },
        },
        {
          name: 'get_conversation_history',
          description: 'Gets the message history for a specific conversation.',
          inputSchema: {
            type: 'object',
            properties: {
              conversationId: {
                type: 'string',
                description: 'The ID of the conversation to retrieve.',
              },
            },
            required: ['conversationId'],
          },
        },
        {
          name: 'delete_conversation',
          description: 'Deletes a specific conversation and its history.',
          inputSchema: {
            type: 'object',
            properties: {
              conversationId: {
                type: 'string',
                description: 'The ID of the conversation to delete.',
              },
            },
            required: ['conversationId'],
          },
        },
      ],
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request: CallToolRequest) => {
      const convManager = ConversationManager.getInstance();
      // Extract conversationId from request.params.
      // The 'as any' is used because CallToolRequest.params is strictly typed by SDK.
      const conversationId = (request.params as any).conversationId as string | undefined;
      let result: any; // To store the result from tool handlers

      const toolName = request.params.name;
      const toolArguments = request.params.arguments;

      // Log tool call if conversationId is valid and tool is not chat_completion
      if (conversationId && toolName !== 'chat_completion') {
        const conversation = convManager.getConversation(conversationId);
        if (conversation) {
          convManager.addMessageToConversation(conversationId, {
            role: 'tool',
            content: `Tool call: ${toolName} with arguments: ${JSON.stringify(toolArguments)}`,
            timestamp: new Date().toISOString(),
            toolName: toolName,
          });
        } else {
          console.warn(`Conversation with ID ${conversationId} not found for tool call logging.`);
        }
      }

      switch (toolName) {
        case 'chat_completion':
          // handleChatCompletion manages its own conversation logging.
          // The conversationId from arguments is passed to it directly.
          result = await handleChatCompletion({
            params: {
              arguments: toolArguments as unknown as ChatCompletionToolRequest
            }
          }, this.openai, this.defaultModel);
          // No generic tool result logging for chat_completion here.
          return result; // Early return for chat_completion
        
        case 'search_models':
          result = await handleSearchModels({
            params: {
              arguments: toolArguments as SearchModelsToolRequest
            }
          }, this.apiClient, this.modelCache);
          break;
        
        case 'get_model_info':
          result = await handleGetModelInfo({
            params: {
              arguments: toolArguments as unknown as GetModelInfoToolRequest
            }
          }, this.modelCache);
          break;
        
        case 'validate_model':
          result = await handleValidateModel({
            params: {
              arguments: toolArguments as unknown as ValidateModelToolRequest
            }
          }, this.modelCache);
          break;
        
        case 'list_conversations':
          result = await handleListConversations(); // No arguments passed
          break;
        
        case 'get_conversation_history':
          result = await handleGetConversationHistory({
            params: {
              arguments: toolArguments as GetConversationHistoryToolRequest
            }
          });
          break;
        
        case 'delete_conversation':
          result = await handleDeleteConversation({
            params: {
              arguments: toolArguments as DeleteConversationToolRequest
            }
          });
          break;

        default:
          throw new McpError(
            ErrorCode.MethodNotFound,
            `Unknown tool: ${toolName}`
          );
      }

      // Log tool result if conversationId is valid and tool is not chat_completion
      if (conversationId && toolName !== 'chat_completion') {
        const conversation = convManager.getConversation(conversationId); // Re-check conversation
        if (conversation) {
          let resultContent = '';
          if (result.content && result.content.length > 0 && result.content[0].type === 'text') {
            resultContent = result.content[0].text;
          } else {
            resultContent = JSON.stringify(result); // Fallback
          }

          convManager.addMessageToConversation(conversationId, {
            role: 'tool',
            content: `Tool result: ${toolName} completed. Output: ${resultContent}`,
            timestamp: new Date().toISOString(),
            toolName: toolName,
            // TODO: Consider adding a flag if result.isError is true, e.g. toolCallFailed: result.isError
          });
        }
        // console.warn for not found already handled above or implicitly if conv is null
      }
      return result;
    });
  }
}