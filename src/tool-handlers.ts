import {
  ChatCompletionToolRequest,
  handleChatCompletion,
} from './tool-handlers/chat-completion.js';
import {
  DeleteConversationToolRequest,
  handleDeleteConversation,
} from './tool-handlers/delete-conversation.js';
import {
  GetConversationHistoryToolRequest,
  handleGetConversationHistory,
} from './tool-handlers/get-conversation-history.js';
import { GetModelInfoToolRequest, handleGetModelInfo } from './tool-handlers/get-model-info.js';
import {
  GetModelProvidersToolRequest,
  handleGetModelProviders,
} from './tool-handlers/get-model-providers.js';
import { SearchModelsToolRequest, handleSearchModels } from './tool-handlers/search-models.js';
import {
  TextCompletionToolRequest,
  handleTextCompletion,
} from './tool-handlers/text-completion.js';
import { ValidateModelToolRequest, handleValidateModel } from './tool-handlers/validate-model.js';
import { z } from 'zod';

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import { ModelCache } from './model-cache.js';
import { OpenRouterAPIClient } from './openrouter-api.js';
import { handleListConversations } from './tool-handlers/list-conversations.js';

// MCP SDK compatible response format
interface McpToolResponse {
  content: Array<{ type: 'text'; text: string }>;
  isError?: boolean;
  conversationId?: string;
  [key: string]: unknown;
}

export class ToolHandlers {
  private server: McpServer;
  private modelCache: ModelCache;
  private apiClient: OpenRouterAPIClient;
  private defaultModel?: string;

  constructor(server: McpServer, apiKey: string, defaultModel?: string) {
    this.server = server;
    this.modelCache = ModelCache.getInstance();
    this.apiClient = new OpenRouterAPIClient(apiKey);
    this.defaultModel = defaultModel;

    this.setupToolHandlers();
  }

