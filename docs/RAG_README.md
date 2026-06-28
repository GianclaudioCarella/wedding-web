# RAG (Retrieval Augmented Generation) System

Adds intelligent document search to the wedding AI assistant, allowing it to answer questions based on uploaded documents.

## Architecture

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
│  └──────────────────┬──────────────────────────────┘   │
│                     │                                    │
│  ┌─────────────────▼──────────────────────────────┐   │
│  │ EmbeddingService                                │   │
│  │ - Generate vector embeddings via GitHub Models  │   │
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

- **Service-Oriented Architecture**: each service has a single responsibility
- **Intelligent Text Chunking**: 1000-character chunks with 200-character overlap
- **Vector Similarity Search**: cosine similarity via pgvector (HNSW index)
- **Seamless Integration**: RAG automatically enriches every chat message with relevant document context

## Setup

### 1. Enable pgvector

Run in Supabase SQL Editor:

```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

### 2. Create Database Tables

Run `database/create_documents_tables.sql` in Supabase SQL Editor.

This creates:
- `documents` table for file metadata
- `document_chunks` table with vector embeddings
- Indexes for fast similarity search
- RLS policies for secure access
- `search_document_chunks` function for vector search

### 3. Verify Setup

```sql
SELECT tablename FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('documents', 'document_chunks');

SELECT * FROM pg_extension WHERE extname = 'vector';
```

## Usage

### For Users

1. Open Admin Chat and click "Documents" in the sidebar
2. Upload a `.txt` or `.pdf` file — the system extracts text, chunks it, generates embeddings, and stores them
3. Ask any question in chat — the AI automatically searches documents and answers based on their content
4. Manage documents (view status, delete) from the same panel

### How RAG Works

When you send a message:

1. Generate an embedding for the query
2. Search database for semantically similar chunks
3. Inject the top results into the AI system prompt
4. AI responds using that context

### For Developers

```typescript
import { EmbeddingService } from '@/lib/services/embedding.service';
import { DocumentService } from '@/lib/services/document.service';
import { VectorSearchService } from '@/lib/services/vector-search.service';

const embeddingService = new EmbeddingService(githubToken);
const documentService = new DocumentService(supabase, embeddingService);
const vectorSearchService = new VectorSearchService(supabase, embeddingService);

// Process a file
const documentId = await documentService.processDocument(file, userId);

// Search
const context = await vectorSearchService.getRelevantContext("wedding venue location", {
  limit: 3,
  similarityThreshold: 0.6,
});
```

## Configuration

### Embedding Model

Model: `text-embedding-3-small` (1536 dimensions) via GitHub Models API.

Change in `lib/services/embedding.service.ts`:
```typescript
const EMBEDDING_MODEL = 'text-embedding-3-small';
const EMBEDDING_DIMENSION = 1536;
```

### Chunking Parameters

Change in `lib/services/document.service.ts`:
```typescript
const CHUNK_SIZE = 1000;
const CHUNK_OVERLAP = 200;
```

### Search Settings

Change in `app/admin/chat/page.tsx`:
```typescript
const context = await vectorSearchService.getRelevantContext(messageContent, {
  limit: 3,
  similarityThreshold: 0.6,
});
```

## Supported File Types

- Plain text (`.txt`)
- PDF (`.pdf`) — text-based PDFs only

Not supported:
- Scanned PDFs (require OCR)
- Images
- Word documents (`.docx`)
- Password-protected PDFs

## Database Schema

### documents
```sql
id            UUID (primary key)
filename      TEXT
file_type     TEXT
file_size     INTEGER
uploaded_by   UUID
uploaded_at   TIMESTAMP
status        TEXT  -- processing | completed | failed
error_message TEXT
metadata      JSONB
```

### document_chunks
```sql
id           UUID (primary key)
document_id  UUID (references documents)
chunk_index  INTEGER
content      TEXT
embedding    vector(1536)
token_count  INTEGER
metadata     JSONB
created_at   TIMESTAMP
```

## Security

- RLS policies: all authenticated users can read documents (shared knowledge base), only uploaders can delete
- File type validation before processing
- Password-protected PDFs are rejected

## Troubleshooting

**Documents not processing**
- Check GitHub token has "models" scope
- Verify pgvector extension is enabled
- Check Supabase logs

**Search returns no results**
- Verify documents have `status = 'completed'`
- Lower `similarityThreshold` (try 0.3)
- Check embedding dimension matches (1536)

**PDF text extraction incomplete**
- Some PDFs use images instead of text — OCR is not supported
- Complex table layouts may have ordering issues
