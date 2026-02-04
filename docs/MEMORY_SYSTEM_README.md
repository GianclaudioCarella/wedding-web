# Cross-Conversation Memory System

This system enables the AI to remember information across multiple chat sessions by automatically creating and utilizing summaries of past conversations.

## 🧠 How It Works

```
┌─────────────────────────────────────────────────────────────┐
│  User has Conversation A (10 messages)                      │
│  Topics: Wedding date, Venue selection                      │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼ User switches to new conversation
┌─────────────────────────────────────────────────────────────┐
│  System automatically generates summary:                     │
│  "Discussed wedding date (June 15, 2024) and selected       │
│   Grand Hotel as venue. Guest count: 150 people."           │
│                                                              │
│  Stored with: importance_score=8, topics=[date, venue]      │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼ User starts Conversation B
┌─────────────────────────────────────────────────────────────┐
│  System loads summaries from recent conversations           │
│  Includes them in AI context automatically                  │
│                                                              │
│  User: "What was our venue again?"                          │
│  AI: "Based on our previous conversation, you selected      │
│       the Grand Hotel as your wedding venue."               │
└─────────────────────────────────────────────────────────────┘
```

## ✨ Features

### 1. **Automatic Summary Generation**
- Triggers when switching conversations or creating a new one
- Requires minimum 4 messages (2 exchanges)
- Uses AI (GPT-4o) to extract key information
- Runs in background (non-blocking)

### 2. **Smart Context Retrieval**
- Fetches top 3-5 most recent/important summaries
- Filters by importance score (threshold: 4/10)
- Includes in system message automatically
- No manual intervention needed

### 3. **Importance Scoring**
- AI rates each conversation 1-10
- Higher scores = more likely to be remembered
- Affects which memories are retrieved
- User can see scores in UI

### 4. **Topic Extraction**
- AI identifies key topics per conversation
- Stored as searchable tags
- Displayed in memory UI
- Future: Enable semantic search

### 5. **Memory Management UI**
- View all conversation summaries
- See statistics (total conversations, messages, avg importance)
- Delete individual memories
- Understand what AI remembers

## 📁 Architecture

### Database Schema

**conversation_summaries table:**
```sql
- id: UUID (primary key)
- conversation_id: UUID (references chat_conversations)
- user_id: UUID
- summary: TEXT (AI-generated summary)
- key_topics: TEXT[] (array of topics)
- importance_score: INTEGER (1-10)
- message_count: INTEGER
- created_at: TIMESTAMP
```

### Service Layer

**ConversationMemoryService** handles:
- `generateConversationSummary()` - Creates AI summary
- `getRecentSummaries()` - Retrieves top memories
- `formatMemoryContext()` - Formats for AI prompt
- `shouldSummarizeConversation()` - Checks eligibility
- `deleteSummary()` - Removes memory
- `getSummaryStats()` - Gets statistics

## 🚀 Setup

### 1. Create Database Tables

Run in Supabase SQL Editor:
```sql
-- File: database/create_memory_tables.sql
```

This creates:
- `conversation_summaries` table
- Indexes for fast queries
- RLS policies for user isolation

### 2. Verify Setup

Check table creation:
```sql
SELECT tablename FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename = 'conversation_summaries';
```

Check indexes:
```sql
SELECT indexname FROM pg_indexes 
WHERE tablename = 'conversation_summaries';
```

## 💡 Usage

### For Users

**No action needed!** The system works automatically:

1. **Have a conversation** (at least 4 messages)
2. **Switch to a new conversation** or create a new one
3. **System generates summary** in the background
4. **Next conversations automatically include** past context

**To view memories:**
1. Click "Memories" button in sidebar
2. See all conversation summaries
3. View importance scores and topics
4. Delete memories if desired

### For Developers

**Generating a summary manually:**
```typescript
import { ConversationMemoryService } from '@/lib/services/conversation-memory.service';

const memoryService = new ConversationMemoryService(supabase, githubToken);

// Generate summary for a conversation
const summary = await memoryService.generateConversationSummary(
  conversationId,
  userId
);

console.log(summary);
// {
//   id: "uuid",
//   summary: "User discussed...",
//   key_topics: ["wedding", "venue"],
//   importance_score: 7,
//   message_count: 8
// }
```

**Retrieving memories:**
```typescript
// Get recent memories
const memories = await memoryService.getRecentSummaries(
  userId,
  5,  // limit: top 5
  4   // minImportance: at least 4/10
);

// Format for AI context
const context = memoryService.formatMemoryContext(memories);
```

**Checking if conversation should be summarized:**
```typescript
const shouldSummarize = await memoryService.shouldSummarizeConversation(
  conversationId
);

if (shouldSummarize) {
  await memoryService.generateConversationSummary(conversationId, userId);
}
```

## 🎯 When Summaries Are Created

Summaries are automatically generated when:

1. **User switches conversations** (clicks different chat in sidebar)
   - Current conversation has ≥4 messages
   - No existing summary for that conversation

2. **User creates new conversation** (clicks "New Chat")
   - Previous conversation has ≥4 messages
   - No existing summary for that conversation

**Why 4 messages minimum?**
- Ensures meaningful exchange (user + assistant + user + assistant)
- Avoids summaries of incomplete thoughts
- Reduces unnecessary API calls

## 📊 Memory Context Format

