# GC-Agent Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         Your Application                         │
│  (React, Vue, CLI, API Server, or any JavaScript/TypeScript app)│
└────────────────────────────┬────────────────────────────────────┘
                             │
                             │ imports
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                          GC-Agent Core                           │
│                                                                   │
│  ┌──────────────┐     ┌──────────────┐     ┌──────────────┐    │
│  │ GenericAgent │────▶│ ToolRegistry │────▶│    Tools     │    │
│  │              │     │              │     │              │    │
│  │ - Config     │     │ - Register   │     │ - search_web │    │
│  │ - Models     │     │ - Execute    │     │ - custom...  │    │
│  │ - Messages   │     │ - Manage     │     │              │    │
│  └──────────────┘     └──────────────┘     └──────────────┘    │
│         │                                                         │
│         │ uses                                                   │
│         ▼                                                         │
│  ┌──────────────────────────────────────────────────────┐       │
│  │                    Services                          │       │
│  │                                                      │       │
│  │  ┌──────────────┐         ┌──────────────┐         │       │
│  │  │    Cache     │         │   Database   │         │       │
│  │  │   Service    │         │   Interface  │         │       │
│  │  └──────────────┘         └──────────────┘         │       │
│  └──────────────────────────────────────────────────────┘       │
└───────────────────────────┬──────────────────────────────────────┘
                            │
                            │ API calls
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                      External Services                           │
│                                                                   │
│  ┌──────────────┐     ┌──────────────┐     ┌──────────────┐    │
│  │ GitHub Models│     │  Tavily API  │     │ Your Database│    │
│  │  (GPT-4o)   │     │ (Web Search) │     │ (Supabase,   │    │
│  │              │     │              │     │  Postgres...) │    │
│  └──────────────┘     └──────────────┘     └──────────────┘    │
└─────────────────────────────────────────────────────────────────┘
```

## Data Flow

### 1. Simple Message Flow
```
User Input
    │
    ▼
[Your App] ──────────────────────────┐
    │                                 │
    │ sendMessage()                   │
    ▼                                 │
[GenericAgent]                        │
    │                                 │
    │ builds conversation             │
    ▼                                 │
[GitHub Models API]                   │
    │                                 │
    │ returns response                │
    ▼                                 │
[GenericAgent] ───────────────────────┘
    │
    │ returns AgentResponse
    ▼
[Your App]
    │
    ▼
Display to User
```

### 2. Message Flow with Tools
```
User Input
    │
    ▼
[Your App]
    │
    │ sendMessage()
    ▼
[GenericAgent]
    │
    │ builds conversation
    ▼
[GitHub Models API]
    │
    │ returns: needs tool
    ▼
[GenericAgent]
    │
    │ executeTool()
    ▼
[ToolRegistry] ──▶ [Specific Tool] ──▶ [External API/DB]
    │                                        │
    │◀───────────────────────────────────────┘
    │ tool result
    ▼
[GenericAgent]
    │
    │ sends tool result back
    ▼
[GitHub Models API]
    │
    │ final response
    ▼
[GenericAgent]
    │
    │ returns AgentResponse
    ▼
[Your App]
    │
    ▼
Display to User
```

## Component Responsibilities

### GenericAgent
- Manages AI model communication
- Handles conversation context
- Orchestrates tool execution
- Error handling

### ToolRegistry
- Registers custom tools
- Maintains tool definitions
- Routes tool calls to executors
- Validates tool execution

### Services
- **Cache Service**: Query normalization and hashing
- **Database Service**: Interface for data persistence

### Tools
- **SearchWebTool**: Web search with caching
- **Custom Tools**: User-defined functionality

## Extensibility Points

```
┌─────────────────────────────────────────┐
│         Extension Points                 │
├─────────────────────────────────────────┤
│                                          │
│  1. Custom Tools                         │
│     └─▶ Add domain-specific tools       │
│                                          │
│  2. Database Backend                     │
│     └─▶ Implement DatabaseClient        │
│                                          │
│  3. Cache Backend                        │
│     └─▶ Implement CacheBackend          │
│                                          │
│  4. System Message                       │
│     └─▶ Configure for your domain       │
│                                          │
│  5. Models                               │
│     └─▶ Add/remove available models     │
│                                          │
└─────────────────────────────────────────┘
```

## Integration Patterns

### Pattern 1: Direct Integration
```typescript
import { GenericAgent } from 'gc-agent';

