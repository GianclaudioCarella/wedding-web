# RAG (Retrieval Augmented Generation) System

This implementation adds intelligent document search capabilities to the wedding AI assistant, allowing it to answer questions based on uploaded documents.

## Architecture Overview

The system follows clean code principles with clear separation of concerns:

```
┌─────────────────────────────────────────────────────────┐
│                    User Interface                        │
│  (DocumentUpload.tsx - Upload & manage documents)       │
└────────────────────┬────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────┐
│                  Services Layer                          │
│  ┌─────────────────────────────────────────────────┐   │
│  │ DocumentService                                  │   │
│  │ - Extract text from files                       │   │
│  │ - Split into chunks with overlap                │   │
│  │ - Coordinate document processing                │   │
│  └──────────────────┬──────────────────────────────┘   │
│                     │                                    │
│  ┌─────────────────▼──────────────────────────────┐   │
│  │ EmbeddingService                                │   │
│  │ - Generate vector embeddings via GitHub Models │   │
│  │ - Batch processing support                      │   │
│  └─────────────────────────────────────────────────┘   │
│                                                          │
│  ┌──────────────────────────────────────────────────┐  │
│  │ VectorSearchService                              │  │
│  │ - Semantic similarity search                     │  │
│  │ - Context retrieval for RAG                      │  │
│  └─────────────────┬────────────────────────────────┘  │
└────────────────────┼────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────┐
│              Database (Supabase + pgvector)              │
│  - documents: File metadata                              │
│  - document_chunks: Text chunks with embeddings          │
│  - Vector similarity search function                     │
└──────────────────────────────────────────────────────────┘
```

## Key Features

### 1. **Service-Oriented Architecture**
Each service has a single responsibility:
- `EmbeddingService`: Converts text to vector embeddings
- `DocumentService`: Handles file processing and chunking
- `VectorSearchService`: Performs semantic search

### 2. **Intelligent Text Chunking**
- Documents are split into 1000-character chunks
- 200-character overlap maintains context between chunks
- Metadata tracks position for reconstruction

### 3. **Vector Similarity Search**
- Uses cosine similarity to find relevant content
- Configurable threshold and result limit
- Ranks results by relevance score

### 4. **Seamless Integration**
- RAG automatically enhances every chat message
- Searches for relevant document context
- Includes top results in AI prompt
- Falls back gracefully if no documents exist

## Setup Instructions

### 1. Enable pgvector Extension

Run this SQL in your Supabase SQL Editor:

```sql
-- Enable the pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;
```

### 2. Create Database Tables

Execute the SQL file:

```bash
# In Supabase SQL Editor, run:
# File: database/create_documents_tables.sql
```

This creates:
- `documents` table for file metadata
- `document_chunks` table with vector embeddings
- Indexes for fast similarity search
- RLS policies for secure access
- `search_document_chunks` function for vector search

### 3. Verify Setup

Check that tables were created:

```sql
SELECT tablename FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('documents', 'document_chunks');
```

Check that pgvector extension is enabled:

```sql
SELECT * FROM pg_extension WHERE extname = 'vector';
```

## Usage Guide

### For Users

1. **Access Documents**
   - Open Admin Chat
   - Click "Documents" button in sidebar

2. **Upload a Document**
   - Drag and drop a .txt file, or click to browse
   - System automatically processes the file:
     - Extracts text
     - Splits into chunks
     - Generates embeddings
     - Stores in database

3. **Ask Questions**
   - Ask any question in the chat
   - AI automatically searches documents
   - Receives relevant context
   - Answers based on your documents!

4. **Manage Documents**
   - View all uploaded documents
   - See processing status
   - Delete documents you no longer need

### How RAG Works

When you send a message:

1. **Query Processing**
   ```
   User: "What is the wedding date?"
   ↓
   Generate embedding for query
   ```

2. **Semantic Search**
   ```
   Search database for similar chunks
   ↓
   Find: "The wedding will take place on June 15, 2024..."
   Similarity: 0.89 (89% match)
   ```

3. **Context Enhancement**
   ```
   Original prompt + Relevant document excerpts
   ↓
   AI generates informed response
   ```

4. **Response**
   ```
   AI: "Based on the wedding documents, the ceremony 
        is scheduled for June 15, 2024."
   ```

## Code Examples

### Uploading and Processing a Document

```typescript
import { EmbeddingService } from '@/lib/services/embedding.service';
import { DocumentService } from '@/lib/services/document.service';

// Initialize services
const embeddingService = new EmbeddingService(githubToken);
const documentService = new DocumentService(supabase, embeddingService);

// Process a file
const documentId = await documentService.processDocument(file, userId);
```

