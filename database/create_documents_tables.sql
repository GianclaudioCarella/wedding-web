-- Enable pgvector extension for vector similarity search
CREATE EXTENSION IF NOT EXISTS vector;

-- Table for storing uploaded documents
CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  filename TEXT NOT NULL,
  file_type TEXT NOT NULL, -- pdf, txt, docx, etc.
  file_size INTEGER NOT NULL, -- size in bytes
  uploaded_by UUID NOT NULL,
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  status TEXT NOT NULL DEFAULT 'processing' CHECK (status IN ('processing', 'completed', 'failed')),
  error_message TEXT,
  metadata JSONB DEFAULT '{}'::jsonb -- additional metadata like page count, etc.
);

-- Table for storing document chunks with vector embeddings
CREATE TABLE IF NOT EXISTS document_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  chunk_index INTEGER NOT NULL, -- order of chunk in document
  content TEXT NOT NULL, -- the actual text content
  embedding vector(1536), -- OpenAI/GitHub Models embedding dimension
  token_count INTEGER, -- approximate token count of chunk
  metadata JSONB DEFAULT '{}'::jsonb, -- page number, section, etc.
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(document_id, chunk_index)
);

-- Index for faster document queries
CREATE INDEX IF NOT EXISTS idx_documents_uploaded_by ON documents(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_documents_status ON documents(status);

-- Index for faster chunk queries
CREATE INDEX IF NOT EXISTS idx_document_chunks_document_id ON document_chunks(document_id);

-- Vector similarity search index (HNSW - Hierarchical Navigable Small World)
-- This enables fast approximate nearest neighbor search
CREATE INDEX IF NOT EXISTS idx_document_chunks_embedding ON document_chunks 
  USING hnsw (embedding vector_cosine_ops);

-- RLS Policies
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_chunks ENABLE ROW LEVEL SECURITY;

-- All authenticated users can view all documents (shared knowledge base)
CREATE POLICY "Authenticated users can view all documents"
  ON documents FOR SELECT
  USING (auth.role() = 'authenticated');

-- Only the uploader can insert documents
CREATE POLICY "Users can upload documents"
  ON documents FOR INSERT
  WITH CHECK (auth.uid() = uploaded_by);

-- Only the uploader can update their documents
CREATE POLICY "Users can update their own documents"
  ON documents FOR UPDATE
  USING (auth.uid() = uploaded_by);

-- Only the uploader can delete their documents
CREATE POLICY "Users can delete their own documents"
  ON documents FOR DELETE
  USING (auth.uid() = uploaded_by);

-- All authenticated users can view all chunks (for semantic search)
CREATE POLICY "Authenticated users can view all chunks"
  ON document_chunks FOR SELECT
  USING (auth.role() = 'authenticated');

-- System can insert chunks (done by backend processing)
CREATE POLICY "Authenticated users can insert chunks"
  ON document_chunks FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- Allow deletion of chunks when parent document is deleted (cascade handles this)
CREATE POLICY "Authenticated users can delete chunks"
  ON document_chunks FOR DELETE
  USING (auth.role() = 'authenticated');

-- Function for vector similarity search
-- Returns the most similar document chunks to a query embedding
CREATE OR REPLACE FUNCTION search_document_chunks(
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.5,
  match_count int DEFAULT 5
)
RETURNS TABLE (
  chunk_id uuid,
  document_id uuid,
  content text,
  distance float,
  metadata jsonb,
  document_filename text
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    dc.id as chunk_id,
    dc.document_id,
    dc.content,
    (dc.embedding <=> query_embedding) as distance,
    dc.metadata,
    d.filename as document_filename
  FROM document_chunks dc
  JOIN documents d ON dc.document_id = d.id
  WHERE d.status = 'completed'
    AND (dc.embedding <=> query_embedding) < match_threshold
  ORDER BY dc.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
