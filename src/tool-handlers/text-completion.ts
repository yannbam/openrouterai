import { ConversationManager } from '../conversation-manager.js';
import { OpenRouterAPIClient } from '../openrouter-api.js';

export interface TextCompletionToolRequest {
  conversationId?: string;
  model: string;
  prompt: string;
  max_tokens?: number;
  temperature?: number;
  seed?: number;
  providers?: string[]; // New field for provider selection
  additionalParams?: Record<string, string | number | boolean>;
}

export async function handleTextCompletion(
  request: { params: { arguments: TextCompletionToolRequest } },
  apiClient: OpenRouterAPIClient
) {
  const args = request.params.arguments;
  const convManager = ConversationManager.getInstance();
  let returnedConversationId: string | undefined = args.conversationId;
  let finalPrompt = args.prompt;

  // Handle conversation continuation
  if (args.conversationId) {
    const conversation = convManager.getConversation(args.conversationId);
    if (!conversation) {
      return {
        content: [{ type: 'text', text: `Conversation with ID ${args.conversationId} not found.` }],
        isError: true,
        conversationId: args.conversationId,
      };
    }

    // For text completion continuation, append new prompt to the last assistant response
    const lastMessage = conversation.history[conversation.history.length - 1];
    if (lastMessage && lastMessage.role === 'assistant') {
      finalPrompt = lastMessage.content + args.prompt;
    }
    returnedConversationId = args.conversationId;
  }

  // Validate required parameters
  if (!args.model) {
    return {
      content: [
        {
          type: 'text',
          text: 'Model parameter is required for text completion.',
        },
      ],
      isError: true,
      conversationId: args.conversationId,
    };
  }

  if (!args.prompt) {
    return {
      content: [
        {
          type: 'text',
          text: 'Prompt parameter is required for text completion.',
        },
      ],
      isError: true,
      conversationId: args.conversationId,
    };
  }

  try {
    const requestParams = {
      model: args.model,
      prompt: finalPrompt,
      max_tokens: args.max_tokens,
      temperature: args.temperature,
      seed: args.seed,
      providers: args.providers,
      additionalParams: args.additionalParams,
    };

    // Debug logging when DEBUG environment variable is set
    if (process.env.DEBUG === '1') {
      console.error(
        '[DEBUG] Text Completion Tool Handler - Input params:',
        JSON.stringify(requestParams, null, 2)
      );
    }

    const response = await apiClient.textCompletion(requestParams);

    const completion = response.data;
    const completionText = completion.choices?.[0]?.text || '';

    // Handle conversation persistence
    if (args.conversationId) {
      // Add the new prompt to history
      convManager.addMessageToConversation(args.conversationId!, {
        role: 'user',
        content: args.prompt,
        timestamp: new Date().toISOString(),
      });
      // Add completion response to history
      convManager.addMessageToConversation(args.conversationId!, {
        role: 'assistant',
        content: completionText,
        timestamp: new Date().toISOString(),
      });
    } else {
      // Create new conversation
      const newConversation = convManager.createConversation();
      returnedConversationId = newConversation.id;

      // Add prompt to new conversation's history
      convManager.addMessageToConversation(newConversation.id, {
        role: 'user',
        content: args.prompt,
        timestamp: new Date().toISOString(),
      });
      // Add completion response to new conversation's history
      convManager.addMessageToConversation(newConversation.id, {
        role: 'assistant',
        content: completionText,
        timestamp: new Date().toISOString(),
      });
    }

    return {
      content: [
        {
          type: 'text',
          text: `conversationId: ${returnedConversationId}\n\n${completionText}`,
        },
      ],
    };
  } catch (error: any) {
    const errorMessage = error.response?.data?.error?.message || error.message || 'Unknown error';
    return {
      content: [
        {
          type: 'text',
          text: `OpenRouter API error: ${errorMessage}`,
        },
      ],
      isError: true,
      conversationId: returnedConversationId,
    };
  }
}
