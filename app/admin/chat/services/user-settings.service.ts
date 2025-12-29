// User settings service for managing API keys

import { SupabaseClient } from '@supabase/supabase-js';

export class UserSettingsService {
  constructor(private supabase: SupabaseClient) {}

  /**
   * Load user settings (API keys) from database
   */
  async loadUserSettings(userId: string) {
    try {
      const { data, error } = await this.supabase
        .from('user_settings')
        .select('github_token, tavily_api_key')
        .eq('user_id', userId)
        .single();
      
      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        console.error('Error loading user settings:', error);
        return null;
      }
      
      return data || null;
    } catch (error) {
      console.error('Error loading user settings:', error);
      return null;
    }
  }

  /**
   * Save or update user API keys
   */
  async saveUserSettings(userId: string, githubToken?: string, tavilyApiKey?: string) {
    try {
      // Check if user settings exist
      const { data: existing } = await this.supabase
        .from('user_settings')
        .select('id')
        .eq('user_id', userId)
        .single();
      
      if (existing) {
        // Update existing settings
        const updateData: any = {};
        if (githubToken) updateData.github_token = githubToken;
        if (tavilyApiKey) updateData.tavily_api_key = tavilyApiKey;
        
        const { error } = await this.supabase
          .from('user_settings')
          .update(updateData)
          .eq('user_id', userId);
        
        if (error) throw error;
      } else {
        // Insert new settings
        const { error } = await this.supabase
          .from('user_settings')
          .insert({
            user_id: userId,
            github_token: githubToken || '',
            tavily_api_key: tavilyApiKey || '',
          });
        
        if (error) throw error;
      }
      
      return { success: true };
    } catch (error) {
      console.error('Error saving user settings:', error);
      return { success: false, error };
    }
  }
}
