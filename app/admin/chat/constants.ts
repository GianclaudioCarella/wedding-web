// Constants for chat admin

import { Model } from './types';

export const MODELS: Model[] = [
  { id: 'gpt-4o', name: 'GPT-4o', icon: '🤖', description: 'Most capable model, best quality responses' },
  { id: 'gpt-4o-mini', name: 'GPT-4o Mini', icon: '⚡', description: 'Faster and more efficient, great for most tasks' },
];

export const TOOLS = [
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
  {
    type: 'function',
    function: {
      name: 'get_guest_statistics',
      description: 'Get statistics about wedding guests including total count, confirmations, declines, and RSVP status',
      parameters: {
        type: 'object',
        properties: {},
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'list_guests',
      description: 'List all guests or filter by status (confirmed, declined, maybe, no_response, sent, pending)',
      parameters: {
        type: 'object',
        properties: {
          filter: {
            type: 'string',
            enum: ['confirmed', 'declined', 'maybe', 'no_response', 'sent', 'pending', 'all'],
            description: 'Filter guests by their status',
          },
        },
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'list_events',
      description: 'List all wedding events with their details',
      parameters: {
        type: 'object',
        properties: {},
        required: [],
      },
    },
  },
];