  private setupToolHandlers() {
    // Tool handlers already return the correct CallToolResult format
    // No conversion needed - just return the results directly

    // Register chat completion tool
    this.server.registerTool(
      'ai-chat_completion',
      {
        description: 'Send a message to an AI model and get a response',
        inputSchema: {
          conversationId: z
            .string()
            .optional()
            .describe(
              'Optional ID of an existing conversation to continue. When an ID is provided, the conversation history will be prepended and you only need to set the new user message in the messages argument!'
            ),
          model: z
            .string()
            .optional()
            .describe(
              'The model to use (e.g., "google/gemini-2.0-flash-thinking-exp:free", "undi95/toppy-m-7b:free"). If not provided, uses the default model if set.'
            ),
          messages: z
            .array(
              z.object({
                role: z
                  .enum(['system', 'user', 'assistant'])
                  .describe('The role of the message sender'),
                content: z.string().describe('The content of the message'),
              })
            )
            .min(1)
            .max(100)
            .describe('An array of conversation messages with roles and content'),
          temperature: z.number().min(0).max(2).optional().describe('Sampling temperature (0-2)'),
          max_tokens: z
            .number()
            .min(1)
            .optional()
            .describe('Maximum number of tokens to generate (optional)'),
          seed: z
            .number()
            .optional()
            .describe('Random seed for deterministic generation (optional)'),
          providers: z
            .array(z.string())
            .optional()
            .describe(
              'Optional list of provider names to use (e.g., ["hyperbolic", "openai"]). By default, OpenRouter automatically chooses the best available provider. When specified, only these providers will be used, with fallbacks disabled.'
            ),
          reasoning: z
            .enum(['none', 'low', 'medium', 'high'])
            .optional()
            .describe(
              'Reasoning level for models that support reasoning (optional). Controls how much reasoning the model does internally before responding. Default: "medium". Set to "none" to disable reasoning.'
            ),
          additionalParams: z
            .record(z.union([z.string(), z.number(), z.boolean()]))
            .optional()
            .describe(
              'Additional API parameters to pass to OpenRouter (optional). Object with key-value pairs where values can be strings, numbers, or booleans.'
            ),
        },
      },
      async (args: unknown) => {
        const result = await handleChatCompletion(
          {
            params: {
              arguments: args as ChatCompletionToolRequest,
            },
          },
          this.apiClient,
          this.defaultModel
        );

        // Convert our ToolResult to the MCP SDK format: { content: [{ type: "text", text: string }] }
        const resultText = result.content[0]?.text || 'Error: No content';
        const response: McpToolResponse = {
          content: [{ type: 'text', text: resultText }],
        };
        if ('isError' in result && result.isError) {
          response.isError = true;
        }
        if (result.conversationId) {
          response.conversationId = result.conversationId;
        }
        return response;
      }
    );
    // Register text completion tool
    this.server.registerTool(
      'ai-text_completion',
      {
        description:
          'Generate text completion from a prompt using OpenRouter.ai models. Supports conversation continuation by appending new prompts to previous responses. Note: For "looming" (generating alternative conversation branches), you typically: 1) generate multiple continuations of the same prompt and choose which branch to continue, and 2) slightly edit or crop the response before feeding it back as input.',
        inputSchema: {
          conversationId: z
            .string()
            .optional()
            .describe(
              'Optional ID of an existing conversation to continue. When provided, the new prompt will be appended to the last assistant response.'
            ),
          model: z
            .string()
            .describe(
              'The model to use for text completion (e.g., "meta-llama/llama-3.1-405b:free").'
            ),
          prompt: z.string().describe('The text prompt to complete.'),
          max_tokens: z
            .number()
            .min(1)
            .optional()
            .describe('Maximum number of tokens to generate (optional).'),
          temperature: z
            .number()
            .min(0)
            .max(2)
            .optional()
            .describe('Sampling temperature (0-2, optional).'),
          seed: z
            .number()
            .optional()
            .describe('Random seed for deterministic generation (optional).'),
          providers: z
            .array(z.string())
            .optional()
            .describe(
              'Optional list of provider names to use (e.g., ["hyperbolic", "openai"]). By default, OpenRouter automatically chooses the best available provider. When specified, only these providers will be used, with fallbacks disabled.'
            ),
          additionalParams: z
            .record(z.union([z.string(), z.number(), z.boolean()]))
            .optional()
            .describe(
              'Additional API parameters to pass to OpenRouter (optional). Object with key-value pairs where values can be strings, numbers, or booleans.'
            ),
        },
      },
      async (args: unknown) => {
        const result = await handleTextCompletion(
          {
            params: {
              arguments: args as TextCompletionToolRequest,
            },
          },
          this.apiClient
        );

        const resultText = result.content[0]?.text || 'Error: No content';
        const response: McpToolResponse = {
          content: [{ type: 'text', text: resultText }],
        };
        if ('isError' in result && result.isError) {
          response.isError = true;
        }
        if ('conversationId' in result && result.conversationId) {
          response.conversationId = result.conversationId as string;
        }
        return response;
      }
    );
    // Register search models tool
    this.server.registerTool(
      'ai-chat_search_models',
      {
        description: 'Search and filter OpenRouter.ai models based on various criteria',
        inputSchema: {
          query: z
            .string()
            .optional()
            .describe('Optional search query to filter by name, description, or provider'),
          provider: z
            .string()
            .optional()
            .describe('Filter by specific provider (e.g., "anthropic", "openai", "cohere")'),
          minContextLength: z.number().optional().describe('Minimum context length in tokens'),
          maxContextLength: z.number().optional().describe('Maximum context length in tokens'),
          maxPromptPrice: z.number().optional().describe('Maximum price per 1K tokens for prompts'),
          maxCompletionPrice: z
            .number()
            .optional()
            .describe('Maximum price per 1K tokens for completions'),
          capabilities: z
            .object({
              functions: z.boolean().optional().describe('Requires function calling capability'),
              tools: z.boolean().optional().describe('Requires tools capability'),
              vision: z.boolean().optional().describe('Requires vision capability'),
              json_mode: z.boolean().optional().describe('Requires JSON mode capability'),
            })
            .optional()
            .describe('Filter by model capabilities'),
          limit: z
            .number()
            .min(1)
            .max(50)
            .optional()
            .describe('Maximum number of results to return (default: 10)'),
        },
      },
      async (args: unknown) => {
        const result = await handleSearchModels(
          {
            params: {
              arguments: args as SearchModelsToolRequest,
            },
          },
          this.apiClient,
          this.modelCache
        );

        const resultText = result.content[0]?.text || 'Error: No content';
        const response: McpToolResponse = {
          content: [{ type: 'text', text: resultText }],
        };
        if ('isError' in result && result.isError) {
          response.isError = true;
        }
        return response;
      }
    );

    // Register get model info tool
    this.server.registerTool(
      'ai-chat_get_model_info',
      {
        description: 'Get detailed information about a specific model',
        inputSchema: {
          model: z.string().describe('The model ID to get information for'),
        },
      },
      async (args: unknown) => {
        const result = await handleGetModelInfo(
          {
            params: {
              arguments: args as GetModelInfoToolRequest,
            },
          },
          this.modelCache,
          this.apiClient
        );

        const resultText = result.content[0]?.text || 'Error: No content';
        const response: McpToolResponse = {
          content: [{ type: 'text', text: resultText }],
        };
        if ('isError' in result && result.isError) {
          response.isError = true;
        }
        return response;
      }
    );

    // Register get model providers tool
    this.server.registerTool(
      'ai-get_model_providers',
      {
        description:
          'Get live provider endpoint information for a specific model, including pricing, quantization, and availability',
        inputSchema: {
          model: z.string().describe('The model ID to get provider information for'),
        },
      },
      async (args: unknown) => {
        const result = await handleGetModelProviders(
          {
            params: {
              arguments: args as GetModelProvidersToolRequest,
            },
          },
          this.apiClient,
          this.modelCache
        );

        const resultText = result.content[0]?.text || 'Error: No content';
        const response: McpToolResponse = {
          content: [{ type: 'text', text: resultText }],
        };
        if ('isError' in result && result.isError) {
          response.isError = true;
        }
        return response;
      }
    );

    // Register validate model tool
    this.server.registerTool(
      'ai-chat_validate_model',
      {
        description: 'Check if a model ID is valid',
        inputSchema: {
          model: z.string().describe('The model ID to validate'),
        },
      },
      async (args: unknown) => {
        const result = await handleValidateModel(
          {
            params: {
              arguments: args as ValidateModelToolRequest,
            },
          },
          this.modelCache
        );

        const resultText = result.content[0]?.text || 'Error: No content';
        const response: McpToolResponse = {
          content: [{ type: 'text', text: resultText }],
        };
        if ('isError' in result && result.isError) {
          response.isError = true;
        }
        return response;
      }
    );

    // Register list conversations tool
    this.server.registerTool(
      'ai-chat_list_conversations',
      {
        description: 'Lists all available conversations.',
        inputSchema: {},
      },
      async () => {
        const result = await handleListConversations();

        const resultText = result.content[0]?.text || 'Error: No content';
        const response: McpToolResponse = {
          content: [{ type: 'text', text: resultText }],
        };
        if ('isError' in result && result.isError) {
          response.isError = true;
        }
        return response;
      }
    );

    // Register get conversation history tool
    this.server.registerTool(
      'ai-chat_get_conversation_history',
      {
        description: 'Gets the message history for a specific conversation.',
        inputSchema: {
          conversationId: z.string().describe('The ID of the conversation to retrieve.'),
        },
      },
      async (args: unknown) => {
        const result = await handleGetConversationHistory({
          params: {
            arguments: args as GetConversationHistoryToolRequest,
          },
        });

        const resultText = result.content[0]?.text || 'Error: No content';
        const response: McpToolResponse = {
          content: [{ type: 'text', text: resultText }],
        };
        if ('isError' in result && result.isError) {
          response.isError = true;
        }
        return response;
      }
    );

    // Register delete conversation tool
    this.server.registerTool(
      'ai-chat_delete_conversation',
      {
        description: 'Deletes a specific conversation and its history.',
        inputSchema: {
          conversationId: z.string().describe('The ID of the conversation to delete.'),
        },
      },
      async (args: unknown) => {
        const result = await handleDeleteConversation({
          params: {
            arguments: args as DeleteConversationToolRequest,
          },
        });

        const resultText = result.content[0]?.text || 'Error: No content';
        const response: McpToolResponse = {
          content: [{ type: 'text', text: resultText }],
        };
        if ('isError' in result && result.isError) {
          response.isError = true;
        }
        return response;
      }
    );
  }
}
