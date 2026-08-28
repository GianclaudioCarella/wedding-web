import { SupabaseClient } from '@supabase/supabase-js';

export class WeddingTools {
  constructor(private supabase: SupabaseClient) {}

  async getTransportOverview(): Promise<string> {
    try {
      const { data: options } = await this.supabase
        .from('transport_options')
        .select('id, name, direction, departure_location, departure_time, return_time, capacity, notes')
        .eq('is_active', true)
        .order('sort_order');

      if (!options?.length) return 'No transport options configured.';

      const { data: assignments } = await this.supabase
        .from('guest_transport')
        .select('transport_option_id, guest:guests(name)');

      const countByOption: Record<string, string[]> = {};
      for (const a of assignments || []) {
        if (!countByOption[a.transport_option_id]) countByOption[a.transport_option_id] = [];
        const guest = a.guest as any;
        if (guest?.name) countByOption[a.transport_option_id].push(guest.name);
      }

      const lines = options.map(o => {
        const guests = countByOption[o.id] || [];
        const cap = o.capacity ? `${guests.length}/${o.capacity} guests` : `${guests.length} guests`;
        const time = o.departure_time ? ` · Departure: ${o.departure_time}` : '';
        const ret = o.return_time ? ` · Return: ${o.return_time}` : '';
        const guestList = guests.length ? `\n   Guests: ${guests.join(', ')}` : '\n   No guests assigned yet';
        return `• ${o.name} (${o.direction.replace('_', ' ')}) — ${cap}${time}${ret}${o.departure_location ? ` · From: ${o.departure_location}` : ''}${guestList}`;
      });

      return `TRANSPORT OPTIONS:\n\n${lines.join('\n\n')}`;
    } catch (e: any) {
      return `Error fetching transport data: ${e.message}`;
    }
  }

  async getAccommodationOverview(): Promise<string> {
    try {
      const parts: string[] = [];

      // Venue rooms
      const { data: rooms } = await this.supabase
        .from('venue_rooms')
        .select('id, name, room_type, capacity, floor, notes');

      const { data: assignments } = await this.supabase
        .from('guest_room_assignments')
        .select('room_id, bed_label, guest:guests(name)');

      if (rooms?.length) {
        const byRoom: Record<string, { bed?: string; name: string }[]> = {};
        for (const a of assignments || []) {
          if (!byRoom[a.room_id]) byRoom[a.room_id] = [];
          const guest = a.guest as any;
          if (guest?.name) byRoom[a.room_id].push({ bed: a.bed_label, name: guest.name });
        }
        const roomLines = rooms.map(r => {
          const guests = byRoom[r.id] || [];
          const occupancy = `${guests.length}/${r.capacity ?? '?'} beds`;
          const guestList = guests.length
            ? guests.map(g => g.bed ? `${g.name} (${g.bed})` : g.name).join(', ')
            : 'Empty';
          return `  • ${r.name} (${r.room_type}${r.floor ? `, floor ${r.floor}` : ''}) — ${occupancy}: ${guestList}`;
        });
        parts.push(`VENUE ROOMS:\n${roomLines.join('\n')}`);
      }

      // Stay requests
      const { data: stays } = await this.supabase
        .from('guest_stay_requests')
        .select('thursday_night, friday_night, saturday_night, guest:guests(name)');

      if (stays?.length) {
        const thu = stays.filter(s => s.thursday_night).map(s => (s.guest as any)?.name).filter(Boolean);
        const fri = stays.filter(s => s.friday_night).map(s => (s.guest as any)?.name).filter(Boolean);
        const sat = stays.filter(s => s.saturday_night).map(s => (s.guest as any)?.name).filter(Boolean);
        parts.push(
          `STAY REQUESTS:\n  • Thursday night (${thu.length}): ${thu.join(', ') || 'none'}\n  • Friday night (${fri.length}): ${fri.join(', ') || 'none'}\n  • Saturday night (${sat.length}): ${sat.join(', ') || 'none'}`
        );
      }

      // External accommodations
      const { data: external } = await this.supabase
        .from('external_accommodations')
        .select('name, description, price_range, distance_from_venue')
        .eq('is_active', true)
        .order('sort_order');

      if (external?.length) {
        const extLines = external.map(e => `  • ${e.name}${e.price_range ? ` (${e.price_range})` : ''}${e.distance_from_venue ? ` — ${e.distance_from_venue} from venue` : ''}`);
        parts.push(`EXTERNAL ACCOMMODATIONS:\n${extLines.join('\n')}`);
      }

      return parts.length ? parts.join('\n\n') : 'No accommodation data available.';
    } catch (e: any) {
      return `Error fetching accommodation data: ${e.message}`;
    }
  }

