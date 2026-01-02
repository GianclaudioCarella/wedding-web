# Comparison: Wedding-Web Agent vs GC-Agent

## Overview

The **GC-Agent** is a generic, decoupled version of the chat agent originally built for the wedding-web application. This document highlights the key differences and explains how the agent was made domain-agnostic.

## Key Differences

### 1. **Domain-Specific Tools → Generic Tool System**

**Before (Wedding-Web):**
```typescript
// Hardcoded wedding-specific tools
const TOOLS = [
  { name: 'get_guest_statistics', ... },
  { name: 'list_guests', ... },
  { name: 'list_events', ... },
  { name: 'search_web', ... },
];
```

**After (GC-Agent):**
```typescript
// Generic tool registry - users can add their own tools
const registry = new ToolRegistry();
registry.registerTool(customTool, customExecutor);
```

### 2. **Hardcoded Database → Database Interface**

**Before (Wedding-Web):**
```typescript
// Directly using Supabase
import { supabase } from '@/lib/supabase';

const { data } = await supabase
  .from('guests')
  .select('*');
```

**After (GC-Agent):**
```typescript
// Database-agnostic interface
interface DatabaseClient {
  loadConversations(userId: string): Promise<any[]>;
  loadMessages(conversationId: string): Promise<any[]>;
  // ... other methods
}
```

### 3. **Wedding-Specific System Message → Configurable Message**

**Before (Wedding-Web):**
```typescript
systemMessage = 'You are a helpful AI assistant for wedding planning. 
You have access to tools to query the wedding database...'
```

**After (GC-Agent):**
```typescript
// User can set any system message
const config: AgentConfig = {
  systemMessage: 'You are a helpful assistant for [YOUR DOMAIN]',
  // ... other config
};
```

### 4. **Monolithic Component → Modular Architecture**

**Before (Wedding-Web):**
- Everything in one large React component (1600+ lines)
- UI, logic, and tools all mixed together
- Tightly coupled with Next.js and Supabase

**After (GC-Agent):**
- Separated into modules: agent, services, tools, types
- Core logic independent of UI framework
- Can be used in any JavaScript/TypeScript project

### 5. **Fixed Tools → Extensible Tool Registry**

**Before (Wedding-Web):**
```typescript
// Fixed set of tools
const executeTool = async (toolName: string, args: any) => {
  switch (toolName) {
    case 'get_guest_statistics':
      return await guestTools.getGuestStatistics();
    case 'list_guests':
      return await guestTools.listGuests(args.filter);
    // ...
  }
};
```

**After (GC-Agent):**
```typescript
// Dynamic tool execution
await toolRegistry.executeTool(toolName, args);
```

## File Structure Comparison

### Wedding-Web Agent Structure
```
app/admin/chat/
├── page.tsx                    (1600+ lines - UI + Logic)
├── types.ts
├── constants.ts
├── services/
│   ├── cache.service.ts
│   ├── supabase.service.ts
│   └── user-settings.service.ts
├── tools/
│   ├── guest.tools.ts         (Wedding-specific)
│   ├── event.tools.ts         (Wedding-specific)
│   └── search-web.tool.ts
└── components/
    └── DocumentUpload.tsx
```

### GC-Agent Structure
```
gc-agent/
├── agent.ts                    (Core logic - framework agnostic)
├── constants.ts                (Generic defaults)
├── package.json
├── README.md
├── examples.ts
├── types/
│   └── index.ts               (Generic types)
├── services/
│   ├── cache.service.ts       (Unchanged - generic)
│   └── database.service.ts    (Generic interface)
└── tools/
    ├── search-web.tool.ts     (Generic web search)
    └── tool-registry.ts       (NEW - tool management)
```

## What Was Removed

❌ **Wedding-specific tools:**
- `guest.tools.ts` - Guest management
- `event.tools.ts` - Event management

❌ **UI Components:**
- React/Next.js chat interface
- Document upload component
- Memory modals

❌ **Supabase Dependencies:**
- Direct Supabase imports
- Hardcoded table names
- Supabase-specific queries

❌ **Wedding-specific prompts:**
- Guest management suggestions
- Event planning prompts
- RSVP status queries

## What Was Added

✅ **Tool Registry System:**
- Dynamic tool registration
- Tool management (add, remove, list)
- Type-safe tool execution

✅ **Database Interface:**
- Generic database client interface
- Adapter pattern for any database
- No hardcoded queries

✅ **Configuration System:**
- Configurable models
- Configurable system messages
- Configurable tools

✅ **Examples:**
- E-commerce agent example
- Customer support agent example
- Basic chat examples

✅ **Documentation:**
- Comprehensive README
- Usage examples
- Architecture explanation

## Migration Path

To migrate from the wedding-web agent to a custom domain agent:

1. **Implement DatabaseClient interface** for your database
2. **Define your domain tools** using the Tool interface
3. **Register your tools** with the ToolRegistry
4. **Configure the agent** with your system message and models
5. **Build your UI** (or use headless)

## Use Cases

The generic agent can now be used for:

- 🛒 **E-commerce**: Product search, order tracking, customer support
- 🏥 **Healthcare**: Appointment scheduling, patient records, medical info
- 📚 **Education**: Course management, student queries, grading
- 💼 **Business**: CRM, analytics, reporting, task management
- 🏠 **Real Estate**: Property search, viewing schedules, documents
- 💰 **Finance**: Account info, transactions, budgeting
- 🎮 **Gaming**: Player stats, game info, community management
- 📱 **SaaS**: User onboarding, feature support, bug tracking

## Benefits of Decoupling

1. **Reusability**: Use the same agent core for multiple projects
2. **Maintainability**: Easier to update and test individual components
3. **Flexibility**: Swap out databases, add/remove tools dynamically
4. **Portability**: Not tied to any specific framework or platform
5. **Testability**: Pure functions easier to test in isolation
6. **Scalability**: Can be deployed as a microservice

## Technical Improvements

- **Separation of Concerns**: UI, logic, and data access are separated
- **Dependency Injection**: Services are injected, not imported
- **Interface-based Design**: Depends on abstractions, not concretions
- **Type Safety**: Strong TypeScript typing throughout
- **Modularity**: Each module has a single responsibility

## Conclusion

The GC-Agent is a production-ready, generic chat agent that can be customized for any domain. It maintains all the core capabilities of the original wedding-web agent while removing domain-specific constraints and adding extensibility features.
