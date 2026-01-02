// Generic database service interface for chat operations
// This can be implemented for any database (Supabase, Postgres, MongoDB, etc.)

export interface DatabaseClient {
  // Conversation operations
  loadConversations(userId: string): Promise<any[]>;
  loadMessages(conversationId: string): Promise<any[]>;
  createConversation(userId: string, title: string): Promise<string | null>;
  deleteConversation(conversationId: string): Promise<{ success: boolean; error?: any }>;
  
  // Message operations
  saveMessage(conversationId: string, role: string, content: string): Promise<{ success: boolean; error?: any }>;
  
  // Settings operations
  loadSystemMessage(): Promise<string>;
  saveSystemMessage(userId: string, systemMessage: string): Promise<{ success: boolean; error?: any }>;
  
  // User settings operations
  loadUserSettings(userId: string): Promise<any>;
  saveUserSettings(userId: string, githubToken?: string, tavilyApiKey?: string): Promise<{ success: boolean; error?: any }>;
}

/**
 * Generic Chat Service
 * Provides a database-agnostic interface for chat operations
 */
export class GenericChatService {
  constructor(private dbClient: DatabaseClient) {}

  /**
   * Load system message from database
   */
  async loadSystemMessage() {
    return await this.dbClient.loadSystemMessage();
  }

  /**
   * Save system message to database
   */
  async saveSystemMessage(userId: string, systemMessage: string) {
    return await this.dbClient.saveSystemMessage(userId, systemMessage);
  }

  /**
   * Load all conversations for a user
   */
  async loadConversations(userId: string) {
    return await this.dbClient.loadConversations(userId);
  }

  /**
   * Load messages for a conversation
   */
  async loadMessages(conversationId: string) {
    return await this.dbClient.loadMessages(conversationId);
  }

  /**
   * Create a new conversation
   */
  async createConversation(userId: string, title: string) {
    return await this.dbClient.createConversation(userId, title);
  }

  /**
   * Save a message to a conversation
   */
  async saveMessage(conversationId: string, role: string, content: string) {
    return await this.dbClient.saveMessage(conversationId, role, content);
  }

  /**
   * Delete a conversation and all its messages
   */
  async deleteConversation(conversationId: string) {
    return await this.dbClient.deleteConversation(conversationId);
  }
}

/**
 * Generic User Settings Service
 * Provides a database-agnostic interface for user settings
 */
export class GenericUserSettingsService {
  constructor(private dbClient: DatabaseClient) {}

  /**
   * Load user settings (API keys) from database
   */
  async loadUserSettings(userId: string) {
    return await this.dbClient.loadUserSettings(userId);
  }

  /**
   * Save or update user API keys
   */
  async saveUserSettings(userId: string, githubToken?: string, tavilyApiKey?: string) {
    return await this.dbClient.saveUserSettings(userId, githubToken, tavilyApiKey);
  }
}
