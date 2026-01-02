# GC-Agent - Generic Chat Agent

A flexible, domain-agnostic AI chat agent that can be customized for any use case. This agent is decoupled from specific business logic and can be integrated into any application.

## Features

- 🤖 **AI Model Integration**: Works with GitHub Models API (GPT-4o, GPT-4o Mini)
- 🔧 **Extensible Tool System**: Register custom tools for domain-specific functionality
- 💾 **Database Agnostic**: Works with any database through a simple interface
- 🌐 **Web Search**: Built-in web search capability via Tavily API
- 📝 **Conversation Management**: Save and retrieve conversation history
- 🎯 **Configurable**: Easy to customize for different use cases
- 🔒 **Secure**: API keys managed through user settings

## Architecture

```
gc-agent/
├── agent.ts                    # Core agent logic
├── constants.ts                # Default configuration
├── types/
│   └── index.ts               # TypeScript interfaces
├── services/
│   ├── cache.service.ts       # Query caching utilities
│   └── database.service.ts    # Database interface
└── tools/
    ├── search-web.tool.ts     # Web search tool
    └── tool-registry.ts       # Tool management system
```

## Quick Start

### 1. Basic Setup

```typescript
import { GenericAgent } from './gc-agent/agent';
import { DEFAULT_MODELS, DEFAULT_SYSTEM_MESSAGE, DEFAULT_TOOLS } from './gc-agent/constants';
import { AgentConfig } from './gc-agent/types';

// Configure the agent
const config: AgentConfig = {
  models: DEFAULT_MODELS,
  defaultModel: 'gpt-4o-mini',
  systemMessage: DEFAULT_SYSTEM_MESSAGE,
  tools: DEFAULT_TOOLS,
};

// Create agent instance
const agent = new GenericAgent(
  'your-github-token',
  config
);
```

### 2. Send Messages

```typescript
const response = await agent.sendMessage(
  'Hello, how are you?',
  [],  // conversation history
  'gpt-4o-mini'  // optional model override
);

if (response.success) {
  console.log('Assistant:', response.message?.content);
} else {
  console.error('Error:', response.error);
}
```

### 3. Add Custom Tools

```typescript
import { ToolRegistry } from './gc-agent/tools/tool-registry';

const registry = agent.getToolRegistry();

// Define your custom tool
const customTool = {
  type: 'function' as const,
  function: {
    name: 'get_weather',
    description: 'Get current weather for a location',
    parameters: {
      type: 'object',
      properties: {
        location: {
          type: 'string',
          description: 'City name',
        },
      },
      required: ['location'],
    },
  },
};

// Define the executor
const customExecutor = {
  name: 'get_weather',
  execute: async (args: { location: string }) => {
    // Your implementation here
    return { temperature: 72, conditions: 'Sunny' };
  },
};

// Register the tool
registry.registerTool(customTool, customExecutor);
```

### 4. Implement Database Backend

Implement the `DatabaseClient` interface for your database:

```typescript
import { DatabaseClient } from './gc-agent/services/database.service';

class MyDatabaseClient implements DatabaseClient {
  async loadConversations(userId: string) {
    // Your implementation
    return [];
  }

  async loadMessages(conversationId: string) {
    // Your implementation
    return [];
  }

  async createConversation(userId: string, title: string) {
    // Your implementation
    return 'conversation-id';
  }

  async deleteConversation(conversationId: string) {
    // Your implementation
    return { success: true };
  }

  async saveMessage(conversationId: string, role: string, content: string) {
    // Your implementation
    return { success: true };
  }

  async loadSystemMessage() {
    // Your implementation
    return 'Your system message';
  }

  async saveSystemMessage(userId: string, systemMessage: string) {
    // Your implementation
    return { success: true };
  }

  async loadUserSettings(userId: string) {
    // Your implementation
    return null;
  }

  async saveUserSettings(userId: string, githubToken?: string, tavilyApiKey?: string) {
    // Your implementation
    return { success: true };
  }
}
```

### 5. Add Web Search (Optional)

```typescript
import { SearchWebTool } from './gc-agent/tools/search-web.tool';

const searchTool = new SearchWebTool('your-tavily-api-key');

const searchToolDef = {
  type: 'function' as const,
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

const searchExecutor = {
  name: 'search_web',
  execute: async (args: { query: string }) => {
    return await searchTool.execute(args.query);
  },
};

registry.registerTool(searchToolDef, searchExecutor);
```

## Configuration

### System Message

Customize the agent's behavior by setting a system message:

```typescript
agent.updateConfig({
  systemMessage: 'You are a helpful coding assistant specialized in Python.',
});
```

### Models

Configure available models:

```typescript
const config: AgentConfig = {
  models: [
    { id: 'gpt-4o', name: 'GPT-4o', icon: '🤖', description: 'Most capable' },
    { id: 'gpt-4o-mini', name: 'GPT-4o Mini', icon: '⚡', description: 'Fast and efficient' },
  ],
  defaultModel: 'gpt-4o-mini',
  systemMessage: 'You are a helpful assistant.',
  tools: [],
};
```

## Use Cases

This generic agent can be adapted for various domains:

- **Customer Support**: Add tools for ticket management, knowledge base search
- **E-commerce**: Add tools for product search, order tracking, inventory
- **Healthcare**: Add tools for appointment scheduling, medical records
- **Education**: Add tools for course management, grading, resources
- **Finance**: Add tools for account info, transactions, reports
- **Real Estate**: Add tools for property search, scheduling viewings
- **HR**: Add tools for employee records, leave management, hiring

## Key Differences from Original

The original agent was specific to wedding planning with:
- Guest management tools
- Event management tools
- Wedding-specific system prompts
- Hardcoded Supabase integration

This generic agent:
- ✅ Has no domain-specific tools by default
- ✅ Uses a pluggable tool system
- ✅ Works with any database through an interface
- ✅ Provides only generic web search by default
- ✅ Can be customized for any domain

## API Keys Required

1. **GitHub Token**: Get from [github.com/settings/tokens](https://github.com/settings/tokens) with "models" scope
2. **Tavily API Key** (Optional): Get from [tavily.com](https://tavily.com) for web search

## License

ISC

## Contributing

This is a generic framework. Feel free to extend it for your specific use case by:
1. Adding custom tools via the ToolRegistry
2. Implementing the DatabaseClient interface for your database
3. Customizing the system message and models
4. Building a UI on top of the agent
