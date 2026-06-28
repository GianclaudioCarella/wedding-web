# Cross-Conversation Memory System

Enables the AI assistant to remember information across chat sessions by automatically generating and retrieving summaries of past conversations.

## How It Works

When the user switches conversations or creates a new one, the system generates a summary of the previous conversation using GPT-4o and stores it in Supabase. On the next conversation, the top recent summaries are loaded into the AI's system prompt automatically.

```
Conversation A (10 messages)
    ↓ user switches to new conversation
System generates summary:
  "Discussed wedding date (June 15, 2024) and selected Grand Hotel
   as venue. Guest count: 150 people."
  importance_score=8, topics=["date", "venue"]
    ↓ stored in conversation_summaries table
Conversation B starts
  → top summaries injected into AI context
  → AI can reference past decisions without re-asking
```

## Features

- **Automatic summaries**: triggered when switching/creating conversations (min 4 messages)
- **Importance scoring**: AI rates each conversation 1–10; low-importance summaries are excluded from context
- **Topic extraction**: key topics stored as tags for each summary
- **Memory UI**: view, browse, and delete summaries from the "Memories" sidebar button
- **Context injection**: top 3–5 summaries included in every new conversation's system prompt

## Database Schema

**conversation_summaries:**
```sql
id               UUID (primary key)
conversation_id  UUID (references chat_conversations)
user_id          UUID
summary          TEXT
key_topics       TEXT[]
importance_score INTEGER (1–10)
message_count    INTEGER
created_at       TIMESTAMP
```

## Setup

Run `database/create_memory_tables.sql` in Supabase SQL Editor, then verify:

```sql
SELECT tablename FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename = 'conversation_summaries';
```

## Configuration

**Minimum messages to trigger summary** (`ConversationMemoryService`):
```typescript
return (count || 0) >= 4; // change to 6, 8, etc.
```

**Number of summaries and importance threshold** (in `page.tsx`, `handleSendMessage`):
```typescript
const summaries = await memoryService.getRecentSummaries(
  userId,
  3,  // how many to retrieve
  4   // minimum importance score
);
```

## Developer API

```typescript
import { ConversationMemoryService } from '@/lib/services/conversation-memory.service';

const memoryService = new ConversationMemoryService(supabase, githubToken);

// Generate summary for a conversation
const summary = await memoryService.generateConversationSummary(conversationId, userId);

// Retrieve recent summaries
const summaries = await memoryService.getRecentSummaries(userId, 5, 4);

// Format for AI context
const context = memoryService.formatMemoryContext(summaries);

// Check if conversation is eligible for summarization
const shouldSummarize = await memoryService.shouldSummarizeConversation(conversationId);

// Delete a summary
await memoryService.deleteSummary(summaryId);

// Get statistics
const stats = await memoryService.getSummaryStats(userId);
```

## Context Format

Summaries are injected at the start of the AI system prompt:

```
PREVIOUS CONVERSATION MEMORIES:
Use this context to maintain continuity and avoid asking for information already discussed.

1. (Dec 28 [Topics: wedding date, venue]): Discussed wedding date (June 15, 2024) 
   and selected Grand Hotel as venue. Guest count: 150 people.

2. (Dec 27 [Topics: catering, menu]): Decided on Italian cuisine with vegetarian alternatives.
```

## Security

- RLS policies: users only see their own memories
- Cascade delete when the source conversation is deleted
- No cross-user sharing

## Troubleshooting

**Summaries not being created**
- Conversation must have at least 4 messages
- Verify GitHub token is valid
- Check that `conversation_summaries` table exists

**AI not using memories**
- Check that summaries exist (open Memories modal)
- Importance scores must be >= 4 (default threshold)
- Check browser console for context loading errors

**"Failed to generate summary" error**
- Check GitHub Models API status
- Verify token has the correct permissions

## Limitations

- Retrieval is by recency/importance — no semantic search on summaries yet
- Long conversations are not summarized until the user switches away
- Too many summaries can approach the model's context limit (currently capped at 3–5)
