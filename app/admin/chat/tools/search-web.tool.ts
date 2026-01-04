// Web search tool using Tavily API with caching and metrics tracking

import { SupabaseClient } from '@supabase/supabase-js';
import { normalizeQueryForCache, hashString } from '../services/cache.service';
import { MetricsService } from '../services/metrics.service';
import { SearchWebResult } from '../types';

export class SearchWebTool {
  private metricsService: MetricsService;

  constructor(
    private supabase: SupabaseClient,
    private tavilyApiKey: string
  ) {
    this.metricsService = new MetricsService(supabase);
  }

  async execute(query: string): Promise<SearchWebResult> {
    if (!this.tavilyApiKey) {
      return {
        error: 'Tavily API key not configured. Please add your Tavily API key in settings.',
        results: [],
        query,
      };
    }

    const startTime = Date.now();

    try {
      // Normalize query semantically for better cache hits
      const normalizedQuery = normalizeQueryForCache(query);
      const queryHash = await hashString(normalizedQuery);
      
      console.log('🔍 Searching cache for query:', normalizedQuery);
      console.log('🔑 Cache hash:', queryHash);
      
      // Check cache first (use maybeSingle instead of single to avoid error when no results)
      const { data: cached, error: cacheError } = await this.supabase
        .from('tavily_cache')
        .select('results, created_at, id, hit_count')
        .eq('query_hash', queryHash)
        .gt('expires_at', new Date().toISOString())
        .maybeSingle();
      
      if (cacheError) {
        console.error('❌ Cache lookup error:', cacheError);
      }
      
      if (cached) {
        console.log('✅ Cache HIT! Using cached result');
        
        // Log metrics for cache hit
        const responseTime = Date.now() - startTime;
        await this.metricsService.logApiCall({
          api_name: 'tavily',
          endpoint: '/search',
          method: 'POST',
          response_time_ms: responseTime,
          status_code: 200,
          success: true,
          metadata: {
            from_cache: true,
            cache_hit_count: cached.hit_count,
            query_normalized: normalizedQuery,
          },
        });
        
        // Update hit count and last accessed
        await this.supabase
          .from('tavily_cache')
          .update({
            hit_count: (cached.hit_count || 0) + 1,
            last_accessed_at: new Date().toISOString(),
          })
          .eq('id', cached.id);
        
        return {
          ...cached.results,
          from_cache: true,
          cached_at: cached.created_at,
        };
      }

      console.log('❌ Cache MISS. Fetching from Tavily API...');
      
      // No cache hit, fetch from Tavily API with metrics tracking
      const result = await this.metricsService.trackApiCall(
        'tavily',
        async () => {
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

          return await response.json();
        },
        {
          endpoint: '/search',
          method: 'POST',
          metadata: {
            from_cache: false,
            query_normalized: normalizedQuery,
          },
        }
      );

      const searchResult: SearchWebResult = {
        answer: result.answer || '',
        results: result.results?.map((r: any) => ({
          title: r.title,
          url: r.url,
          content: r.content,
          score: r.score,
        })) || [],
        query: query,
      };
      
      // Save to cache
      console.log('💾 Saving result to cache...');
      const { error: insertError } = await this.supabase
        .from('tavily_cache')
        .insert({
          query: normalizedQuery,
          query_hash: queryHash,
          results: searchResult,
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
        });
      
      if (insertError) {
        console.error('❌ Failed to save to cache:', insertError);
      } else {
        console.log('✅ Saved to cache successfully');
      }
      
      return searchResult;
    } catch (error: any) {
      // Log error metrics
      const responseTime = Date.now() - startTime;
      await this.metricsService.logApiCall({
        api_name: 'tavily',
        endpoint: '/search',
        method: 'POST',
        response_time_ms: responseTime,
        status_code: 500,
        success: false,
        error_message: error.message,
        error_type: error.name || 'Error',
      });
      
      return {
        error: error.message,
        results: [],
        query,
      };
    }
  }
}