  async getPlanningTasks(filter: 'all' | 'pending' | 'done' = 'all'): Promise<string> {
    try {
      let query = this.supabase
        .from('planning_tasks')
        .select('name, description, start_month, end_month, year, status')
        .order('year')
        .order('start_month');

      if (filter !== 'all') query = query.eq('status', filter);

      const { data } = await query;
      if (!data?.length) return `No planning tasks found${filter !== 'all' ? ` with status "${filter}"` : ''}.`;

      const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
      const lines = data.map(t => {
        const range = t.start_month === t.end_month
          ? `${months[t.start_month - 1]} ${t.year}`
          : `${months[t.start_month - 1]}–${months[t.end_month - 1]} ${t.year}`;
        const status = t.status === 'done' ? '✓' : '○';
        return `  ${status} [${range}] ${t.name}${t.description ? ` — ${t.description}` : ''}`;
      });

      const done = data.filter(t => t.status === 'done').length;
      const total = data.length;
      return `PLANNING TASKS (${done}/${total} done):\n\n${lines.join('\n')}`;
    } catch (e: any) {
      return `Error fetching planning tasks: ${e.message}`;
    }
  }

  async getCommunicationsHistory(limit = 10): Promise<string> {
    try {
      const { data } = await this.supabase
        .from('email_campaigns')
        .select('subject, recipient_filter, recipient_count, failed_count, sent_at')
        .order('sent_at', { ascending: false })
        .limit(limit);

      if (!data?.length) return 'No email campaigns sent yet.';

      const lines = data.map(c => {
        const date = new Date(c.sent_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
        const failed = c.failed_count > 0 ? ` (${c.failed_count} failed)` : '';
        return `  • [${date}] "${c.subject}" → ${c.recipient_count} recipients (filter: ${c.recipient_filter})${failed}`;
      });

      return `COMMUNICATIONS HISTORY (last ${data.length}):\n\n${lines.join('\n')}`;
    } catch (e: any) {
      return `Error fetching communications history: ${e.message}`;
    }
  }

  async getGuestEmailStatus(): Promise<string> {
    try {
      const { data: guests, error } = await this.supabase
        .from('guests')
        .select('name, email, attending, invited_at')
        .order('name');

      if (error) throw error;
      if (!guests?.length) return 'No guests found.';

      const withEmail    = guests.filter(g => g.email);
      const withoutEmail = guests.filter(g => !g.email);
      const sent         = withEmail.filter(g => !!g.invited_at);
      const notSent      = withEmail.filter(g => !g.invited_at);

      const sentLines = sent.map(g => `  • ${g.name} <${g.email}>${g.invited_at ? ` — sent ${new Date(g.invited_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}` : ''}`);
      const notSentLines = notSent.map(g => `  • ${g.name} <${g.email}>`);
      const noEmailLines = withoutEmail.map(g => `  • ${g.name}`);

      const parts = [
        `EMAIL STATUS SUMMARY:`,
        `  Total guests: ${guests.length}`,
        `  With email: ${withEmail.length} | Without email: ${withoutEmail.length}`,
        `  Save the date sent: ${sent.length} | Not yet sent (but have email): ${notSent.length}`,
      ];

      if (sent.length) parts.push(`\nSAVE THE DATE SENT (${sent.length}):\n${sentLines.join('\n')}`);
      if (notSent.length) parts.push(`\nHAVE EMAIL — NOT YET SENT (${notSent.length}):\n${notSentLines.join('\n')}`);
      if (noEmailLines.length) parts.push(`\nNO EMAIL REGISTERED (${withoutEmail.length}):\n${noEmailLines.join('\n')}`);

      return parts.join('\n');
    } catch (e: any) {
      return `Error fetching guest email status: ${e.message}`;
    }
  }

  async getRsvpDetails(): Promise<string> {
    try {
      const { data: events } = await this.supabase
        .from('events')
        .select('id, name');

      if (!events?.length) return 'No events found.';

      const { data: responses } = await this.supabase
        .from('rsvp_responses')
        .select('event_id, status, dietary_requirements, dietary_notes, guest:guests(name)');

      const parts = events.map(ev => {
        const evResponses = (responses || []).filter(r => r.event_id === ev.id);
        const confirmed = evResponses.filter(r => r.status === 'attending');
        const declined = evResponses.filter(r => r.status === 'declined');
        const pending = evResponses.filter(r => r.status === 'pending');

        const dietary = evResponses
          .filter(r => r.dietary_requirements?.length || r.dietary_notes)
          .map(r => {
            const guest = (r.guest as any)?.name || 'Unknown';
            const reqs = [
              ...(r.dietary_requirements || []),
              ...(r.dietary_notes ? [r.dietary_notes] : []),
            ].join(', ');
            return `    - ${guest}: ${reqs}`;
          });

        const evName = typeof ev.name === 'object' ? (ev.name as any)?.en || (ev.name as any)?.pt || ev.id : ev.name;
        return [
          `${evName}:`,
          `  Confirmed: ${confirmed.length} | Declined: ${declined.length} | Pending: ${pending.length}`,
          ...(dietary.length ? [`  Dietary requirements:\n${dietary.join('\n')}`] : []),
        ].join('\n');
      });

      return `RSVP DETAILS BY EVENT:\n\n${parts.join('\n\n')}`;
    } catch (e: any) {
      return `Error fetching RSVP details: ${e.message}`;
    }
  }
}