const agent = new GenericAgent(token, config);
const response = await agent.sendMessage(input, history);
```

### Pattern 2: Service Wrapper
```typescript
class ChatService {
  private agent: GenericAgent;
  
  constructor() {
    this.agent = new GenericAgent(token, config);
    this.setupTools();
  }
  
  async chat(message: string) {
    return await this.agent.sendMessage(message, this.history);
  }
}
```

### Pattern 3: Microservice
```typescript
// Express API
app.post('/api/chat', async (req, res) => {
  const { message, userId } = req.body;
  const response = await agent.sendMessage(message, []);
  res.json(response);
});
```

## Security Considerations

```
┌─────────────────────────────────────────┐
│          Security Layers                 │
├─────────────────────────────────────────┤
│                                          │
│  1. API Keys (GitHub, Tavily)           │
│     └─▶ Store securely (env vars)       │
│                                          │
│  2. User Authentication                  │
│     └─▶ Your app's responsibility       │
│                                          │
│  3. Rate Limiting                        │
│     └─▶ GitHub: 50 req/day/model        │
│                                          │
│  4. Input Validation                     │
│     └─▶ Sanitize user inputs            │
│                                          │
│  5. Tool Permissions                     │
│     └─▶ Control what tools can access   │
│                                          │
└─────────────────────────────────────────┘
```

## Deployment Options

### Option 1: Embedded (Frontend)
```
Browser ──▶ [Your React App + GC-Agent] ──▶ [APIs]
```
**Pros**: Simple, no backend needed
**Cons**: Exposes API keys (use backend proxy)

### Option 2: Backend API
```
Browser ──▶ [Your API] ──▶ [GC-Agent] ──▶ [APIs]
```
**Pros**: Secure, scalable
**Cons**: Requires backend infrastructure

### Option 3: Serverless
```
Browser ──▶ [Lambda/Vercel] ──▶ [GC-Agent] ──▶ [APIs]
```
**Pros**: Auto-scaling, cost-effective
**Cons**: Cold starts

## Example Use Case: E-commerce

```
┌────────────────────────────────────────────────────────┐
│                  E-commerce Chat Bot                    │
├────────────────────────────────────────────────────────┤
│                                                         │
│  User: "I need a laptop under $1000"                   │
│    │                                                    │
│    ▼                                                    │
│  [GenericAgent]                                        │
│    │                                                    │
│    ├─▶ Tool: search_products({query: "laptop"})       │
│    │   └─▶ Returns: [Laptop A, Laptop B, Laptop C]    │
│    │                                                    │
│    ├─▶ Tool: filter_by_price({max: 1000})             │
│    │   └─▶ Returns: [Laptop A, Laptop B]              │
│    │                                                    │
│    ▼                                                    │
│  Assistant: "I found 2 laptops..."                     │
│                                                         │
└────────────────────────────────────────────────────────┘
```

## Performance Characteristics

- **Latency**: 1-5 seconds (depends on model and tools)
- **Throughput**: Limited by API rate limits
- **Memory**: ~10-50 MB (depends on conversation history)
- **Network**: ~1-10 KB per message (varies with tool usage)

## Monitoring & Observability

Key metrics to track:
- Message latency
- Tool execution time
- API error rates
- Cache hit rates
- Token usage
- User satisfaction

## Future Enhancements

Potential additions:
- Streaming responses
- Multi-modal support (images, audio)
- Function calling improvements
- Built-in RAG support
- Conversation summarization
- A/B testing framework
