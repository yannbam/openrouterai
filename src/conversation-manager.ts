// src/conversation-manager.ts
import { Conversation, ConversationMessage } from './conversation';
import { randomUUID } from 'crypto'; // For generating unique IDs

export class ConversationManager {
  private static instance: ConversationManager;
  private conversations: Map<string, Conversation>;

  private constructor() {
    this.conversations = new Map<string, Conversation>();
  }

  public static getInstance(): ConversationManager {
    if (!ConversationManager.instance) {
      ConversationManager.instance = new ConversationManager();
    }
    return ConversationManager.instance;
  }

  public createConversation(initialMessages?: ConversationMessage[], metadata?: Record<string, any>): Conversation {
    const id = randomUUID();
    const now = new Date().toISOString();
    const newConversation: Conversation = {
      id,
      history: initialMessages || [],
      createdAt: now,
      lastUpdatedAt: now,
      metadata: metadata || {},
    };
    this.conversations.set(id, newConversation);
    return newConversation;
  }

  public getConversation(id: string): Conversation | undefined {
    return this.conversations.get(id);
  }

  public addMessageToConversation(id: string, message: ConversationMessage): Conversation | undefined {
    const conversation = this.conversations.get(id);
    if (conversation) {
      conversation.history.push(message);
      conversation.lastUpdatedAt = new Date().toISOString();
      this.conversations.set(id, conversation); // Re-set to ensure map updates if Conversation is a class instance
      return conversation;
    }
    return undefined;
  }

  public listConversations(): Partial<Conversation>[] {
    // Return a list of conversation summaries (e.g., id, createdAt, lastUpdatedAt, first few messages)
    // For now, returning basic info. This can be expanded.
    return Array.from(this.conversations.values()).map(conv => ({
      id: conv.id,
      createdAt: conv.createdAt,
      lastUpdatedAt: conv.lastUpdatedAt,
      messageCount: conv.history.length,
    }));
  }

  public deleteConversation(id: string): boolean {
    return this.conversations.delete(id);
  }
}
