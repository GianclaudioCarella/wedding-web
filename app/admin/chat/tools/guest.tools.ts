// Guest management tools

import { SupabaseClient } from '@supabase/supabase-js';

export class GuestTools {
  constructor(private supabase: SupabaseClient) {}

  /**
   * Get statistics about wedding guests
   */
  async getGuestStatistics() {
    const [{ data: guests, error }, { data: rsvps }] = await Promise.all([
      this.supabase.from('guests').select('id, attending, invited_at'),
      this.supabase.from('rsvp_responses').select('guest_id, status'),
    ]);

    if (error) throw error;

    const formalAttendingIds = new Set((rsvps || []).filter(r => r.status === 'attending').map(r => r.guest_id));

    const stats = {
      total_guests: guests?.length || 0,
      save_the_date_yes: guests?.filter(g => g.attending === 'yes').length || 0,
      save_the_date_no: guests?.filter(g => g.attending === 'no').length || 0,
      save_the_date_maybe: guests?.filter(g => g.attending === 'perhaps').length || 0,
      save_the_date_no_response: guests?.filter(g => !g.attending).length || 0,
      formal_rsvp_attending: formalAttendingIds.size,
      invited: guests?.filter(g => g.invited_at).length || 0,
      not_yet_invited: guests?.filter(g => !g.invited_at).length || 0,
    };

    return stats;
  }

  /**
   * List all guests or filter by status
   */
  async listGuests(filter?: string) {
    const { data: guests, error } = await this.supabase
      .from('guests')
      .select('id, name, email, phone, language, attending, invited_at')
      .order('name');

    if (error) throw error;

    let filtered = guests || [];
    if (filter === 'confirmed') filtered = filtered.filter(g => g.attending === 'yes');
    if (filter === 'declined') filtered = filtered.filter(g => g.attending === 'no');
    if (filter === 'maybe') filtered = filtered.filter(g => g.attending === 'perhaps');
    if (filter === 'no_response') filtered = filtered.filter(g => !g.attending);
    if (filter === 'invited') filtered = filtered.filter(g => g.invited_at);
    if (filter === 'not_invited') filtered = filtered.filter(g => !g.invited_at);

    return filtered;
  }
}
