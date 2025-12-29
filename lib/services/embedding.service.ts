/**
 * EmbeddingService
 * 
 * Responsible for generating vector embeddings from text using GitHub Models API.
 * Embeddings are numerical representations of text that capture semantic meaning,
 * enabling similarity search and retrieval of relevant information.
 */

const GITHUB_MODELS_ENDPOINT = 'https://models.inference.ai.azure.com';
const EMBEDDING_MODEL = 'text-embedding-3-small'; // GitHub Models compatible embedding model
const EMBEDDING_DIMENSION = 1536; // Dimension of the embedding vectors

export interface EmbeddingResult {
  embedding: number[];
  tokenCount: number;
}

export class EmbeddingService {
  private githubToken: string;

  constructor(githubToken: string) {
    if (!githubToken) {
      throw new Error('GitHub token is required for EmbeddingService');
    }
    this.githubToken = githubToken;
  }

  /**
   * Generates an embedding vector for the given text.
   * 
   * @param text - The text to generate an embedding for
   * @returns Promise with the embedding vector and token count
   * @throws Error if the API request fails
   */
  async generateEmbedding(text: string): Promise<EmbeddingResult> {
    if (!text || text.trim().length === 0) {
      throw new Error('Text cannot be empty');
    }

    try {
      const response = await fetch(`${GITHUB_MODELS_ENDPOINT}/embeddings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.githubToken}`,
        },
        body: JSON.stringify({
          model: EMBEDDING_MODEL,
          input: text,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to generate embedding: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      
      // GitHub Models API returns embeddings in OpenAI format
      const embedding = data.data[0].embedding;
      const tokenCount = data.usage.total_tokens;

      return {
        embedding,
        tokenCount,
      };
    } catch (error) {
      console.error('Error generating embedding:', error);
      throw error;
    }
  }

  /**
   * Generates embeddings for multiple texts in a single batch request.
   * More efficient than calling generateEmbedding multiple times.
   * 
   * @param texts - Array of texts to generate embeddings for
   * @returns Promise with array of embedding results
   * @throws Error if the API request fails
   */
  async generateEmbeddingsBatch(texts: string[]): Promise<EmbeddingResult[]> {
    if (!texts || texts.length === 0) {
      throw new Error('Texts array cannot be empty');
    }

    // Filter out empty texts
    const validTexts = texts.filter(text => text && text.trim().length > 0);
    
    if (validTexts.length === 0) {
      throw new Error('No valid texts to process');
    }

    try {
      const response = await fetch(`${GITHUB_MODELS_ENDPOINT}/embeddings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.githubToken}`,
        },
        body: JSON.stringify({
          model: EMBEDDING_MODEL,
          input: validTexts,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to generate embeddings: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      
      // Map the response to our result format
      return data.data.map((item: any) => ({
        embedding: item.embedding,
        tokenCount: data.usage.total_tokens / validTexts.length, // Approximate tokens per text
      }));
    } catch (error) {
      console.error('Error generating embeddings batch:', error);
      throw error;
    }
  }

  /**
   * Returns the dimension of embeddings produced by this service.
   * Useful for validation and database schema setup.
   */
  getEmbeddingDimension(): number {
    return EMBEDDING_DIMENSION;
  }

  /**
   * Returns the model name used for embeddings.
   */
  getModelName(): string {
    return EMBEDDING_MODEL;
  }
}
