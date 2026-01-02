# Migration Guide: From Wedding-Web Agent to GC-Agent

This guide helps you migrate from the wedding-specific agent to the generic GC-Agent, or shows you how to build a similar wedding agent using the generic framework.

## Understanding the Change

### Before (Wedding-Web Agent)
- Hardcoded wedding-specific functionality
- Tightly coupled with Supabase
- React/Next.js components included
- Fixed set of tools

### After (GC-Agent)
- Generic, extensible framework
- Database-agnostic
- Framework-independent core
- Dynamic tool system

## Migration Scenarios

### Scenario 1: You want to keep the wedding functionality

If you want to maintain wedding-specific features, you can use GC-Agent and add wedding tools:

```typescript
import { GenericAgent } from './gc-agent';

// Create agent with wedding-specific config
const agent = new GenericAgent(githubToken, {
  models: DEFAULT_MODELS,
  defaultModel: 'gpt-4o-mini',
  systemMessage: 'You are a helpful wedding planning assistant...',
  tools: [],
});

// Add wedding-specific tools
const registry = agent.getToolRegistry();

// Guest management tool
registry.registerTool(
  {
    type: 'function',
    function: {
      name: 'get_guest_statistics',
      description: 'Get statistics about wedding guests',
      parameters: {
        type: 'object',
        properties: {},
        required: [],
      },
    },
  },
  {
    name: 'get_guest_statistics',
    execute: async () => {
      // Your Supabase query here
      const { data } = await supabase.from('guests').select('*');
      // Calculate statistics
      return {
        total: data.length,
        confirmed: data.filter(g => g.attending === 'yes').length,
        // ... more stats
      };
    },
  }
);

// Event management tool
registry.registerTool(
  {
    type: 'function',
    function: {
      name: 'list_events',
      description: 'List all wedding events',
      parameters: {
        type: 'object',
        properties: {},
        required: [],
      },
    },
  },
  {
    name: 'list_events',
    execute: async () => {
      const { data } = await supabase.from('events').select('*');
      return data;
    },
  }
);
```

### Scenario 2: You want to use it for a different domain

Simply configure the agent for your new domain:

```typescript
import { GenericAgent } from './gc-agent';

// E-commerce example
const agent = new GenericAgent(githubToken, {
  models: DEFAULT_MODELS,
  defaultModel: 'gpt-4o-mini',
  systemMessage: 'You are an e-commerce assistant...',
  tools: [],
});

// Add e-commerce tools
const registry = agent.getToolRegistry();

registry.registerTool(searchProductsTool, searchProductsExecutor);
registry.registerTool(trackOrderTool, trackOrderExecutor);
// ... add more tools
```

## Step-by-Step Migration

### Step 1: Install/Copy GC-Agent

```bash
# If in the same repo
# The agent is already in gc-agent/

# If creating a new project
# Copy the gc-agent/ folder to your project
cp -r gc-agent/ /path/to/new/project/
```

### Step 2: Set Up Configuration

```typescript
// config/agent-config.ts
import { AgentConfig } from '../gc-agent/types';

export const agentConfig: AgentConfig = {
  models: [
    { id: 'gpt-4o', name: 'GPT-4o', icon: '🤖' },
    { id: 'gpt-4o-mini', name: 'GPT-4o Mini', icon: '⚡' },
  ],
  defaultModel: 'gpt-4o-mini',
  systemMessage: 'Your system message here...',
  tools: [],
};
```

### Step 3: Implement Database Adapter

```typescript
// adapters/supabase-adapter.ts
import { DatabaseClient } from '../gc-agent/services/database.service';
import { createClient } from '@supabase/supabase-js';

export class SupabaseDatabaseAdapter implements DatabaseClient {
  private supabase;

  constructor(url: string, key: string) {
    this.supabase = createClient(url, key);
  }

  async loadConversations(userId: string) {
    const { data } = await this.supabase
      .from('chat_conversations')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });
    
    return data || [];
  }

  async loadMessages(conversationId: string) {
    const { data } = await this.supabase
      .from('chat_messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });
    
    return data || [];
  }

  async createConversation(userId: string, title: string) {
    const { data } = await this.supabase
      .from('chat_conversations')
      .insert({ user_id: userId, title })
      .select()
      .single();
    
    return data?.id || null;
  }

  async saveMessage(conversationId: string, role: string, content: string) {
    const { error } = await this.supabase
      .from('chat_messages')
      .insert({ conversation_id: conversationId, role, content });
    
    return { success: !error, error };
  }

  // Implement other methods...
}
```

### Step 4: Register Your Tools

```typescript
// tools/wedding-tools.ts
import { Tool, ToolExecutor } from '../gc-agent/types';

export const guestStatisticsTool: Tool = {
  type: 'function',
  function: {
    name: 'get_guest_statistics',
    description: 'Get wedding guest statistics',
    parameters: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
};

export const guestStatisticsExecutor: ToolExecutor = {
  name: 'get_guest_statistics',
  execute: async () => {
    // Your implementation
    return { /* stats */ };
  },
};

// Export all tools
export const weddingTools = [
  { tool: guestStatisticsTool, executor: guestStatisticsExecutor },
  // ... more tools
];
```

### Step 5: Initialize Agent

