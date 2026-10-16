-- Create tavily_cache table to store search results and avoid repeated API calls
CREATE TABLE IF NOT EXISTS tavily_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  query TEXT NOT NULL,
  query_hash TEXT NOT NULL UNIQUE, -- Hash of normalized query for faster lookups
  results JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days'),
  hit_count INTEGER DEFAULT 0,
  last_accessed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster query lookups
CREATE INDEX idx_tavily_cache_query_hash ON tavily_cache(query_hash);
CREATE INDEX idx_tavily_cache_expires_at ON tavily_cache(expires_at);

-- Enable Row Level Security (optional - allows all authenticated users to read cache)
ALTER TABLE tavily_cache ENABLE ROW LEVEL SECURITY;

-- Policy: All authenticated users can read cache
CREATE POLICY "Authenticated users can read cache"
  ON tavily_cache
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy: All authenticated users can insert to cache
CREATE POLICY "Authenticated users can insert cache"
  ON tavily_cache
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Policy: All authenticated users can update cache (for hit_count)
CREATE POLICY "Authenticated users can update cache"
  ON tavily_cache
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Function to clean expired cache entries (run periodically)
CREATE OR REPLACE FUNCTION clean_expired_tavily_cache()
RETURNS void AS $$
BEGIN
  DELETE FROM tavily_cache WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- Optional: Create a scheduled job to clean expired cache daily
-- Note: This requires pg_cron extension (uncomment if available)
-- SELECT cron.schedule('clean-tavily-cache', '0 2 * * *', 'SELECT clean_expired_tavily_cache()');
