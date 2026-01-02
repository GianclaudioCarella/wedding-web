// Generic types for the chat agent

export interface Message {
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  timestamp: Date;
  tool_call_id?: string;
}

export interface Conversation {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

export interface Model {
  id: string;
  name: string;
  icon: string;
  description?: string;
}

export interface MemorySaveResult {
  success: boolean;
  message: string;
  summary?: string;
  importance?: number;
  topics?: string[];
}

export interface SearchWebResult {
  answer?: string;
  results: Array<{
    title: string;
    url: string;
    content: string;
    score: number;
  }>;
  query: string;
  from_cache?: boolean;
  cached_at?: string;
  error?: string;
}

export interface AgentConfig {
  models: Model[];
  defaultModel: string;
  systemMessage: string;
  tools: Tool[];
}

export interface Tool {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: {
      type: string;
      properties: Record<string, any>;
      required: string[];
    };
  };
}

export interface ToolExecutor {
  name: string;
  execute: (args: any) => Promise<any>;
}
