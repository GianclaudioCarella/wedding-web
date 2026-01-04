// Cliente Supabase para métricas
// Usa o mesmo banco do wedding (simplificado)

import { supabase } from '@/lib/supabase';

/**
 * Retorna o cliente Supabase principal
 * As tabelas de métricas estão no mesmo banco do wedding
 */
export function getMetricsClient() {
  return supabase;
}
