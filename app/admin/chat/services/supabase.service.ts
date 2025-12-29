// Supabase service for chat operations (conversations, messages, settings)

import { SupabaseClient } from '@supabase/supabase-js';

export class ChatSupabaseService {
  constructor(private supabase: SupabaseClient) {}

  /**
   * Load system message from database
   */
  async loadSystemMessage() {
    const { data, error } = await this.supabase
      .from('chat_settings')
      .select('setting_value')
      .eq('setting_key', 'system_message')
      .single();

    if (error) {
      console.error('Error loading system message:', error);
      return '';
    }

    return data?.setting_value || '';
  }

  /**
   * Save system message to database
   */
  async saveSystemMessage(userId: string, systemMessage: string) {
    const { error } = await this.supabase
      .from('chat_settings')
      .update({
        setting_value: systemMessage,
        updated_at: new Date().toISOString(),
      })
      .eq('setting_key', 'system_message');

    if (error) {
      console.error('Error saving system message:', error);
      return { success: false, error };
    }

    return { success: true };
  }

  /**
   * Load all conversations for a user
   */
  async loadConversations(userId: string) {
    const { data, error } = await this.supabase
      .from('chat_conversations')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('Error loading conversations:', error);
      return [];
    }

    return data || [];
  }

  /**
   * Load messages for a conversation
   */
  async loadMessages(conversationId: string) {
    const { data, error } = await this.supabase
      .from('chat_messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error loading messages:', error);
      return [];
    }

    return data || [];
  }

  /**
   * Create a new conversation
   */
  async createConversation(userId: string, title: string) {
    const { data, error } = await this.supabase
      .from('chat_conversations')
      .insert({
        user_id: userId,
        title: title,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating conversation:', error);
      return null;
    }

    return data?.id || null;
  }

  /**
   * Save a message to a conversation
   */
  async saveMessage(conversationId: string, role: string, content: string) {
    const { error } = await this.supabase
      .from('chat_messages')
      .insert({
        conversation_id: conversationId,
        role: role,
        content: content,
      });

    if (error) {
      console.error('Error saving message:', error);
      return { success: false, error };
    }

    // Update conversation timestamp
    await this.supabase
      .from('chat_conversations')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', conversationId);
    
    return { success: true };
  }

  /**
   * Delete a conversation and all its messages
   */
  async deleteConversation(conversationId: string) {
    const { error } = await this.supabase
      .from('chat_conversations')
      .delete()
      .eq('id', conversationId);

    if (error) {
      console.error('Error deleting conversation:', error);
      return { success: false, error };
    }

    return { success: true };
  }
}
