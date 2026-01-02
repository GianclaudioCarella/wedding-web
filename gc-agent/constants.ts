// Generic constants for the chat agent

import { Model } from './types';

export const DEFAULT_MODELS: Model[] = [
  { id: 'gpt-4o', name: 'GPT-4o', icon: '🤖', description: 'Most capable model, best quality responses' },
  { id: 'gpt-4o-mini', name: 'GPT-4o Mini', icon: '⚡', description: 'Faster and more efficient, great for most tasks' },
];

export const DEFAULT_SYSTEM_MESSAGE = 'You are a helpful AI assistant. You have access to tools to help answer questions. Use these tools when needed to provide accurate, up-to-date information.';

// Base tool: Web search (generic and useful for any domain)
export const DEFAULT_TOOLS = [
  {
    type: 'function',
    function: {
      name: 'search_web',
      description: 'Search the web for current information, news, facts, or any information not in your knowledge base. Use this when you need real-time or up-to-date information.',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'The search query to look up on the web',
          },
        },
        required: ['query'],
      },
    },
  },
];
