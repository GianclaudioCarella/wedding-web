const EMBEDDING_MODEL = 'text-embedding-3-small';
const EMBEDDING_DIMENSION = 1536;

export interface EmbeddingResult {
  embedding: number[];
  tokenCount: number;
}

export class EmbeddingService {
  constructor(
    private getAuthToken: () => Promise<string | null>,
  ) {}

  private async fetchEmbedding(input: string | string[]): Promise<any> {
    const authToken = await this.getAuthToken();
    const response = await fetch('/api/admin/chat/embeddings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
      },
      body: JSON.stringify({ model: EMBEDDING_MODEL, input }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      const err = new Error(`Failed to generate embedding: ${response.status} - ${errorText}`);
      (err as any).status = response.status;
      throw err;
    }
    return response.json();
  }

  async generateEmbedding(text: string): Promise<EmbeddingResult> {
    if (!text?.trim()) throw new Error('Text cannot be empty');
    const data = await this.fetchEmbedding(text);
    return { embedding: data.data[0].embedding, tokenCount: data.usage.total_tokens };
  }

  async generateEmbeddingsBatch(texts: string[]): Promise<EmbeddingResult[]> {
    const validTexts = texts.filter(t => t?.trim());
    if (!validTexts.length) throw new Error('No valid texts to process');
    const data = await this.fetchEmbedding(validTexts);
    return data.data.map((item: any) => ({
      embedding: item.embedding,
      tokenCount: data.usage.total_tokens / validTexts.length,
    }));
  }

  getEmbeddingDimension(): number { return EMBEDDING_DIMENSION; }
  getModelName(): string { return EMBEDDING_MODEL; }
}
