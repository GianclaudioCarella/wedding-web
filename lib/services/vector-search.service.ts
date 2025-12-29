/**
 * VectorSearchService
 * 
 * Performs semantic similarity search on document embeddings.
 * Uses cosine similarity to find the most relevant document chunks
 * for a given query, enabling Retrieval Augmented Generation (RAG).
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { EmbeddingService } from './embedding.service';

export interface SearchResult {
  chunkId: string;
  documentId: string;
  content: string;
  similarity: number; // Cosine similarity score (0-1, higher is more similar)
  metadata: any;
  documentFilename?: string;
}

export interface SearchOptions {
  limit?: number; // Maximum number of results to return
  similarityThreshold?: number; // Minimum similarity score (0-1)
}

export class VectorSearchService {
  private supabase: SupabaseClient;
  private embeddingService: EmbeddingService;

  constructor(supabase: SupabaseClient, embeddingService: EmbeddingService) {
    this.supabase = supabase;
    this.embeddingService = embeddingService;
  }

  /**
   * Searches for document chunks that are semantically similar to the query.
   * 
   * Process:
   * 1. Generate embedding for the search query
   * 2. Use pgvector's cosine similarity to find nearest neighbors
   * 3. Return ranked results with metadata
   * 
   * @param query - The search query text
   * @param options - Search configuration options
   * @returns Promise with array of ranked search results
   */
  async searchSimilarChunks(
    query: string,
    options: SearchOptions = {}
  ): Promise<SearchResult[]> {
    // Set default options
    const limit = options.limit || 5;
    const similarityThreshold = options.similarityThreshold || 0.5;

    try {
      // Step 1: Generate embedding for the query
      const { embedding } = await this.embeddingService.generateEmbedding(query);

      // Step 2: Perform vector similarity search using pgvector
      // The <=> operator calculates cosine distance (1 - cosine similarity)
      // We'll convert it back to similarity for clarity
      const { data, error } = await this.supabase.rpc('search_document_chunks', {
        query_embedding: embedding,
        match_threshold: 1 - similarityThreshold, // Convert similarity to distance
        match_count: limit,
      });

      if (error) {
        throw new Error(`Vector search failed: ${error.message}`);
      }

      // Step 3: Format and return results
      return (data || []).map((row: any) => ({
        chunkId: row.chunk_id,
        documentId: row.document_id,
        content: row.content,
        similarity: 1 - row.distance, // Convert distance back to similarity
        metadata: row.metadata,
        documentFilename: row.document_filename,
      }));
    } catch (error) {
      console.error('Error in vector search:', error);
      throw error;
    }
  }

  /**
   * Searches for relevant context and formats it for inclusion in a prompt.
   * This is the main method to use for RAG.
   * 
   * @param query - The user's query
   * @param options - Search configuration
   * @returns Formatted context string to include in AI prompt
   */
  async getRelevantContext(
    query: string,
    options: SearchOptions = {}
  ): Promise<string> {
    const results = await this.searchSimilarChunks(query, options);

    if (results.length === 0) {
      return 'No relevant documents found in the knowledge base.';
    }

    // Format results into a readable context
    const contextParts = results.map((result, index) => {
      return `[Document ${index + 1}: ${result.documentFilename || 'Unknown'} (Relevance: ${(result.similarity * 100).toFixed(1)}%)]
${result.content}`;
    });

    return `RELEVANT KNOWLEDGE BASE CONTEXT:

${contextParts.join('\n\n---\n\n')}

Please use the above context to answer the user's question. If the context doesn't contain relevant information, acknowledge that and use your general knowledge.`;
  }

  /**
   * Checks if there are any documents available for search.
   * Useful for showing/hiding search-related UI elements.
   */
  async hasDocuments(): Promise<boolean> {
    const { data, error } = await this.supabase
      .from('documents')
      .select('id')
      .eq('status', 'completed')
      .limit(1);

    if (error) {
      console.error('Error checking for documents:', error);
      return false;
    }

    return (data?.length || 0) > 0;
  }

  /**
   * Gets statistics about the document collection.
   */
  async getCollectionStats(): Promise<{
    documentCount: number;
    chunkCount: number;
    totalSize: number;
  }> {
    // Get document count and total size
    const { data: docData, error: docError } = await this.supabase
      .from('documents')
      .select('file_size')
      .eq('status', 'completed');

    if (docError) {
      throw new Error(`Failed to get document stats: ${docError.message}`);
    }

    const documentCount = docData?.length || 0;
    const totalSize = docData?.reduce((sum, doc) => sum + doc.file_size, 0) || 0;

    // Get chunk count
    const { count: chunkCount, error: chunkError } = await this.supabase
      .from('document_chunks')
      .select('*', { count: 'exact', head: true });

    if (chunkError) {
      throw new Error(`Failed to get chunk count: ${chunkError.message}`);
    }

    return {
      documentCount,
      chunkCount: chunkCount || 0,
      totalSize,
    };
  }
}
