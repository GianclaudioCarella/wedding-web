// Metrics service for tracking API calls, tokens usage, and performance

import { SupabaseClient } from '@supabase/supabase-js';

export interface ApiLogEntry {
  api_name: string;
  endpoint?: string;
  method?: string;
  user_id?: string;
  session_id?: string;
  response_time_ms?: number;
  status_code?: number;
  success: boolean;
  error_message?: string;
  error_type?: string;
  metadata?: Record<string, any>;
}

export interface TokenUsageEntry {
  model: string;
  provider: string;
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  estimated_cost_usd?: number;
  user_id?: string;
  session_id?: string;
  conversation_id?: string;
  metadata?: Record<string, any>;
}

export class MetricsService {
  constructor(private supabase: SupabaseClient) {}

  /**
   * Log an API call with timing and status information
   */
  async logApiCall(entry: ApiLogEntry): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('api_logs')
        .insert({
          api_name: entry.api_name,
          endpoint: entry.endpoint,
          method: entry.method || 'POST',
          user_id: entry.user_id,
          session_id: entry.session_id,
          response_time_ms: entry.response_time_ms,
          status_code: entry.status_code,
          success: entry.success,
          error_message: entry.error_message,
          error_type: entry.error_type,
          metadata: entry.metadata || {},
        });

      if (error) {
        console.error('Failed to log API call:', error);
      }
    } catch (err) {
      // Don't throw - metrics logging should not break the app
      console.error('Exception while logging API call:', err);
    }
  }

  /**
   * Log token usage for LLM calls
   */
  async logTokenUsage(entry: TokenUsageEntry): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('tokens_usage')
        .insert({
          model: entry.model,
          provider: entry.provider,
          prompt_tokens: entry.prompt_tokens,
          completion_tokens: entry.completion_tokens,
          total_tokens: entry.total_tokens,
          estimated_cost_usd: entry.estimated_cost_usd,
          user_id: entry.user_id,
          session_id: entry.session_id,
          conversation_id: entry.conversation_id,
          metadata: entry.metadata || {},
        });

      if (error) {
        console.error('Failed to log token usage:', error);
      }
    } catch (err) {
      console.error('Exception while logging token usage:', err);
    }
  }

  /**
   * Wrapper for API calls with automatic metrics tracking
   */
  async trackApiCall<T>(
    apiName: string,
    operation: () => Promise<T>,
    options?: {
      endpoint?: string;
      method?: string;
      userId?: string;
      sessionId?: string;
      metadata?: Record<string, any>;
    }
  ): Promise<T> {
    const startTime = Date.now();
    let success = true;
    let statusCode: number | undefined;
    let errorMessage: string | undefined;
    let errorType: string | undefined;

    try {
      const result = await operation();
      statusCode = 200; // Assume success
      return result;
    } catch (error: any) {
      success = false;
      statusCode = error.status || error.statusCode || 500;
      errorMessage = error.message || String(error);
      errorType = error.name || error.constructor?.name || 'Error';
      throw error; // Re-throw the error
    } finally {
      const responseTime = Date.now() - startTime;

      // Log asynchronously without awaiting
      this.logApiCall({
        api_name: apiName,
        endpoint: options?.endpoint,
        method: options?.method,
        user_id: options?.userId,
        session_id: options?.sessionId,
        response_time_ms: responseTime,
        status_code: statusCode,
        success,
        error_message: errorMessage,
        error_type: errorType,
        metadata: options?.metadata,
      }).catch(err => console.error('Failed to log metrics:', err));
    }
  }

  /**
   * Get Tavily API call statistics for a time range
   */
  async getTavilyStats(hours: number = 24, useCurrentMonth: boolean = false): Promise<{
    total_calls: number;
    successful_calls: number;
    failed_calls: number;
    avg_response_time_ms: number;
    cache_hit_rate?: number;
  }> {
    try {
      const { data, error } = await this.supabase
        .rpc('get_tavily_stats', { hours_ago: hours });

      if (error) {
        console.error('Failed to get Tavily stats:', error);
        return {
          total_calls: 0,
          successful_calls: 0,
          failed_calls: 0,
          avg_response_time_ms: 0,
        };
      }

      return data || {
        total_calls: 0,
        successful_calls: 0,
        failed_calls: 0,
        avg_response_time_ms: 0,
      };
    } catch (err) {
      console.error('Exception while getting Tavily stats:', err);
      return {
        total_calls: 0,
        successful_calls: 0,
        failed_calls: 0,
        avg_response_time_ms: 0,
      };
    }
  }

  /**
   * Get token usage statistics for a time range
   */
  async getTokenStats(hours: number = 24, useCurrentMonth: boolean = false): Promise<{
    total_tokens: number;
    prompt_tokens: number;
    completion_tokens: number;
    total_requests: number;
    estimated_cost_usd: number;
  }> {
    try {
      let startDate: string;
      
      if (useCurrentMonth) {
        const now = new Date();
        const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        startDate = firstDayOfMonth.toISOString();
      } else {
        startDate = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
      }

      const { data, error } = await this.supabase
        .from('tokens_usage')
        .select('prompt_tokens, completion_tokens, total_tokens, estimated_cost_usd')
        .gte('timestamp', startDate);

      if (error) {
        console.error('Failed to get token stats:', error);
        return {
          total_tokens: 0,
          prompt_tokens: 0,
          completion_tokens: 0,
          total_requests: 0,
          estimated_cost_usd: 0,
        };
      }

      if (!data || data.length === 0) {
        return {
          total_tokens: 0,
          prompt_tokens: 0,
          completion_tokens: 0,
          total_requests: 0,
          estimated_cost_usd: 0,
        };
      }

      let total_tokens = 0;
      let prompt_tokens = 0;
      let completion_tokens = 0;
      let total_requests = 0;
      let estimated_cost_usd = 0;

      for (const row of data) {
        total_tokens += row.total_tokens || 0;
        prompt_tokens += row.prompt_tokens || 0;
        completion_tokens += row.completion_tokens || 0;
        total_requests += 1;
        estimated_cost_usd += row.estimated_cost_usd || 0;
      }

      return {
        total_tokens,
        prompt_tokens,
        completion_tokens,
        total_requests,
        estimated_cost_usd,
      };
    } catch (err) {
      console.error('Exception while getting token stats:', err);
      return {
        total_tokens: 0,
        prompt_tokens: 0,
        completion_tokens: 0,
        total_requests: 0,
        estimated_cost_usd: 0,
      };
    }
  }
}
