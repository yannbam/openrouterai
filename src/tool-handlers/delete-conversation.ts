// src/tool-handlers/delete-conversation.ts
import { ConversationManager } from '../conversation-manager.js';

export interface DeleteConversationToolRequest {
  conversationId: string;
}

export async function handleDeleteConversation(request: {
  params: { arguments: DeleteConversationToolRequest };
}) {
  const convManager = ConversationManager.getInstance();
  const { conversationId } = request.params.arguments;

  if (!conversationId) {
    return {
      content: [{ type: 'text' as const, text: 'Error: conversationId is required.' }],
      isError: true,
    };
  }

  try {
    const deleted = convManager.deleteConversation(conversationId);
    if (!deleted) {
      return {
        content: [
          {
            type: 'text' as const,
            text: `Error: Conversation with ID "${conversationId}" not found or could not be deleted.`,
          },
        ],
        isError: true, // Or false, depending on whether "not found" is an error for delete
      };
    }
    return {
      content: [
        {
          type: 'text' as const,
          text: `Conversation with ID "${conversationId}" has been deleted successfully.`,
        },
      ],
      // No conversationId needed in response as it's deleted
    };
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(`Error deleting conversation ${conversationId}:`, error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return {
      content: [
        {
          type: 'text' as const,
          text: `Error deleting conversation: ${errorMessage}`,
        },
      ],
      isError: true,
    };
  }
}