### Searching for Relevant Content

```typescript
import { VectorSearchService } from '@/lib/services/vector-search.service';

// Initialize service
const vectorSearchService = new VectorSearchService(supabase, embeddingService);

// Search with custom options
const results = await vectorSearchService.searchSimilarChunks(
  "wedding venue location",
  {
    limit: 5,                    // Return top 5 results
    similarityThreshold: 0.6     // 60% similarity minimum
  }
);

// Get formatted context for AI
const context = await vectorSearchService.getRelevantContext(
  "wedding venue location"
);
```

### Custom Text Chunking

```typescript
const documentService = new DocumentService(supabase, embeddingService);

// Split a long text
const chunks = documentService.splitTextIntoChunks(longText);

// Each chunk contains:
// - content: The text
// - chunkIndex: Position in document
// - metadata: Start/end positions
```

## Configuration

### Embedding Model
- Model: `text-embedding-3-small`
- Dimension: 1536
- Provider: GitHub Models API

Change in `lib/services/embedding.service.ts`:
```typescript
const EMBEDDING_MODEL = 'text-embedding-3-small';
const EMBEDDING_DIMENSION = 1536;
```

### Chunking Parameters
Change in `lib/services/document.service.ts`:
```typescript
const CHUNK_SIZE = 1000;      // Characters per chunk
const CHUNK_OVERLAP = 200;    // Overlap between chunks
```

### Search Settings
Change in `app/admin/chat/page.tsx`:
```typescript
const context = await vectorSearchService.getRelevantContext(messageContent, {
  limit: 3,                    // Number of chunks to retrieve
  similarityThreshold: 0.6,    // Minimum similarity (0-1)
});
```

## Supported File Types

Currently supported:
- ✅ Plain text (.txt)

Future support planned:
- 📄 PDF files
- 📝 Word documents (.docx)
- 📊 Markdown files (.md)

To add support for new file types, extend the `extractTextFromFile` method in `DocumentService`.

## Performance Optimization

### Vector Index
The system uses HNSW (Hierarchical Navigable Small World) index:
- Fast approximate nearest neighbor search
- Trade-off between speed and accuracy
- Optimized for high-dimensional vectors

### Batch Processing
Embeddings are generated in batches of 10:
- Reduces API calls
- Improves processing speed
- Better rate limit handling

### Caching
Results are cached at the database level:
- Fast repeated searches
- Reduced API costs
- Better user experience

## Troubleshooting

### Documents Not Processing
1. Check GitHub token has "models" scope
2. Verify pgvector extension is enabled
3. Check Supabase logs for errors

### Search Returns No Results
1. Verify documents have `status='completed'`
2. Lower `similarityThreshold` (try 0.3)
3. Check embedding dimension matches (1536)

### Slow Processing
1. Use batch processing for multiple files
2. Reduce chunk size for faster processing
3. Check network connection to GitHub Models API

## Database Schema

### documents table
```sql
- id: UUID (primary key)
- filename: TEXT
- file_type: TEXT
- file_size: INTEGER
- uploaded_by: UUID (references user)
- uploaded_at: TIMESTAMP
- status: TEXT (processing | completed | failed)
- error_message: TEXT (optional)
- metadata: JSONB
```

### document_chunks table
```sql
- id: UUID (primary key)
- document_id: UUID (references documents)
- chunk_index: INTEGER
- content: TEXT
- embedding: vector(1536)
- token_count: INTEGER
- metadata: JSONB
- created_at: TIMESTAMP
```

## Security

### Row Level Security (RLS)
- All authenticated users can read all documents (shared knowledge base)
- Only uploaders can modify/delete their documents
- Vector search available to all authenticated users

### File Validation
- File type checking before processing
- Size limits can be configured
- Malicious content detection (to be implemented)

## Future Enhancements

1. **Multi-format Support**
   - PDF parsing
   - Word document extraction
   - Image OCR

2. **Advanced Search**
   - Hybrid search (vector + keyword)
   - Metadata filtering
   - Date range filtering

3. **Performance**
   - Redis caching
   - Background job processing
   - Webhook notifications

4. **Analytics**
   - Search quality metrics
   - Usage statistics
   - Popular documents tracking

## Contributing

When adding new features, follow these principles:

1. **Single Responsibility**: Each service does one thing well
2. **Clear Interfaces**: Well-defined public methods with documentation
3. **Error Handling**: Graceful degradation, informative errors
4. **Type Safety**: Full TypeScript typing
5. **Testing**: Unit tests for services (to be implemented)

## License

MIT License - see LICENSE file for details
