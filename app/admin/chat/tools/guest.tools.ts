// Guest management tools

import { SupabaseClient } from '@supabase/supabase-js';

export class GuestTools {
  constructor(private supabase: SupabaseClient) {}

  /**
   * Get statistics about wedding guests
   */
  async getGuestStatistics() {
    const { data: guests, error } = await this.supabase
      .from('guests')
      .select('*');
    
    if (error) throw error;

    const stats = {
      total_guests: guests?.length || 0,
      total_people: guests?.reduce((sum, g) => sum + (g.total_guests || 1), 0) || 0,
      confirmed: guests?.filter(g => g.attending === 'yes').length || 0,
      confirmed_people: guests?.filter(g => g.attending === 'yes').reduce((sum, g) => sum + (g.total_guests || 1), 0) || 0,
      declined: guests?.filter(g => g.attending === 'no').length || 0,
      maybe: guests?.filter(g => g.attending === 'perhaps').length || 0,
      no_response: guests?.filter(g => !g.attending).length || 0,
      invites_sent: guests?.filter(g => g.save_the_date_sent === true).length || 0,
      invites_pending: guests?.filter(g => g.save_the_date_sent !== true).length || 0,
    };

    return stats;
  }

  /**
   * List all guests or filter by status
   */
  async listGuests(filter?: string) {
    const { data: guests, error } = await this.supabase
      .from('guests')
      .select('id, name, email, phone, language, total_guests, attending, save_the_date_sent')
      .order('name');
    
    if (error) throw error;

    let filtered = guests || [];
    if (filter === 'confirmed') filtered = filtered.filter(g => g.attending === 'yes');
    if (filter === 'declined') filtered = filtered.filter(g => g.attending === 'no');
    if (filter === 'maybe') filtered = filtered.filter(g => g.attending === 'perhaps');
    if (filter === 'no_response') filtered = filtered.filter(g => !g.attending);
    if (filter === 'sent') filtered = filtered.filter(g => g.save_the_date_sent === true);
    if (filter === 'pending') filtered = filtered.filter(g => g.save_the_date_sent !== true);

    return filtered;
  }
}
