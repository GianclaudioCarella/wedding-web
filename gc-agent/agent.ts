// Generic AI Agent Core
// Handles communication with AI models and tool execution

import { Message, AgentConfig } from '../types';
import { ToolRegistry } from '../tools/tool-registry';

export interface AgentResponse {
  success: boolean;
  message?: Message;
  error?: string;
}

/**
 * Generic AI Agent
 * Core logic for interacting with AI models and executing tools
 */
export class GenericAgent {
  private toolRegistry: ToolRegistry;
  private config: AgentConfig;
  private githubToken: string;

  constructor(
    githubToken: string,
    config: AgentConfig,
    toolRegistry?: ToolRegistry
  ) {
    this.githubToken = githubToken;
    this.config = config;
    this.toolRegistry = toolRegistry || new ToolRegistry();
  }

  /**
   * Get the tool registry for registering custom tools
   */
  getToolRegistry(): ToolRegistry {
    return this.toolRegistry;
  }

  /**
   * Update agent configuration
   */
  updateConfig(config: Partial<AgentConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Send a message and get a response
   */
  async sendMessage(
    userMessage: string,
    conversationHistory: Message[],
    modelId?: string,
    additionalContext?: string
  ): Promise<AgentResponse> {
    if (!this.githubToken) {
      return {
        success: false,
        error: 'GitHub token not configured',
      };
    }

    try {
      const selectedModel = modelId || this.config.defaultModel;
      
      // Build system message with optional additional context
      let systemMessage = this.config.systemMessage;
      if (additionalContext) {
        systemMessage = additionalContext + '\n\n' + systemMessage;
      }

      // Build conversation messages
      const conversationMessages: Array<{
        role: string;
        content: string;
        tool_call_id?: string;
        tool_calls?: any;
      }> = [
        {
          role: 'system',
          content: systemMessage,
        },
        ...conversationHistory.map(m => ({ role: m.role, content: m.content })),
        { role: 'user', content: userMessage },
      ];

      // Get tools from registry
      const tools = this.toolRegistry.getTools();

      console.log('🔑 GitHub Token (first 10 chars):', this.githubToken?.substring(0, 10));
      console.log('🤖 Selected Model:', selectedModel);
      console.log('🔧 Available Tools:', tools.length);
      console.log('📨 Sending request to GitHub Models API...');
      
      let response = await fetch('https://models.inference.ai.azure.com/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.githubToken}`,
        },
        body: JSON.stringify({
          messages: conversationMessages,
          model: selectedModel,
          temperature: 0.7,
          max_tokens: 2000,
          tools: tools.length > 0 ? tools : undefined,
          tool_choice: tools.length > 0 ? 'auto' : undefined,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMsg = errorData.error?.message || errorData.message || response.statusText;
        throw new Error(errorMsg);
      }

      let data = await response.json();
      let assistantMessage = data.choices[0].message;

      // Handle tool calls
      while (assistantMessage.tool_calls && assistantMessage.tool_calls.length > 0) {
        conversationMessages.push(assistantMessage);

        // Execute all tool calls
        for (const toolCall of assistantMessage.tool_calls) {
          const toolName = toolCall.function.name;
          const toolArgs = JSON.parse(toolCall.function.arguments || '{}');
          
          try {
            console.log(`🔧 Executing tool: ${toolName}`);
            const toolResult = await this.toolRegistry.executeTool(toolName, toolArgs);
            conversationMessages.push({
              role: 'tool',
              tool_call_id: toolCall.id,
              content: JSON.stringify(toolResult),
            });
          } catch (error: any) {
            console.error(`❌ Tool execution failed: ${toolName}`, error);
            conversationMessages.push({
              role: 'tool',
              tool_call_id: toolCall.id,
              content: JSON.stringify({ error: error.message }),
            });
          }
        }

        // Get final response from model
        console.log('🔄 Sending follow-up request after tool execution...');
        response = await fetch('https://models.inference.ai.azure.com/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.githubToken}`,
          },
          body: JSON.stringify({
            messages: conversationMessages,
            model: selectedModel,
            temperature: 0.7,
            max_tokens: 2000,
            tools: tools.length > 0 ? tools : undefined,
            tool_choice: tools.length > 0 ? 'auto' : undefined,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          const errorMsg = errorData.error?.message || errorData.message || response.statusText;
          throw new Error(errorMsg);
        }

        data = await response.json();
        assistantMessage = data.choices[0].message;
      }

      return {
        success: true,
        message: {
          role: 'assistant',
          content: assistantMessage.content,
          timestamp: new Date(),
        },
      };
    } catch (error: any) {
      console.error('❌ Error in agent:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Format wait time for rate limit errors
   */
  private formatWaitTime(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours} hour${hours > 1 ? 's' : ''} and ${minutes} minute${minutes !== 1 ? 's' : ''}`;
    }
    return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
  }
}
