// Event management tools

import { SupabaseClient } from '@supabase/supabase-js';
import { currentWeddingId } from '@/lib/tenant';

const WEDDING_ID = currentWeddingId();

export class EventTools {
  constructor(private supabase: SupabaseClient) {}

  /**
   * List all wedding events
   */
  async listEvents() {
    const { data: events, error } = await this.supabase
      .from('events')
      .select('*').eq('wedding_id', WEDDING_ID)
      .order('event_date');
    
    if (error) throw error;

    return events || [];
  }
}