```typescript
// services/chat-service.ts
import { GenericAgent } from '../gc-agent';
import { agentConfig } from '../config/agent-config';
import { SupabaseDatabaseAdapter } from '../adapters/supabase-adapter';
import { weddingTools } from '../tools/wedding-tools';

export class ChatService {
  private agent: GenericAgent;
  private dbAdapter: SupabaseDatabaseAdapter;

  constructor(githubToken: string, supabaseUrl: string, supabaseKey: string) {
    // Initialize database adapter
    this.dbAdapter = new SupabaseDatabaseAdapter(supabaseUrl, supabaseKey);
    
    // Initialize agent
    this.agent = new GenericAgent(githubToken, agentConfig);
    
    // Register tools
    const registry = this.agent.getToolRegistry();
    for (const { tool, executor } of weddingTools) {
      registry.registerTool(tool, executor);
    }
  }

  async sendMessage(message: string, conversationHistory: Message[]) {
    return await this.agent.sendMessage(message, conversationHistory);
  }

  async loadConversations(userId: string) {
    return await this.dbAdapter.loadConversations(userId);
  }

  // ... other methods
}
```

### Step 6: Update Your UI

```typescript
// In your React component
import { ChatService } from './services/chat-service';

export function ChatComponent() {
  const [chatService] = useState(() => 
    new ChatService(githubToken, supabaseUrl, supabaseKey)
  );

  const handleSendMessage = async (message: string) => {
    const response = await chatService.sendMessage(message, messages);
    
    if (response.success && response.message) {
      setMessages([...messages, response.message]);
    }
  };

  // Rest of your component...
}
```

## Common Patterns

### Pattern 1: Wrapping the Agent

```typescript
class MyDomainAgent {
  private agent: GenericAgent;

  constructor(config: MyConfig) {
    this.agent = new GenericAgent(config.token, config.agentConfig);
    this.setupTools();
  }

  private setupTools() {
    // Register all your tools
  }

  async chat(message: string, context?: any) {
    // Add custom logic before/after
    const response = await this.agent.sendMessage(message, []);
    return response;
  }
}
```

### Pattern 2: Middleware Pattern

```typescript
type Middleware = (message: string, next: Function) => Promise<any>;

class AgentWithMiddleware {
  private agent: GenericAgent;
  private middleware: Middleware[] = [];

  use(middleware: Middleware) {
    this.middleware.push(middleware);
  }

  async sendMessage(message: string) {
    let index = 0;
    const next = async () => {
      if (index < this.middleware.length) {
        const middleware = this.middleware[index++];
        return await middleware(message, next);
      }
      return await this.agent.sendMessage(message, []);
    };
    return await next();
  }
}
```

### Pattern 3: Plugin System

```typescript
interface Plugin {
  name: string;
  setup(agent: GenericAgent): void;
}

class AgentWithPlugins {
  private agent: GenericAgent;
  private plugins: Map<string, Plugin> = new Map();

  registerPlugin(plugin: Plugin) {
    plugin.setup(this.agent);
    this.plugins.set(plugin.name, plugin);
  }
}
```

## Database Schema Migration

If you're migrating from the wedding-web database, you can keep the same schema:

```sql
-- These tables can remain the same
chat_conversations
chat_messages
chat_settings
user_settings
documents
document_chunks
conversation_summaries
tavily_cache

-- You can add domain-specific tables as needed
your_domain_specific_tables
```

The GC-Agent is designed to work with any schema through the DatabaseClient interface.

## Testing Your Migration

### 1. Test Basic Chat

```typescript
const response = await agent.sendMessage('Hello', []);
console.assert(response.success, 'Basic chat failed');
```

### 2. Test Tool Execution

```typescript
const response = await agent.sendMessage(
  'Get guest statistics',
  []
);
console.assert(
  response.message?.content.includes('statistics'),
  'Tool execution failed'
);
```

### 3. Test Conversation History

```typescript
const history = [
  { role: 'user', content: 'My name is John', timestamp: new Date() },
  { role: 'assistant', content: 'Hello John!', timestamp: new Date() },
];

const response = await agent.sendMessage('What is my name?', history);
console.assert(
  response.message?.content.includes('John'),
  'Memory failed'
);
```

## Troubleshooting

### Issue: Tools not executing
**Solution**: Check that tools are registered before sending messages

### Issue: Database queries failing
**Solution**: Verify DatabaseClient implementation matches your schema

### Issue: Rate limits
**Solution**: Implement request queuing or use multiple models

### Issue: Context too large
**Solution**: Implement conversation summarization

## Performance Optimization

### 1. Lazy Load Tools
```typescript
registry.registerTool(tool, {
  name: 'heavy_tool',
  execute: async (args) => {
    const { HeavyService } = await import('./heavy-service');
    return await new HeavyService().execute(args);
  },
});
```

### 2. Cache Tool Results
```typescript
const cache = new Map();

registry.registerTool(tool, {
  name: 'cached_tool',
  execute: async (args) => {
    const key = JSON.stringify(args);
    if (cache.has(key)) return cache.get(key);
    
    const result = await expensiveOperation(args);
    cache.set(key, result);
    return result;
  },
});
```

### 3. Batch Tool Calls
```typescript
// If multiple tools can be executed together, batch them
const results = await Promise.all([
  executeTool('tool1', args1),
  executeTool('tool2', args2),
  executeTool('tool3', args3),
]);
```

## Next Steps

1. **Test thoroughly** in development
2. **Monitor performance** in production
3. **Gather user feedback** on the new system
4. **Iterate on tools** based on usage patterns
5. **Consider scaling** strategy for high traffic

## Getting Help

- Review `README.md` for full documentation
- Check `examples.ts` for code samples
- Read `ARCHITECTURE.md` for system design
- See `COMPARISON.md` for feature differences

## Conclusion

The migration to GC-Agent gives you:
- ✅ More flexibility
- ✅ Better testability
- ✅ Easier maintenance
- ✅ Reusability across projects
- ✅ Independence from specific frameworks

The investment in migration pays off through increased code quality and reduced coupling.
