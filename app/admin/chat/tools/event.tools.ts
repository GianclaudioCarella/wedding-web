// Event management tools

import { SupabaseClient } from '@supabase/supabase-js';

export class EventTools {
  constructor(private supabase: SupabaseClient) {}

  /**
   * List all wedding events
   */
  async listEvents() {
    const { data: events, error } = await this.supabase
      .from('events')
      .select('*')
      .order('event_date');
    
    if (error) throw error;

    return events || [];
  }
}
