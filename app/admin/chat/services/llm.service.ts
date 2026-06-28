// LLM Service — supports GitHub Models (OpenAI-compatible) and Anthropic APIs
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

  constructor(
    private githubToken: string,
    private anthropicKey?: string,
    private getAuthToken?: () => Promise<string | null>,
  ) {
    const metricsClient = getMetricsClient();
    this.metricsService = new MetricsService(metricsClient);
  }

  private isAnthropicModel(model: string): boolean {
    return model.startsWith('claude-');
  }

  async chatCompletion(request: LLMRequest): Promise<LLMResponse> {
    if (this.isAnthropicModel(request.model)) {
      return this.callAnthropic(request);
    }
    return this.callGitHubModels(request);
  }

  // ── GitHub Models (OpenAI-compatible) ─────────────────────────────────────

  private async callGitHubModels(request: LLMRequest): Promise<LLMResponse> {
    const startTime = Date.now();
    let success = true;
    let statusCode = 200;
    let errorMessage: string | undefined;

    try {
      const response = await fetch('https://models.inference.ai.azure.com/chat/completions', {
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
        if (errorMessage?.includes('Rate limit')) {
          const match = errorMessage.match(/wait (\d+) seconds/);
          if (match) {
            const s = parseInt(match[1]);
            const h = Math.floor(s / 3600);
            const m = Math.floor((s % 3600) / 60);
            const t = h > 0 ? `${h}h ${m}m` : `${m} minutes`;
            errorMessage = `⏳ **Rate limit for ${request.model}** — try again in ${t}.`;
          }
        }
        await this.logMetrics({ model: request.model, provider: 'github-models', responseTime: Date.now() - startTime, success: false, statusCode, errorMessage });
        throw new Error(errorMessage);
      }

      const data: LLMResponse = await response.json();
      await this.logMetrics({ model: request.model, provider: 'github-models', responseTime: Date.now() - startTime, success: true, statusCode: 200, usage: data.usage, hasTools: !!request.tools?.length, messageCount: request.messages.length });
      return data;
    } catch (error: any) {
      if (success) await this.logMetrics({ model: request.model, provider: 'github-models', responseTime: Date.now() - startTime, success: false, statusCode: statusCode || 500, errorMessage: error.message });
      throw error;
    }
  }

  // ── Anthropic ─────────────────────────────────────────────────────────────

  private async callAnthropic(request: LLMRequest): Promise<LLMResponse> {
    if (!this.anthropicKey) throw new Error('Anthropic API key is required for Claude models. Please configure it in API Keys settings.');

    const startTime = Date.now();
    let success = true;
    let statusCode = 200;
    let errorMessage: string | undefined;

    try {
      const { system, messages, tools } = this.toAnthropicRequest(request);

      const body: any = {
        model: request.model,
        max_tokens: request.max_tokens || 2000,
        messages,
      };
      if (system) body.system = system;
      if (tools?.length) {
        body.tools = tools;
        body.tool_choice = { type: 'auto' };
      }
      if (request.temperature !== undefined) body.temperature = request.temperature;

      const authToken = this.getAuthToken ? await this.getAuthToken() : null;
      const response = await fetch('/api/admin/chat/anthropic', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        },
        body: JSON.stringify(body),
      });

      statusCode = response.status;

      if (!response.ok) {
        success = false;
        let errorData: any;
        try { errorData = await response.json(); } catch { /* ignore */ }
        errorMessage = errorData?.error?.message || response.statusText;
        await this.logMetrics({ model: request.model, provider: 'anthropic', responseTime: Date.now() - startTime, success: false, statusCode, errorMessage });
        throw new Error(errorMessage);
      }

      const data = await response.json();
      const normalized = this.fromAnthropicResponse(data);
      await this.logMetrics({ model: request.model, provider: 'anthropic', responseTime: Date.now() - startTime, success: true, statusCode: 200, usage: normalized.usage, hasTools: !!request.tools?.length, messageCount: request.messages.length });
      return normalized;
    } catch (error: any) {
      if (success) await this.logMetrics({ model: request.model, provider: 'anthropic', responseTime: Date.now() - startTime, success: false, statusCode: statusCode || 500, errorMessage: error.message });
      throw error;
    }
  }

  // Convert OpenAI-format request → Anthropic format
  private toAnthropicRequest(request: LLMRequest): { system?: string; messages: any[]; tools?: any[] } {
    let system: string | undefined;
    const anthropicMessages: any[] = [];

    let i = 0;
    const msgs = request.messages;

    while (i < msgs.length) {
      const msg = msgs[i];

      if (msg.role === 'system') {
        system = msg.content;
        i++;
        continue;
      }

      if (msg.role === 'tool') {
        // Collect consecutive tool results into one user message
        const toolResults: any[] = [];
        while (i < msgs.length && msgs[i].role === 'tool') {
          toolResults.push({
            type: 'tool_result',
            tool_use_id: msgs[i].tool_call_id,
            content: msgs[i].content,
          });
          i++;
        }
        anthropicMessages.push({ role: 'user', content: toolResults });
        continue;
      }

      if (msg.role === 'assistant') {
        const content: any[] = [];
        if (msg.content) content.push({ type: 'text', text: msg.content });
        if (msg.tool_calls) {
          for (const tc of msg.tool_calls) {
            content.push({
              type: 'tool_use',
              id: tc.id,
              name: tc.function.name,
              input: (() => { try { return JSON.parse(tc.function.arguments || '{}'); } catch { return {}; } })(),
            });
          }
        }
        anthropicMessages.push({ role: 'assistant', content: content.length ? content : [{ type: 'text', text: '' }] });
        i++;
        continue;
      }

      // user
      anthropicMessages.push({ role: 'user', content: msg.content });
      i++;
    }

    const tools = request.tools?.map(t => ({
      name: t.function.name,
      description: t.function.description,
      input_schema: t.function.parameters,
    }));

    return { system, messages: anthropicMessages, tools };
  }

  // Convert Anthropic response → OpenAI format
  private fromAnthropicResponse(data: any): LLMResponse {
    const content: any[] = data.content || [];
    const textBlocks = content.filter((c: any) => c.type === 'text');
    const toolUseBlocks = content.filter((c: any) => c.type === 'tool_use');

    const textContent = textBlocks.map((b: any) => b.text).join('');
    const toolCalls = toolUseBlocks.map((b: any) => ({
      id: b.id,
      type: 'function',
      function: {
        name: b.name,
        arguments: JSON.stringify(b.input ?? {}),
      },
    }));

    const inputTokens = data.usage?.input_tokens || 0;
    const outputTokens = data.usage?.output_tokens || 0;

    return {
      choices: [{
        message: {
          role: 'assistant',
          content: textContent,
          ...(toolCalls.length ? { tool_calls: toolCalls } : {}),
        },
        finish_reason: data.stop_reason === 'tool_use' ? 'tool_calls' : 'stop',
      }],
      usage: {
        prompt_tokens: inputTokens,
        completion_tokens: outputTokens,
        total_tokens: inputTokens + outputTokens,
      },
      model: data.model,
    };
  }

  // ── Metrics ────────────────────────────────────────────────────────────────

  private async logMetrics(data: {
    model: string;
    provider: string;
    responseTime: number;
    success: boolean;
    statusCode: number;
    errorMessage?: string;
    usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
    hasTools?: boolean;
    messageCount?: number;
  }) {
    try {
      await this.metricsService.logApiCall({
        api_name: data.provider,
        endpoint: '/chat/completions',
        method: 'POST',
        response_time_ms: data.responseTime,
        status_code: data.statusCode,
        success: data.success,
        error_message: data.errorMessage,
        metadata: { model: data.model, has_tools: data.hasTools, message_count: data.messageCount },
      });

      if (data.success && data.usage) {
        const pricing: Record<string, { input: number; output: number }> = {
          'gpt-4o':                    { input: 0.0025,  output: 0.01   },
          'gpt-4o-mini':               { input: 0.00015, output: 0.0006 },
          'claude-sonnet-4-6':         { input: 0.003,   output: 0.015  },
          'claude-haiku-4-5-20251001': { input: 0.0008,  output: 0.004  },
        };
        const p = pricing[data.model] || pricing['gpt-4o'];
        const cost = (data.usage.prompt_tokens / 1_000_000) * p.input + (data.usage.completion_tokens / 1_000_000) * p.output;

        await this.metricsService.logTokenUsage({
          model: data.model,
          provider: data.provider,
          prompt_tokens: data.usage.prompt_tokens,
          completion_tokens: data.usage.completion_tokens,
          total_tokens: data.usage.total_tokens,
          estimated_cost_usd: cost,
          metadata: { has_tools: data.hasTools, message_count: data.messageCount },
        });
      }
    } catch {
      // metrics failures never break the app
    }
  }
}
