// Example: How to use MetricsService in your application

import { createClient } from '@supabase/supabase-js';
import { MetricsService } from '@/app/admin/chat/services/metrics.service';

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Create metrics service instance
const metricsService = new MetricsService(supabase);

// ============================================
// Example 1: Track OpenAI API Call with Tokens
// ============================================
async function chatWithAI(prompt: string) {
  try {
    const response = await metricsService.trackApiCall(
      'openai',
      async () => {
        const res = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
          },
          body: JSON.stringify({
            model: 'gpt-4',
            messages: [{ role: 'user', content: prompt }],
          }),
        });
        
        if (!res.ok) throw new Error(`OpenAI error: ${res.statusText}`);
        return await res.json();
      },
      {
        endpoint: '/v1/chat/completions',
        method: 'POST',
        metadata: {
          model: 'gpt-4',
          prompt_length: prompt.length,
        },
      }
    );

    // Log token usage separately
    const usage = response.usage;
    if (usage) {
      await metricsService.logTokenUsage({
        model: 'gpt-4',
        provider: 'openai',
        prompt_tokens: usage.prompt_tokens,
        completion_tokens: usage.completion_tokens,
        total_tokens: usage.total_tokens,
        // GPT-4 pricing: $0.03/1K prompt tokens, $0.06/1K completion tokens
        estimated_cost_usd: 
          (usage.prompt_tokens / 1000) * 0.03 + 
          (usage.completion_tokens / 1000) * 0.06,
        metadata: {
          model: 'gpt-4',
          prompt_preview: prompt.substring(0, 100),
        },
      });
    }

    return response;
  } catch (error) {
    console.error('Chat error:', error);
    throw error;
  }
}

// ============================================
// Example 2: Manual API Log (without wrapper)
// ============================================
async function customApiCall() {
  const startTime = Date.now();
  
  try {
    const response = await fetch('https://api.example.com/data');
    const responseTime = Date.now() - startTime;
    
    // Log successful call
    await metricsService.logApiCall({
      api_name: 'example-api',
      endpoint: '/data',
      method: 'GET',
      response_time_ms: responseTime,
      status_code: response.status,
      success: response.ok,
      metadata: {
        cache_used: false,
      },
    });
    
    return await response.json();
  } catch (error: any) {
    const responseTime = Date.now() - startTime;
    
    // Log failed call
    await metricsService.logApiCall({
      api_name: 'example-api',
      endpoint: '/data',
      method: 'GET',
      response_time_ms: responseTime,
      status_code: 500,
      success: false,
      error_message: error.message,
      error_type: error.name,
    });
    
    throw error;
  }
}

// ============================================
// Example 3: Get Statistics
// ============================================
async function displayStats() {
  // Get Tavily statistics
  const tavilyStats = await metricsService.getTavilyStats(24); // Last 24 hours
  console.log('Tavily Stats (24h):', {
    total: tavilyStats.total_calls,
    successful: tavilyStats.successful_calls,
    failed: tavilyStats.failed_calls,
    avgResponseTime: `${tavilyStats.avg_response_time_ms}ms`,
    cacheHitRate: tavilyStats.cache_hit_rate 
      ? `${(tavilyStats.cache_hit_rate * 100).toFixed(1)}%` 
      : 'N/A',
  });

  // Get token usage statistics
  const tokenStats = await metricsService.getTokenStats(24); // Last 24 hours
  console.log('Token Usage (24h):', {
    totalTokens: tokenStats.total_tokens.toLocaleString(),
    promptTokens: tokenStats.prompt_tokens.toLocaleString(),
    completionTokens: tokenStats.completion_tokens.toLocaleString(),
    requests: tokenStats.total_requests,
    estimatedCost: `$${tokenStats.estimated_cost_usd.toFixed(4)}`,
  });
}

// ============================================
// Example 4: Track Anthropic Claude API
// ============================================
async function chatWithClaude(prompt: string) {
  const response = await metricsService.trackApiCall(
    'anthropic',
    async () => {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': process.env.ANTHROPIC_API_KEY!,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-3-sonnet-20240229',
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 1024,
        }),
      });
      
      if (!res.ok) throw new Error(`Anthropic error: ${res.statusText}`);
      return await res.json();
    },
    {
      endpoint: '/v1/messages',
      method: 'POST',
      metadata: { model: 'claude-3-sonnet' },
    }
  );

  // Log token usage
  const usage = response.usage;
  if (usage) {
    await metricsService.logTokenUsage({
      model: 'claude-3-sonnet',
      provider: 'anthropic',
      prompt_tokens: usage.input_tokens,
      completion_tokens: usage.output_tokens,
      total_tokens: usage.input_tokens + usage.output_tokens,
      // Claude pricing: $0.003/1K input, $0.015/1K output
      estimated_cost_usd:
        (usage.input_tokens / 1000) * 0.003 +
        (usage.output_tokens / 1000) * 0.015,
    });
  }

  return response;
}

// ============================================
// Example 5: Track with User Context
// ============================================
async function trackUserAction(userId: string, sessionId: string) {
  await metricsService.trackApiCall(
    'custom-service',
    async () => {
      // Your API call here
      return { success: true };
    },
    {
      userId,
      sessionId,
      endpoint: '/user/action',
      metadata: {
        action: 'process_document',
        timestamp: new Date().toISOString(),
      },
    }
  );
}

// Export for use in your application
export {
  chatWithAI,
  chatWithClaude,
  customApiCall,
  displayStats,
  trackUserAction,
  metricsService,
};