When included in AI prompt:
```
PREVIOUS CONVERSATION MEMORIES:
The following are summaries of recent conversations with this user. 
Use this context to maintain continuity and avoid asking for information 
already discussed.

1. (Dec 28 [Topics: wedding date, venue]): Discussed wedding date (June 
   15, 2024) and selected Grand Hotel as venue. Guest count: 150 people.

2. (Dec 27 [Topics: catering, menu]): Reviewed catering options and 
   decided on Italian cuisine with vegetarian alternatives.

3. (Dec 25 [Topics: invitations]): Finalized invitation design with 
   royal blue theme. Sending invites January 15th.

---
```

## ⚙️ Configuration

### Summary Generation Prompt

Customize in `ConversationMemoryService`:
```typescript
const summaryPrompt = `You are analyzing a conversation to create a 
concise memory summary. Extract the most important information...`;
```

### Importance Threshold

Change minimum importance for retrieval:
```typescript
// In page.tsx, handleSendMessage function
const summaries = await memoryService.getRecentSummaries(
  userId,
  3,  // limit: how many to retrieve
  4   // minImportance: minimum score (change this)
);
```

### Message Count Threshold

Change minimum messages for summary:
```typescript
// In ConversationMemoryService
return (count || 0) >= 4;  // Change to 6, 8, etc.
```

## 🔍 How AI Uses Memories

The AI receives memories in the system message:
1. Memories appear at the start of system context
2. AI can reference them in responses
3. Avoids asking for previously discussed information
4. Maintains conversation continuity

**Example:**
```
User: "What venue did we pick?"
AI (with memory): "You selected the Grand Hotel."

User: "What venue did we pick?"
AI (without memory): "I don't have information about venue 
selection. Could you tell me what you're looking for?"
```

## 📈 Memory Statistics

View in "Memories" modal:
- **Total Conversations**: Number with summaries
- **Total Messages**: Sum across all summarized conversations
- **Average Importance**: Mean importance score

## 🗑️ Memory Management

**Deleting memories:**
- Click trash icon in Memories modal
- Permanently removes summary
- Does not delete actual conversation
- Cannot be undone

**When to delete:**
- Incorrect or outdated information
- Sensitive data you don't want remembered
- Test conversations
- Low importance conversations

## 🚧 Limitations

1. **Token Limits**: Too many memories can exceed context window
   - Current: Limited to 3-5 recent summaries
   - Solution: Increase model context or implement memory consolidation

2. **Summary Quality**: Depends on AI understanding
   - Can miss nuances
   - May emphasize wrong details
   - Solution: Review and delete poor summaries

3. **No Semantic Search**: Currently retrieves by date/importance
   - Can't search by topic yet
   - Solution: Implement vector embeddings for summaries

4. **Manual Trigger Only on Switch**: No periodic summarization
   - Long conversations not summarized until switch
   - Solution: Implement message count threshold trigger

## 🔮 Future Enhancements

1. **Vector Search on Summaries**
   - Generate embeddings for each summary
   - Semantic search based on current query
   - Retrieve most relevant memories (not just recent)

2. **Memory Consolidation**
   - Merge related summaries
   - Create higher-level abstractions
   - Reduce context bloat

3. **Smart Forgetting**
   - Auto-delete old, low-importance memories
   - Implement decay based on time and usage
   - Preserve only essential information

4. **User Annotations**
   - Allow manual editing of summaries
   - Add custom importance scores
   - Tag critical information

5. **Shared Memories**
   - Team-wide knowledge base
   - Cross-user memories for events
   - Collaborative memory building

6. **Export/Import**
   - Download all memories
   - Backup and restore
   - Transfer between systems

## 🔐 Security & Privacy

- **RLS Policies**: Users only see their own memories
- **Automatic Deletion**: Cascade delete when conversation deleted
- **No Sharing**: Memories are private to each user
- **Audit Trail**: Timestamps track when memories created

## 🐛 Troubleshooting

### Summaries not being created
1. Check conversation has ≥4 messages
2. Verify GitHub token is valid
3. Check browser console for errors
4. Ensure database tables exist

### AI not using memories
1. Verify summaries exist (check Memories modal)
2. Check importance scores (must be ≥4)
3. Review summary quality (may be too vague)
4. Check console for context loading errors

### "Failed to generate summary" error
1. Check GitHub Models API status
2. Verify token has correct permissions
3. Check conversation has actual content
4. Review Supabase logs for database errors

## 📝 Best Practices

1. **Review Memories Periodically**
   - Check Memories modal monthly
   - Delete outdated/incorrect summaries
   - Ensure important info is captured

2. **Keep Conversations Focused**
   - One topic per conversation
   - Makes summaries more accurate
   - Easier for AI to extract key points

3. **Longer Conversations = Better Summaries**
   - 6-10 messages ideal
   - More context for AI
   - Higher importance scores

4. **Explicitly State Important Facts**
   - "The wedding date is June 15, 2024"
   - Clear statements easier to summarize
   - Reduces ambiguity

## 🤝 Contributing

When extending the memory system:

1. **Maintain Service Separation**
   - ConversationMemoryService handles all memory logic
   - UI components only display/trigger
   - Clear interface boundaries

2. **Add Tests** (when test framework added)
   - Test summary generation
   - Test retrieval logic
   - Test formatting

3. **Update Documentation**
   - Document new features here
   - Add code examples
   - Update troubleshooting

## 📄 License

MIT License - see LICENSE file for details
