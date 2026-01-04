// LLM Service with automatic metrics tracking
import { getMetricsClient } from './metrics-client';
import { MetricsService } from './metrics.service';

export interface LLMRequest {
  model: string;
  messages: Array<{
    role: string;
    content: string;
    tool_call_id?: string;
    tool_calls?: any;
  }>;
  temperature?: number;
  max_tokens?: number;
  tools?: any[];
  tool_choice?: string;
}

export interface LLMResponse {
  choices: Array<{
    message: {
      role: string;
      content: string;
      tool_calls?: any[];
    };
    finish_reason: string;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  model: string;
}

export class LLMService {
  private metricsService: MetricsService;

  constructor(private githubToken: string) {
    const metricsClient = getMetricsClient();
    this.metricsService = new MetricsService(metricsClient);
  }

  /**
   * Call GitHub Models API with automatic metrics tracking
   */
  async chatCompletion(request: LLMRequest): Promise<LLMResponse> {
    const startTime = Date.now();
    let response: Response | undefined;
    let success = true;
    let statusCode = 200;
    let errorMessage: string | undefined;

    try {
      response = await fetch('https://models.inference.ai.azure.com/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.githubToken}`,
        },
        body: JSON.stringify(request),
      });

      statusCode = response.status;

      if (!response.ok) {
        success = false;
        let errorData: any;
        try {
          errorData = await response.json();
          errorMessage = errorData.error?.message || errorData.message || response.statusText;
        } catch {
          errorMessage = await response.text() || response.statusText;
        }
        
        // Format rate limit errors with helpful information
        if (errorMessage && errorMessage.includes('Rate limit')) {
          const match = errorMessage.match(/wait (\d+) seconds/);
          if (match) {
            const waitSeconds = parseInt(match[1]);
            const hours = Math.floor(waitSeconds / 3600);
            const minutes = Math.floor((waitSeconds % 3600) / 60);
            const waitTime = hours > 0 
              ? `${hours} hour${hours > 1 ? 's' : ''} and ${minutes} minute${minutes !== 1 ? 's' : ''}`
              : `${minutes} minute${minutes !== 1 ? 's' : ''}`;
            
            errorMessage = `⏳ **Rate Limit Exceeded for ${request.model}**\n\nYou've reached the limit of requests for this model.\n\n⏱️ Wait ${waitTime} to use this model again.`;
          } else {
            errorMessage = `⏳ **Rate Limit Exceeded for ${request.model}**\n\n${errorMessage}`;
          }
        }
        
        // Log error metrics
        await this.logMetrics({
          model: request.model,
          responseTime: Date.now() - startTime,
          success: false,
          statusCode,
          errorMessage,
          errorType: this.getErrorType(statusCode, errorMessage),
        });

        throw new Error(errorMessage);
      }

      const data: LLMResponse = await response.json();
      
      // Log success metrics
      await this.logMetrics({
        model: request.model,
        responseTime: Date.now() - startTime,
        success: true,
        statusCode: 200,
        usage: data.usage,
        hasTools: request.tools && request.tools.length > 0,
        messageCount: request.messages.length,
      });

      return data;
    } catch (error: any) {
      // Ensure metrics are logged even if there's an exception
      if (success) {
        await this.logMetrics({
          model: request.model,
          responseTime: Date.now() - startTime,
          success: false,
          statusCode: statusCode || 500,
          errorMessage: error.message,
          errorType: error.name || 'Error',
        });
      }
      throw error;
    }
  }

  /**
   * Log metrics to database
   */
  private async logMetrics(data: {
    model: string;
    responseTime: number;
    success: boolean;
    statusCode: number;
    errorMessage?: string;
    errorType?: string;
    usage?: {
      prompt_tokens: number;
      completion_tokens: number;
      total_tokens: number;
    };
    hasTools?: boolean;
    messageCount?: number;
  }) {
    try {
      // Log API call metrics
      await this.metricsService.logApiCall({
        api_name: 'github-models',
        endpoint: '/chat/completions',
        method: 'POST',
        response_time_ms: data.responseTime,
        status_code: data.statusCode,
        success: data.success,
        error_message: data.errorMessage,
        error_type: data.errorType,
        metadata: {
          model: data.model,
          has_tools: data.hasTools,
          message_count: data.messageCount,
        },
      });

      // Log token usage if successful
      if (data.success && data.usage) {
        const estimatedCost = this.calculateCost(data.model, data.usage);
        
        await this.metricsService.logTokenUsage({
          model: data.model,
          provider: 'github-models',
          prompt_tokens: data.usage.prompt_tokens,
          completion_tokens: data.usage.completion_tokens,
          total_tokens: data.usage.total_tokens,
          estimated_cost_usd: estimatedCost,
          metadata: {
            has_tools: data.hasTools,
            message_count: data.messageCount,
          },
        });
      }
    } catch (error) {
      console.error('Failed to log metrics:', error);
      // Don't throw - metrics failures shouldn't break the app
    }
  }

  /**
   * Calculate estimated cost based on model and usage
   * GitHub Models is free during preview, but we track as if it was paid
   */
  private calculateCost(model: string, usage: {
    prompt_tokens: number;
    completion_tokens: number;
  }): number {
    // Pricing based on similar OpenAI models (for estimation)
    const pricing: Record<string, { input: number; output: number }> = {
      'gpt-4o': { input: 0.0025, output: 0.01 },       // $2.50/$10 per 1M tokens
      'gpt-4o-mini': { input: 0.00015, output: 0.0006 }, // $0.15/$0.60 per 1M tokens
      'o1-preview': { input: 0.015, output: 0.06 },    // $15/$60 per 1M tokens
      'o1-mini': { input: 0.003, output: 0.012 },      // $3/$12 per 1M tokens
    };

    const modelPricing = pricing[model] || pricing['gpt-4o']; // Default to gpt-4o pricing
    
    const inputCost = (usage.prompt_tokens / 1_000_000) * modelPricing.input;
    const outputCost = (usage.completion_tokens / 1_000_000) * modelPricing.output;
    
    return inputCost + outputCost;
  }

  /**
   * Determine error type from status code and message
   */
  private getErrorType(statusCode: number, message?: string): string {
    if (message?.includes('Rate limit')) return 'RateLimitError';
    if (message?.includes('authentication')) return 'AuthenticationError';
    if (message?.includes('quota')) return 'QuotaError';
    
    switch (statusCode) {
      case 400: return 'BadRequestError';
      case 401: return 'AuthenticationError';
      case 403: return 'PermissionError';
      case 404: return 'NotFoundError';
      case 429: return 'RateLimitError';
      case 500: return 'ServerError';
      case 503: return 'ServiceUnavailableError';
      default: return 'APIError';
    }
  }
}
