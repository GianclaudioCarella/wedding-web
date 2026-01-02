// Generic web search tool using Tavily API with caching
// This tool is database-agnostic and can work with any caching backend

import { normalizeQueryForCache, hashString } from '../services/cache.service';
import { SearchWebResult } from '../types';

export interface CacheBackend {
  get(queryHash: string): Promise<any | null>;
  set(queryHash: string, normalizedQuery: string, result: SearchWebResult): Promise<void>;
  updateHitCount(queryHash: string): Promise<void>;
}

export class SearchWebTool {
  constructor(
    private tavilyApiKey: string,
    private cacheBackend?: CacheBackend
  ) {}

  async execute(query: string): Promise<SearchWebResult> {
    if (!this.tavilyApiKey) {
      return {
        error: 'Tavily API key not configured. Please add your Tavily API key in settings.',
        results: [],
        query,
      };
    }

    try {
      // Check cache if available
      if (this.cacheBackend) {
        const normalizedQuery = normalizeQueryForCache(query);
        const queryHash = await hashString(normalizedQuery);
        
        console.log('🔍 Searching cache for query:', normalizedQuery);
        console.log('🔑 Cache hash:', queryHash);
        
        const cached = await this.cacheBackend.get(queryHash);
        
        if (cached) {
          console.log('✅ Cache HIT! Using cached result');
          await this.cacheBackend.updateHitCount(queryHash);
          
          return {
            ...cached.results,
            from_cache: true,
            cached_at: cached.created_at,
          };
        }

        console.log('❌ Cache MISS. Fetching from Tavily API...');
      }

      // Fetch from Tavily API
      const response = await fetch('https://api.tavily.com/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          api_key: this.tavilyApiKey,
          query: query,
          search_depth: 'basic',
          include_answer: true,
          max_results: 5,
        }),
      });

      if (!response.ok) {
        throw new Error(`Tavily API error: ${response.statusText}`);
      }

      const data = await response.json();
      
      const results: SearchWebResult = {
        answer: data.answer || '',
        results: data.results?.map((r: any) => ({
          title: r.title,
          url: r.url,
          content: r.content,
          score: r.score,
        })) || [],
        query: query,
      };
      
      // Save to cache if available
      if (this.cacheBackend) {
        console.log('💾 Saving result to cache...');
        const normalizedQuery = normalizeQueryForCache(query);
        const queryHash = await hashString(normalizedQuery);
        
        await this.cacheBackend.set(queryHash, normalizedQuery, results);
        console.log('✅ Saved to cache successfully');
      }
      
      return results;
    } catch (error: any) {
      return {
        error: error.message,
        results: [],
        query,
      };
    }
  }
}
