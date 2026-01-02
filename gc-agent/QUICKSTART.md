# GC-Agent Quick Start Guide

Get up and running with the Generic Chat Agent in 5 minutes!

## Step 1: Get API Keys

### GitHub Token (Required)
1. Go to [github.com/settings/tokens](https://github.com/settings/tokens)
2. Click "Generate new token" → "Generate new token (classic)"
3. Give it a name like "GC-Agent"
4. Select the `"models"` scope
5. Click "Generate token" and copy it

### Tavily API Key (Optional - for web search)
1. Go to [tavily.com](https://tavily.com)
2. Sign up for a free account
3. Copy your API key from the dashboard

## Step 2: Basic Implementation

Create a new file `my-agent.ts`:

```typescript
import { GenericAgent } from './gc-agent';
import { DEFAULT_MODELS, DEFAULT_SYSTEM_MESSAGE } from './gc-agent/constants';

// Replace with your actual token
const GITHUB_TOKEN = 'ghp_your_token_here';

// Create the agent
const agent = new GenericAgent(
  GITHUB_TOKEN,
  {
    models: DEFAULT_MODELS,
    defaultModel: 'gpt-4o-mini',
    systemMessage: DEFAULT_SYSTEM_MESSAGE,
    tools: [],
  }
);

// Send a message
async function chat() {
  const response = await agent.sendMessage(
    'Hello! Tell me a joke.',
    [] // empty conversation history
  );

  if (response.success && response.message) {
    console.log('🤖 Assistant:', response.message.content);
  } else {
    console.error('❌ Error:', response.error);
  }
}

chat();
```

## Step 3: Add Web Search (Optional)

```typescript
import { SearchWebTool } from './gc-agent/tools/search-web.tool';

const TAVILY_API_KEY = 'tvly_your_key_here';

// Create search tool
const searchTool = new SearchWebTool(TAVILY_API_KEY);

// Register it
const registry = agent.getToolRegistry();
registry.registerTool(
  {
    type: 'function',
    function: {
      name: 'search_web',
      description: 'Search the web for current information',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Search query' },
        },
        required: ['query'],
      },
    },
  },
  {
    name: 'search_web',
    execute: async (args) => await searchTool.execute(args.query),
  }
);

// Now the agent can search the web!
const response = await agent.sendMessage(
  'What are the latest tech news?',
  []
);
```

## Step 4: Maintain Conversation History

```typescript
const messages: Message[] = [];

async function conversationalChat(userInput: string) {
  // Send message with history
  const response = await agent.sendMessage(userInput, messages);

  if (response.success && response.message) {
    // Add user message to history
    messages.push({
      role: 'user',
      content: userInput,
      timestamp: new Date(),
    });

    // Add assistant response to history
    messages.push(response.message);

    console.log('🤖 Assistant:', response.message.content);
  }
}

// Now you can have a conversation!
await conversationalChat('My name is Alice');
await conversationalChat('What is my name?'); // Agent will remember!
```

## Step 5: Customize for Your Domain

### Example: E-commerce Agent

```typescript
// Set domain-specific system message
agent.updateConfig({
  systemMessage: 'You are an e-commerce assistant helping customers shop.',
});

// Add domain-specific tool
const registry = agent.getToolRegistry();

registry.registerTool(
  {
    type: 'function',
    function: {
      name: 'search_products',
      description: 'Search for products',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Product search query' },
        },
        required: ['query'],
      },
    },
  },
  {
    name: 'search_products',
    execute: async (args) => {
      // Your product search implementation
      return [
        { id: 1, name: 'Laptop', price: 999 },
        { id: 2, name: 'Mouse', price: 29 },
      ];
    },
  }
);

// Now ask about products!
const response = await agent.sendMessage(
  'I need a laptop under $1000',
  []
);
```

## Common Use Cases

### Customer Support Bot
```typescript
agent.updateConfig({
  systemMessage: 'You are a helpful customer support agent.',
});

registry.registerTool(ticketTool, ticketExecutor);
registry.registerTool(knowledgeBaseTool, kbExecutor);
```

### Educational Assistant
```typescript
agent.updateConfig({
  systemMessage: 'You are a patient teacher helping students learn.',
});

registry.registerTool(quizTool, quizExecutor);
registry.registerTool(resourceTool, resourceExecutor);
```

### Personal Assistant
```typescript
agent.updateConfig({
  systemMessage: 'You are a personal assistant managing tasks and schedules.',
});

registry.registerTool(calendarTool, calendarExecutor);
registry.registerTool(reminderTool, reminderExecutor);
```

## Troubleshooting

### "API Error: 401"
- Check that your GitHub token is valid
- Ensure it has the "models" scope

### "Tool not found"
- Make sure you registered the tool before using it
- Tool name in registration must match tool name in definition

### "Rate limit exceeded"
- Free tier: 50 requests/day per model
- Try switching to a different model
- Wait for the rate limit to reset

## Next Steps

1. **Read the full README**: `gc-agent/README.md`
2. **Check examples**: `gc-agent/examples.ts`
3. **Compare with original**: `gc-agent/COMPARISON.md`
4. **Build a UI**: Create a React/Vue/Svelte interface
5. **Add database**: Implement DatabaseClient for persistence
6. **Add caching**: Implement CacheBackend for web search

## Need Help?

- Check the examples in `examples.ts`
- Read the comparison in `COMPARISON.md`
- Review the full documentation in `README.md`

---

**Happy building! 🚀**
