import { ConversationManager } from '../conversation-manager.js';
import { ConversationMessage } from '../conversation.js';
import { OpenRouterAPIClient } from '../openrouter-api.js';

// Maximum context tokens (matches tool-handlers.ts)
const MAX_CONTEXT_TOKENS = 200000;

export interface ChatCompletionMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
}

export interface ChatCompletionToolRequest {
  conversationId?: string; // New field
  model?: string;
  messages: ChatCompletionMessage[];
  temperature?: number;
  max_tokens?: number;
  seed?: number;
  providers?: string[]; // New field for provider selection
  reasoning?: 'none' | 'low' | 'medium' | 'high'; // Reasoning support level
  additionalParams?: Record<string, string | number | boolean>;
}

// Utility function to estimate token count (simplified)
function estimateTokenCount(text: string): number {
  // Rough approximation: 4 characters per token
  return Math.ceil(text.length / 4);
}

// Truncate messages to fit within the context window
function truncateMessagesToFit(
  messages: ChatCompletionMessage[],
  maxTokens: number
): ChatCompletionMessage[] {
  const truncated: ChatCompletionMessage[] = [];
  let currentTokenCount = 0;

  // Always include system message first if present
  if (messages[0]?.role === 'system') {
    truncated.push(messages[0]);
    currentTokenCount += estimateTokenCount(messages[0].content);
  }

  // Add messages from the end, respecting the token limit
  for (let i = messages.length - 1; i >= 0; i--) {
    const messageTokens = estimateTokenCount(messages[i].content);
    if (currentTokenCount + messageTokens > maxTokens) break;

    truncated.unshift(messages[i]);
    currentTokenCount += messageTokens;
  }

  return truncated;
}

export async function handleChatCompletion(
  request: { params: { arguments: ChatCompletionToolRequest } },
  apiClient: OpenRouterAPIClient,
  defaultModel?: string
) {
  const args = request.params.arguments;
  const convManager = ConversationManager.getInstance();
  let returnedConversationId: string | undefined = args.conversationId;
  let messagesForAPI: ChatCompletionMessage[];

  // Validate model selection
  const model = args.model || defaultModel;
  if (!model) {
    return {
      content: [
        {
          type: 'text',
          text: 'No model specified and no default model configured in MCP settings. Please specify a model or set OPENROUTER_DEFAULT_MODEL in the MCP configuration.',
        },
      ],
      isError: true,
      conversationId: args.conversationId,
    };
  }

  // Validate message array
  if (args.messages.length === 0) {
    return {
      content: [
        {
          type: 'text',
          text: 'Messages array cannot be empty. At least one message is required.',
        },
      ],
      isError: true,
      conversationId: args.conversationId,
    };
  }

  if (args.conversationId) {
    const conversation = convManager.getConversation(args.conversationId);
    if (!conversation) {
      return {
        content: [{ type: 'text', text: `Conversation with ID ${args.conversationId} not found.` }],
        isError: true,
        conversationId: args.conversationId,
      };
    }
    // Map stored ConversationMessage to ChatCompletionMessage for API
    const historyMessages = conversation.history.map(
      (m: ConversationMessage) =>
        ({
          role: m.role as 'user' | 'system' | 'assistant' | 'tool',
          content: m.content,
        }) as ChatCompletionMessage
    );
    messagesForAPI = [...historyMessages, ...args.messages];
    returnedConversationId = args.conversationId;
  } else {
    messagesForAPI = args.messages;
    // For new conversations, ID is set after successful creation.
  }

  try {
    // Truncate messages to fit within context window
    const truncatedMessages = truncateMessagesToFit(messagesForAPI, MAX_CONTEXT_TOKENS);

    // Apply default reasoning value if not specified
    const reasoning = args.reasoning || 'medium';

    // Debug logging when DEBUG environment variable is set
    if (process.env.DEBUG === '1') {
      console.error(
        '[DEBUG] Chat Completion Tool Handler - Input params:',
        JSON.stringify(
          {
            model,
            messagesCount: truncatedMessages.length,
            temperature: args.temperature,
            max_tokens: args.max_tokens,
            seed: args.seed,
            reasoning: reasoning,
            additionalParams: args.additionalParams,
          },
          null,
          2
        )
      );
    }

    const response = await apiClient.chatCompletion({
      model,
      messages: truncatedMessages,
      temperature: args.temperature,
      max_tokens: args.max_tokens,
      seed: args.seed,
      providers: args.providers,
      reasoning: reasoning,
      additionalParams: args.additionalParams,
    });

    const completion = response.data;
    const assistantResponseContent = completion.choices[0].message.content || '';
    const assistantRole = completion.choices[0].message.role; // This is 'assistant'

    if (args.conversationId) {
      // Add the new user messages from args.messages to history
      args.messages.forEach(msg => {
        convManager.addMessageToConversation(args.conversationId!, {
          role: msg.role,
          content: msg.content,
          timestamp: new Date().toISOString(),
        });
      });
      // Add assistant's response to history
      convManager.addMessageToConversation(args.conversationId!, {
        role: assistantRole,
        content: assistantResponseContent,
        timestamp: new Date().toISOString(),
      });
    } else {
      const newConversation = convManager.createConversation();
      returnedConversationId = newConversation.id; // Set the ID for return

      // Add user's original messages from args.messages to new conversation's history
      args.messages.forEach(msg => {
        convManager.addMessageToConversation(newConversation.id, {
          role: msg.role,
          content: msg.content,
          timestamp: new Date().toISOString(),
        });
      });
      // Add assistant's response to new conversation's history
      convManager.addMessageToConversation(newConversation.id, {
        role: assistantRole,
        content: assistantResponseContent,
        timestamp: new Date().toISOString(),
      });
    }

    // Format response to match OpenRouter schema
    const formattedResponse = {
      id: `gen-${Date.now()}`,
      choices: [
        {
          finish_reason: completion.choices[0].finish_reason,
          message: {
            role: completion.choices[0].message.role,
            content: completion.choices[0].message.content || '',
            tool_calls: completion.choices[0].message.tool_calls,
          },
        },
      ],
      created: Math.floor(Date.now() / 1000),
      model: model,
      object: 'chat.completion',
      usage: completion.usage || {
        prompt_tokens: 0,
        completion_tokens: 0,
        total_tokens: 0,
      },
    };

    return {
      content: [
        {
          type: 'text',
          text:
            `conversationId: ${returnedConversationId}\n\n` +
            JSON.stringify(formattedResponse, null, 2),
        },
      ],
      // conversationId: returnedConversationId, // Add this field
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
        conversationId: returnedConversationId, // Include here
      };
    }
    throw error;
  }
}
