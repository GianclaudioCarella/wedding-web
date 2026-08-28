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
      description: 'List all guests or filter by status (confirmed, declined, maybe, no_response, invited, not_invited)',
      parameters: {
        type: 'object',
        properties: {
          filter: {
            type: 'string',
            enum: ['confirmed', 'declined', 'maybe', 'no_response', 'invited', 'not_invited', 'all'],
            description: 'Filter guests by their save-the-date status or whether they have been invited',
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

  // ── Actions (write tools — gated behind a confirm/cancel step in the UI) ──

  {
    type: 'function',
    function: {
      name: 'create_guest',
      description: 'Create a new guest. Defaults to inviting them to the main wedding ceremony unless specific events are given.',
      parameters: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Full name of the guest' },
          email: { type: 'string' },
          phone: { type: 'string' },
          language: { type: 'string', enum: ['en', 'pt', 'es'] },
          tags: { type: 'array', items: { type: 'string' } },
          party_role: { type: 'string', enum: ['primary', 'partner', 'child', 'other'], description: 'Defaults to primary' },
          party_leader_name: { type: 'string', description: 'Name of the primary guest this person travels with, if party_role is not primary' },
          event_names: { type: 'array', items: { type: 'string' }, description: 'Names of events to invite them to; omit to default to the main wedding event' },
        },
        required: ['name'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'update_guest',
      description: "Update fields on an existing guest: contact info, notes, tags, save-the-date answer, or transport needs. Only pass the fields that should change.",
      parameters: {
        type: 'object',
        properties: {
          guest_name: { type: 'string', description: 'Name of the guest to update' },
          email: { type: 'string' },
          phone: { type: 'string' },
          notes: { type: 'string' },
          tags: { type: 'array', items: { type: 'string' } },
          attending: { type: 'string', enum: ['yes', 'no', 'perhaps'], description: 'Save-the-date answer' },
          transport_needed: { type: 'boolean' },
          transport_from: { type: 'string', description: 'Where they need pickup from, if transport_needed is true' },
          transport_return: { type: 'boolean', description: 'Whether they also need the return journey' },
        },
        required: ['guest_name'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'update_rsvp_status',
      description: "Set a guest's formal RSVP status (attending/declined/pending) for a specific event.",
      parameters: {
        type: 'object',
        properties: {
          guest_name: { type: 'string' },
          event_name: { type: 'string', description: 'Name of the event, e.g. "wedding ceremony"' },
          status: { type: 'string', enum: ['attending', 'declined', 'pending'] },
        },
        required: ['guest_name', 'event_name', 'status'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'mark_guest_not_attending',
      description: 'Mark a guest (and their whole party) as not attending any event, and clear their venue stay request. Use for a full decline, not a single-event change.',
      parameters: {
        type: 'object',
        properties: { guest_name: { type: 'string' } },
        required: ['guest_name'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'create_transport_option',
      description: 'Create a new transport option (e.g. a bus or shuttle) guests can be assigned to.',
      parameters: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          direction: { type: 'string', enum: ['to_venue', 'from_venue', 'both'] },
          departure_location: { type: 'string' },
          departure_time: { type: 'string', description: 'ISO datetime' },
          return_time: { type: 'string', description: 'ISO datetime' },
          capacity: { type: 'number' },
          notes: { type: 'string' },
        },
        required: ['name', 'direction'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'assign_guest_to_transport',
      description: 'Add a guest to a transport option.',
      parameters: {
        type: 'object',
        properties: { guest_name: { type: 'string' }, option_name: { type: 'string' } },
        required: ['guest_name', 'option_name'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'create_room',
      description: 'Create a new venue room for guest accommodation.',
      parameters: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          room_type: { type: 'string' },
          capacity: { type: 'number' },
          floor: { type: 'string' },
          notes: { type: 'string' },
        },
        required: ['name'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'assign_guest_to_room',
      description: 'Assign a guest to a venue room (moves them if already assigned elsewhere).',
      parameters: {
        type: 'object',
        properties: { guest_name: { type: 'string' }, room_name: { type: 'string' }, bed_label: { type: 'string' } },
        required: ['guest_name', 'room_name'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'create_seating_table',
      description: 'Create a new seating table with two facing sides (A and B), each with the given number of seats.',
      parameters: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          seats_per_side: { type: 'number', description: 'Number of seats on each of the two sides' },
        },
        required: ['name', 'seats_per_side'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'assign_guest_to_seat',
      description: 'Seat a guest at a specific seat of a seating table (moves them if already seated elsewhere). Fails if the seat is already taken by someone else.',
      parameters: {
        type: 'object',
        properties: {
          guest_name: { type: 'string' },
          table_name: { type: 'string' },
          side: { type: 'string', enum: ['A', 'B'] },
          position: { type: 'number', description: 'Seat number on that side, starting at 1' },
        },
        required: ['guest_name', 'table_name', 'side', 'position'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'create_planning_task',
      description: 'Create a new wedding planning task on the calendar.',
      parameters: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          description: { type: 'string' },
          start_month: { type: 'number', description: '1-12' },
          end_month: { type: 'number', description: '1-12' },
          year: { type: 'number' },
        },
        required: ['name', 'start_month', 'end_month', 'year'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'update_planning_task_status',
      description: 'Mark a planning task as done or pending.',
      parameters: {
        type: 'object',
        properties: {
          task_name: { type: 'string' },
          status: { type: 'string', enum: ['pending', 'done'] },
        },
        required: ['task_name', 'status'],
      },
    },
  },
];

// Tool names that mutate data — every call to one of these is shown to the
// user as a confirm/cancel card in the chat before it actually runs.
export const WRITE_TOOL_NAMES = new Set([
  'create_guest',
  'update_guest',
  'update_rsvp_status',
  'mark_guest_not_attending',
  'create_transport_option',
  'assign_guest_to_transport',
  'create_room',
  'assign_guest_to_room',
  'create_seating_table',
  'assign_guest_to_seat',
  'create_planning_task',
  'update_planning_task_status',
]);

// One short, human-readable line per write tool, shown on the confirmation card.
export function describeWriteAction(name: string, args: any): string {
  switch (name) {
    case 'create_guest':
      return `Create guest **${args.name}**${args.party_leader_name ? ` (travelling with ${args.party_leader_name})` : ''}`;
    case 'update_guest':
      return `Update **${args.guest_name}**`;
    case 'update_rsvp_status':
      return `Mark **${args.guest_name}** as **${args.status}** for **${args.event_name}**`;
    case 'mark_guest_not_attending':
      return `Mark **${args.guest_name}** and their party as not attending anything`;
    case 'create_transport_option':
      return `Create transport option **${args.name}** (${args.direction})`;
    case 'assign_guest_to_transport':
      return `Add **${args.guest_name}** to transport **${args.option_name}**`;
    case 'create_room':
      return `Create room **${args.name}**`;
    case 'assign_guest_to_room':
      return `Assign **${args.guest_name}** to room **${args.room_name}**`;
    case 'create_seating_table':
      return `Create seating table **${args.name}** (${args.seats_per_side} seats per side)`;
    case 'assign_guest_to_seat':
      return `Seat **${args.guest_name}** at **${args.table_name}**, seat ${args.side}${args.position}`;
    case 'create_planning_task':
      return `Create planning task **${args.name}**`;
    case 'update_planning_task_status':
      return `Mark planning task **${args.task_name}** as **${args.status}**`;
    default:
      return `Run **${name}**`;
  }
}
