// src/conversation.ts

// Define the structure for a single message in a conversation
export interface ConversationMessage {
  role: 'system' | 'user' | 'assistant' | 'tool'; // Added 'tool' role
  content: string;
  timestamp?: string; // Optional: to record when the message was added
  toolCallId?: string; // Optional: if the message is a tool call
  toolName?: string; // Optional: if the message is a tool call/result
}

// Define the structure for a conversation
export interface Conversation {
  id: string; // Unique identifier for the conversation
  history: ConversationMessage[]; // Array of messages
  createdAt: string; // Timestamp of creation
  lastUpdatedAt: string; // Timestamp of the last update
  metadata?: Record<string, any>; // Optional: for any other relevant data
}
