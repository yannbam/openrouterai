// src/tool-handlers/list-conversations.ts
import { ConversationManager } from '../conversation-manager';

export interface ListConversationsToolRequest {} // No specific arguments needed

export async function handleListConversations(
  // request: { params: { arguments: ListConversationsToolRequest } } // No args needed
) {
  const convManager = ConversationManager.getInstance();
  try {
    const conversations = convManager.listConversations(); // This returns Partial<Conversation>[]
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(conversations, null, 2),
        },
      ],
      // No conversationId needed in the response for this tool itself
    };
  } catch (error) {
    console.error('Error listing conversations:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return {
      content: [
        {
          type: 'text',
          text: `Error listing conversations: ${errorMessage}`,
        },
      ],
      isError: true,
    };
  }
}
