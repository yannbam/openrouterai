import OpenAI from 'openai';
import { ChatCompletionMessageParam } from 'openai/resources/chat/completions.js';
import { ConversationManager } from '../conversation-manager.js';
import { ConversationMessage } from '../conversation.js';

// Maximum context tokens (matches tool-handlers.ts)
const MAX_CONTEXT_TOKENS = 200000;

export interface ChatCompletionToolRequest {
  conversationId?: string; // New field
  model?: string;
  messages: ChatCompletionMessageParam[]; // This type comes from OpenAI SDK
  temperature?: number;
}

// Utility function to estimate token count (simplified)
function estimateTokenCount(text: string): number {
  // Rough approximation: 4 characters per token
  return Math.ceil(text.length / 4);
}

// Truncate messages to fit within the context window
function truncateMessagesToFit(
  messages: ChatCompletionMessageParam[], 
  maxTokens: number
): ChatCompletionMessageParam[] {
  const truncated: ChatCompletionMessageParam[] = [];
  let currentTokenCount = 0;

  // Always include system message first if present
  if (messages[0]?.role === 'system') {
    truncated.push(messages[0]);
    currentTokenCount += estimateTokenCount(messages[0].content as string);
  }

  // Add messages from the end, respecting the token limit
  for (let i = messages.length - 1; i >= 0; i--) {
    const messageTokens = estimateTokenCount(messages[i].content as string);
    if (currentTokenCount + messageTokens > maxTokens) break;

    truncated.unshift(messages[i]);
    currentTokenCount += messageTokens;
  }

  return truncated;
}

export async function handleChatCompletion(
  request: { params: { arguments: ChatCompletionToolRequest } },
  openai: OpenAI,
  defaultModel?: string
) {
  const args = request.params.arguments;
  const convManager = ConversationManager.getInstance();
  let returnedConversationId: string | undefined = args.conversationId;
  let messagesForOpenAI: ChatCompletionMessageParam[];

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
    // Map stored ConversationMessage to ChatCompletionMessageParam for OpenAI
    const historyMessages = conversation.history.map((m: ConversationMessage) => ({
      role: m.role as 'user' | 'system' | 'assistant' | 'tool', // Cast needed
      content: m.content
    } as ChatCompletionMessageParam));
    messagesForOpenAI = [...historyMessages, ...args.messages];
    returnedConversationId = args.conversationId;
  } else {
    messagesForOpenAI = args.messages;
    // For new conversations, ID is set after successful creation.
  }

  try {
    // Truncate messages to fit within context window
    const truncatedMessages = truncateMessagesToFit(messagesForOpenAI, MAX_CONTEXT_TOKENS);

    const completion = await openai.chat.completions.create({
      model,
      messages: truncatedMessages,
      temperature: args.temperature ?? 1,
    });

    const assistantResponseContent = completion.choices[0].message.content || '';
    const assistantRole = completion.choices[0].message.role; // This is 'assistant'

    if (args.conversationId) {
      // Add the new user messages from args.messages to history
      args.messages.forEach(msg => {
        convManager.addMessageToConversation(args.conversationId!, {
          role: msg.role as 'user' | 'system' | 'assistant', // OpenAI's role type
          content: msg.content as string, // OpenAI's content type
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
          role: msg.role as 'user' | 'system' | 'assistant', // OpenAI's role type
          content: msg.content as string, // OpenAI's content type
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
    const response = {
      id: `gen-${Date.now()}`,
      choices: [{
        finish_reason: completion.choices[0].finish_reason,
        message: {
          role: completion.choices[0].message.role,
          content: completion.choices[0].message.content || '',
          tool_calls: completion.choices[0].message.tool_calls
        }
      }],
      created: Math.floor(Date.now() / 1000),
      model: model,
      object: 'chat.completion',
      usage: completion.usage || {
        prompt_tokens: 0,
        completion_tokens: 0,
        total_tokens: 0
      }
    };

    return {
      content: [
        {
          type: 'text',
          text: `conversationId: ${returnedConversationId}\n\n` + JSON.stringify(response, null, 2), // 'response' is the formatted OpenAI completion
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