// src/tool-handlers/get-conversation-history.ts
import { ConversationManager } from '../conversation-manager.js';

export interface GetConversationHistoryToolRequest {
  conversationId: string;
}

export async function handleGetConversationHistory(
  request: { params: { arguments: GetConversationHistoryToolRequest } }
) {
  const convManager = ConversationManager.getInstance();
  const { conversationId } = request.params.arguments;

  if (!conversationId) {
    return {
      content: [{ type: 'text', text: 'Error: conversationId is required.' }],
      isError: true,
    };
  }

  try {
    const conversation = convManager.getConversation(conversationId);
    if (!conversation) {
      return {
        content: [{ type: 'text', text: `Error: Conversation with ID "${conversationId}" not found.` }],
        isError: true,
      };
    }
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(conversation.history, null, 2),
        },
      ],
      conversationId: conversationId, // Return the context
    };
  } catch (error) {
    console.error(`Error getting history for conversation ${conversationId}:`, error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return {
      content: [
        {
          type: 'text',
          text: `Error getting conversation history: ${errorMessage}`,
        },
      ],
      isError: true,
      conversationId: conversationId,
    };
  }
}
