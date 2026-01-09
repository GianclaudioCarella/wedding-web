/**
 * Document Search Tool
 * Provides semantic search across uploaded wedding documents
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { VectorSearchService } from '@/lib/services/vector-search.service';
import { EmbeddingService } from '@/lib/services/embedding.service';

export class DocumentTools {
  private vectorSearchService: VectorSearchService;

  constructor(supabase: SupabaseClient, githubToken: string) {
    const embeddingService = new EmbeddingService(githubToken);
    this.vectorSearchService = new VectorSearchService(supabase, embeddingService);
  }

  /**
   * Search uploaded documents for relevant information
   */
  async searchDocuments(query: string): Promise<string> {
    try {
      const results = await this.vectorSearchService.searchSimilarChunks(query, {
        limit: 5,
        similarityThreshold: 0.3, // Lower threshold to get more results
      });

      if (results.length === 0) {
        return 'No relevant information found in uploaded documents. You may need to ask the user to provide this information or upload relevant documents.';
      }

      // Format results with document sources
      let response = 'Based on the uploaded documents, here is the relevant information:\n\n';
      
      const uniqueDocuments = new Set<string>();
      results.forEach(result => {
        if (result.documentFilename) {
          uniqueDocuments.add(result.documentFilename);
        }
      });

      // Add content from each result
      results.forEach((result, index) => {
        response += `**From ${result.documentFilename || 'document'}** (relevance: ${(result.similarity * 100).toFixed(0)}%):\n`;
        response += `${result.content}\n\n`;
      });

      response += `\n📄 Sources: ${Array.from(uniqueDocuments).join(', ')}`;

      return response;
    } catch (error) {
      console.error('Error searching documents:', error);
      return 'Error searching documents. Please try again or contact support.';
    }
  }
}
