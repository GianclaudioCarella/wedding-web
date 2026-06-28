import { SupabaseClient } from '@supabase/supabase-js';

export class UserSettingsService {
  constructor(private supabase: SupabaseClient) {}

  private async getAuthHeader(): Promise<Record<string, string>> {
    const { data: { session } } = await this.supabase.auth.getSession();
    const token = session?.access_token;
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  async loadUserSettings(_userId: string) {
    try {
      const headers = await this.getAuthHeader();
      const response = await fetch('/api/admin/settings', { headers });
      if (!response.ok) return null;
      return await response.json();
    } catch (error) {
      console.error('Error loading user settings:', error);
      return null;
    }
  }

  async saveUserSettings(_userId: string, githubToken?: string, tavilyApiKey?: string, anthropicApiKey?: string) {
    try {
      const headers = await this.getAuthHeader();
      const body: Record<string, string | undefined> = {};
      if (githubToken     !== undefined) body.github_token      = githubToken;
      if (tavilyApiKey    !== undefined) body.tavily_api_key    = tavilyApiKey;
      if (anthropicApiKey !== undefined) body.anthropic_api_key = anthropicApiKey;

      const response = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to save settings');
      }
      return { success: true };
    } catch (error) {
      console.error('Error saving user settings:', error);
      return { success: false, error };
    }
  }
}
