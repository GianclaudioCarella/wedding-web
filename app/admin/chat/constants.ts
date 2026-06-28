// Constants for chat admin

import { Model } from './types';

export const MODELS: Model[] = [
  { id: 'gpt-4o',                    name: 'GPT-4o',           icon: '🤖', description: 'Most capable OpenAI model',       provider: 'github' },
  { id: 'gpt-4o-mini',               name: 'GPT-4o Mini',      icon: '⚡', description: 'Faster and more efficient',        provider: 'github' },
  { id: 'claude-sonnet-4-6',         name: 'Claude Sonnet 4.6', icon: '✦', description: 'Balanced Claude model',            provider: 'anthropic' },
  { id: 'claude-haiku-4-5-20251001', name: 'Claude Haiku 4.5', icon: '◆', description: 'Fast and lightweight Claude model', provider: 'anthropic' },
];

export const TOOLS = [
  {
    type: 'function',
    function: {
      name: 'search_memories',
      description: 'Search through saved conversation memories/summaries from previous conversations. Use this to recall past discussions, decisions, preferences, or information that was marked as important with "Remember me". Great for finding what was discussed before about specific topics.',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'What to search for in saved memories (e.g., "budget decisions", "venue preferences", "guest list")',
          },
        },
        required: ['query'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'search_documents',
      description: 'Search through uploaded wedding documents (PDFs, spreadsheets, etc.) for specific information like costs, budgets, vendor details, contracts, timelines, or any other wedding planning information that may have been uploaded. ALWAYS use this tool first when asked about specific wedding details, costs, budgets, or information that might be in documents.',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'What to search for in the documents (e.g., "wedding cost", "venue budget", "photographer price")',
          },
        },
        required: ['query'],
      },
    },
  },
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
  {
    type: 'function',
    function: {
      name: 'get_transport_overview',
      description: 'Get all transport options with the guests assigned to each one. Use this to answer questions about transport, buses, shuttles, or how guests are getting to/from the venue.',
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_accommodation_overview',
      description: 'Get venue room assignments, guest stay requests by night (Thu/Fri/Sat), and external hotel options. Use this for questions about where guests are sleeping or staying.',
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_planning_tasks',
      description: 'Get the wedding planning task list. Use this to check what has been done, what is pending, or the overall planning progress.',
      parameters: {
        type: 'object',
        properties: {
          filter: {
            type: 'string',
            enum: ['all', 'pending', 'done'],
            description: 'Filter tasks by status. Use "pending" for outstanding tasks, "done" for completed ones, "all" for everything.',
          },
        },
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_communications_history',
      description: 'Get the history of email campaigns sent to guests. Use this to check what communications have been sent, when, and to how many guests.',
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_rsvp_details',
      description: 'Get detailed RSVP breakdown per event, including confirmed/declined/pending counts and any dietary requirements or restrictions guests have specified.',
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_guest_email_status',
      description: 'Get the email communication status for all guests: who has an email registered, who has already received the save the date, and who still needs to receive it. Use this for any questions about email communications, save the dates, or which guests have been contacted.',
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },
];
