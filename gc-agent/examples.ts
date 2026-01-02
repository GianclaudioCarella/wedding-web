/**
 * Example: How to use the Generic Agent
 * 
 * This file demonstrates how to integrate the GC-Agent into your application
 */

import { GenericAgent } from './agent';
import { DEFAULT_MODELS, DEFAULT_SYSTEM_MESSAGE } from './constants';
import { AgentConfig, Tool } from './types';
import { ToolRegistry } from './tools/tool-registry';
import { SearchWebTool } from './tools/search-web.tool';

// ============================================================================
// EXAMPLE 1: Basic Chat Agent
// ============================================================================

export async function basicChatExample() {
  const config: AgentConfig = {
    models: DEFAULT_MODELS,
    defaultModel: 'gpt-4o-mini',
    systemMessage: 'You are a helpful AI assistant.',
    tools: [],
  };

  const agent = new GenericAgent('your-github-token', config);

  const response = await agent.sendMessage(
    'What is the capital of France?',
    []
  );

  console.log('Response:', response.message?.content);
}

// ============================================================================
// EXAMPLE 2: Agent with Web Search
// ============================================================================

export async function agentWithWebSearch() {
  const config: AgentConfig = {
    models: DEFAULT_MODELS,
    defaultModel: 'gpt-4o-mini',
    systemMessage: DEFAULT_SYSTEM_MESSAGE,
    tools: [],
  };

  const agent = new GenericAgent('your-github-token', config);
  const registry = agent.getToolRegistry();

  // Add web search tool
  const searchTool = new SearchWebTool('your-tavily-api-key');
  
  const searchToolDef: Tool = {
    type: 'function',
    function: {
      name: 'search_web',
      description: 'Search the web for current information',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'The search query',
          },
        },
        required: ['query'],
      },
    },
  };

  registry.registerTool(searchToolDef, {
    name: 'search_web',
    execute: async (args) => await searchTool.execute(args.query),
  });

  const response = await agent.sendMessage(
    'What are the latest news about AI?',
    []
  );

  console.log('Response:', response.message?.content);
}

// ============================================================================
// EXAMPLE 3: Domain-Specific Agent (E-commerce)
// ============================================================================

export async function ecommerceAgentExample() {
  const config: AgentConfig = {
    models: DEFAULT_MODELS,
    defaultModel: 'gpt-4o-mini',
    systemMessage: 'You are an e-commerce assistant. Help customers find products, track orders, and answer questions about our store.',
    tools: [],
  };

  const agent = new GenericAgent('your-github-token', config);
  const registry = agent.getToolRegistry();

  // Add custom e-commerce tools
  const getProductsTool: Tool = {
    type: 'function',
    function: {
      name: 'search_products',
      description: 'Search for products in the catalog',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'Product search query',
          },
          category: {
            type: 'string',
            description: 'Product category (optional)',
          },
        },
        required: ['query'],
      },
    },
  };

  registry.registerTool(getProductsTool, {
    name: 'search_products',
    execute: async (args) => {
      // Mock implementation - replace with real product search
      return [
        { id: 1, name: 'Laptop', price: 999, category: 'Electronics' },
        { id: 2, name: 'Mouse', price: 29, category: 'Electronics' },
      ];
    },
  });

  const trackOrderTool: Tool = {
    type: 'function',
    function: {
      name: 'track_order',
      description: 'Track an order by order ID',
      parameters: {
        type: 'object',
        properties: {
          order_id: {
            type: 'string',
            description: 'The order ID',
          },
        },
        required: ['order_id'],
      },
    },
  };

  registry.registerTool(trackOrderTool, {
    name: 'track_order',
    execute: async (args) => {
      // Mock implementation - replace with real order tracking
      return {
        order_id: args.order_id,
        status: 'In Transit',
        estimated_delivery: '2024-01-15',
      };
    },
  });

  const response = await agent.sendMessage(
    'Can you help me find a laptop?',
    []
  );

  console.log('Response:', response.message?.content);
}

// ============================================================================
// EXAMPLE 4: Customer Support Agent
// ============================================================================

export async function customerSupportAgentExample() {
  const config: AgentConfig = {
    models: DEFAULT_MODELS,
    defaultModel: 'gpt-4o-mini',
    systemMessage: 'You are a customer support agent. Help customers with their questions, create support tickets, and provide helpful information.',
    tools: [],
  };

  const agent = new GenericAgent('your-github-token', config);
  const registry = agent.getToolRegistry();

  // Add customer support tools
  const createTicketTool: Tool = {
    type: 'function',
    function: {
      name: 'create_support_ticket',
      description: 'Create a new support ticket',
      parameters: {
        type: 'object',
        properties: {
          subject: {
            type: 'string',
            description: 'Ticket subject',
          },
          description: {
            type: 'string',
            description: 'Detailed description of the issue',
          },
          priority: {
            type: 'string',
            enum: ['low', 'medium', 'high'],
            description: 'Ticket priority',
          },
        },
        required: ['subject', 'description'],
      },
    },
  };

  registry.registerTool(createTicketTool, {
    name: 'create_support_ticket',
    execute: async (args) => {
      // Mock implementation - replace with real ticket creation
      return {
        ticket_id: 'TICKET-12345',
        status: 'created',
        message: 'Your support ticket has been created successfully.',
      };
    },
  });

  const searchKnowledgeBaseTool: Tool = {
    type: 'function',
    function: {
      name: 'search_knowledge_base',
      description: 'Search the knowledge base for articles',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'Search query',
          },
        },
        required: ['query'],
      },
    },
  };

  registry.registerTool(searchKnowledgeBaseTool, {
    name: 'search_knowledge_base',
    execute: async (args) => {
      // Mock implementation - replace with real knowledge base search
      return [
        {
          title: 'How to reset your password',
          url: 'https://help.example.com/reset-password',
          excerpt: 'Follow these steps to reset your password...',
        },
      ];
    },
  });

  const response = await agent.sendMessage(
    'I forgot my password, can you help?',
    []
  );

  console.log('Response:', response.message?.content);
}

// ============================================================================
// EXAMPLE 5: Conversation with History
// ============================================================================

export async function conversationWithHistoryExample() {
  const config: AgentConfig = {
    models: DEFAULT_MODELS,
    defaultModel: 'gpt-4o-mini',
    systemMessage: 'You are a helpful AI assistant.',
    tools: [],
  };

  const agent = new GenericAgent('your-github-token', config);

  // First message
  const response1 = await agent.sendMessage(
    'My name is John',
    []
  );
  console.log('Assistant:', response1.message?.content);

  // Second message with history
  const history = response1.message ? [
    { role: 'user' as const, content: 'My name is John', timestamp: new Date() },
    response1.message,
  ] : [];

  const response2 = await agent.sendMessage(
    'What is my name?',
    history
  );
  console.log('Assistant:', response2.message?.content);
}
