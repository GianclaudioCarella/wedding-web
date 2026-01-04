-- ============================================
-- SCRIPT PARA CRIAR TABELAS DE MÉTRICAS NO SUPABASE
-- Execute este script no Supabase SQL Editor
-- ============================================

-- 1. Criar tabela de logs de API
CREATE TABLE IF NOT EXISTS api_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  api_name TEXT NOT NULL,
  endpoint TEXT,
  method TEXT,
  user_id UUID,
  session_id TEXT,
  response_time_ms INTEGER,
  status_code INTEGER,
  success BOOLEAN DEFAULT true,
  error_message TEXT,
  error_type TEXT,
  metadata JSONB DEFAULT '{}'::jsonb
);

-- 2. Criar tabela de uso de tokens
CREATE TABLE IF NOT EXISTS tokens_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  model TEXT NOT NULL,
  provider TEXT NOT NULL,
  prompt_tokens INTEGER DEFAULT 0,
  completion_tokens INTEGER DEFAULT 0,
  total_tokens INTEGER DEFAULT 0,
  estimated_cost_usd DECIMAL(10, 6),
  user_id UUID,
  session_id TEXT,
  conversation_id UUID,
  metadata JSONB DEFAULT '{}'::jsonb
);

-- 3. Criar índices
CREATE INDEX IF NOT EXISTS idx_api_logs_timestamp ON api_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_api_logs_api_name ON api_logs(api_name);
CREATE INDEX IF NOT EXISTS idx_tokens_timestamp ON tokens_usage(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_tokens_model ON tokens_usage(model);

-- 4. Habilitar RLS
ALTER TABLE api_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE tokens_usage ENABLE ROW LEVEL SECURITY;

-- 5. Criar políticas (permitir tudo para usuários autenticados)
DROP POLICY IF EXISTS "Allow all for authenticated users" ON api_logs;
CREATE POLICY "Allow all for authenticated users"
  ON api_logs
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all for authenticated users" ON tokens_usage;
CREATE POLICY "Allow all for authenticated users"
  ON tokens_usage
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- 6. Criar view para métricas de Tavily
CREATE OR REPLACE VIEW v_tavily_metrics AS
SELECT
  date_trunc('hour', timestamp) as hour,
  COUNT(*) as total_calls,
  COUNT(*) FILTER (WHERE success = true) as successful_calls,
  COUNT(*) FILTER (WHERE success = false) as failed_calls,
  AVG(response_time_ms)::INTEGER as avg_response_time_ms,
  MAX(response_time_ms) as max_response_time_ms
FROM api_logs
WHERE api_name = 'tavily'
  AND timestamp >= NOW() - INTERVAL '7 days'
GROUP BY date_trunc('hour', timestamp)
ORDER BY hour DESC;

-- Concluído! ✅
SELECT 'Tabelas de métricas criadas com sucesso!' as status;
