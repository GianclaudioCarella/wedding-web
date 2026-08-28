// Write/action tools — let the chat actually change data, not just report on it.
// Every method here resolves human-readable names to rows first, and returns a
// plain { success, message } or { error } object rather than throwing, so the
// LLM can relay the outcome (or ask the user to disambiguate) directly.

import { SupabaseClient } from '@supabase/supabase-js';

type Resolved<T> = { row: T } | { error: string };

function isError<T>(r: Resolved<T>): r is { error: string } {
  return (r as any).error !== undefined;
}

export class ActionTools {
  constructor(private supabase: SupabaseClient) {}

  // ── Resolvers ──────────────────────────────────────────────────────────

  private async resolveGuest(name: string): Promise<Resolved<{ id: string; name: string }>> {
    const { data, error } = await this.supabase.from('guests').select('id, name').ilike('name', `%${name}%`);
    if (error) return { error: error.message };
    if (!data || data.length === 0) return { error: `No guest found matching "${name}".` };
    if (data.length > 1) {
      const exact = data.filter(g => g.name.toLowerCase() === name.toLowerCase());
      if (exact.length === 1) return { row: exact[0] };
      return { error: `Multiple guests match "${name}": ${data.map(g => g.name).join(', ')}. Ask which one they mean.` };
    }
    return { row: data[0] };
  }

  private async resolveEvent(name: string): Promise<Resolved<{ id: string; name: any; slug: string | null }>> {
    const { data, error } = await this.supabase.from('events').select('id, name, slug');
    if (error) return { error: error.message };
    const q = name.toLowerCase();
    const matches = (data || []).filter(e => {
      const en = (e.name as any)?.en?.toLowerCase() || '';
      const pt = (e.name as any)?.pt?.toLowerCase() || '';
      const es = (e.name as any)?.es?.toLowerCase() || '';
      const slug = (e.slug || '').toLowerCase();
      return en.includes(q) || pt.includes(q) || es.includes(q) || slug.includes(q);
    });
    if (matches.length === 0) return { error: `No event found matching "${name}".` };
    if (matches.length > 1) {
      return { error: `Multiple events match "${name}": ${matches.map(e => (e.name as any)?.en || e.slug).join(', ')}. Ask which one they mean.` };
    }
    return { row: matches[0] };
  }

  private async resolveTransportOption(name: string): Promise<Resolved<{ id: string; name: string }>> {
    const { data, error } = await this.supabase.from('transport_options').select('id, name').ilike('name', `%${name}%`);
    if (error) return { error: error.message };
    if (!data || data.length === 0) return { error: `No transport option found matching "${name}".` };
    if (data.length > 1) return { error: `Multiple transport options match "${name}": ${data.map(o => o.name).join(', ')}. Ask which one they mean.` };
    return { row: data[0] };
  }

  private async resolveRoom(name: string): Promise<Resolved<{ id: string; name: string; capacity: number | null }>> {
    const { data, error } = await this.supabase.from('venue_rooms').select('id, name, capacity').ilike('name', `%${name}%`);
    if (error) return { error: error.message };
    if (!data || data.length === 0) return { error: `No room found matching "${name}".` };
    if (data.length > 1) return { error: `Multiple rooms match "${name}": ${data.map(r => r.name).join(', ')}. Ask which one they mean.` };
    return { row: data[0] };
  }

  private async resolveSeatingTable(name: string): Promise<Resolved<{ id: string; name: string; seats_per_side: number }>> {
    const { data, error } = await this.supabase.from('seating_tables').select('id, name, seats_per_side').ilike('name', `%${name}%`);
    if (error) return { error: error.message };
    if (!data || data.length === 0) return { error: `No seating table found matching "${name}".` };
    if (data.length > 1) return { error: `Multiple seating tables match "${name}": ${data.map(t => t.name).join(', ')}. Ask which one they mean.` };
    return { row: data[0] };
  }

  private async resolvePlanningTask(name: string): Promise<Resolved<{ id: string; name: string }>> {
    const { data, error } = await this.supabase.from('planning_tasks').select('id, name').ilike('name', `%${name}%`);
    if (error) return { error: error.message };
    if (!data || data.length === 0) return { error: `No planning task found matching "${name}".` };
    if (data.length > 1) return { error: `Multiple planning tasks match "${name}": ${data.map(t => t.name).join(', ')}. Ask which one they mean.` };
    return { row: data[0] };
  }

  // ── Guests ─────────────────────────────────────────────────────────────

  async createGuest(args: { name: string; email?: string; phone?: string; language?: string; tags?: string[]; party_role?: string; party_leader_name?: string; event_names?: string[] }) {
    try {
      let party_leader_id: string | null = null;
      if (args.party_leader_name) {
        const leader = await this.resolveGuest(args.party_leader_name);
        if (isError(leader)) return leader;
        party_leader_id = leader.row.id;
      }

      const { data: events } = await this.supabase.from('events').select('id, name, slug').order('sort_order');
      let eventIds: string[] = [];
      if (args.event_names?.length) {
        for (const en of args.event_names) {
          const ev = await this.resolveEvent(en);
          if (isError(ev)) return ev;
          eventIds.push(ev.row.id);
        }
      } else {
        const ceremony = (events || []).find(e => e.slug === 'wedding') || (events || []).find(e => ((e.name as any)?.en || '').toLowerCase().includes('wedding')) || (events || [])[0];
        if (ceremony) eventIds = [ceremony.id];
      }

      const { data: newGuest, error } = await this.supabase.from('guests').insert({
        name: args.name,
        email: args.email || null,
        phone: args.phone || null,
        language: args.language || 'en',
        tags: args.tags && args.tags.length > 0 ? args.tags : null,
        party_role: args.party_role || 'primary',
        party_leader_id,
        invite_token: crypto.randomUUID(),
      }).select('id').single();

      if (error) return { error: error.message };
      if (eventIds.length > 0) {
        await this.supabase.from('guest_events').insert(eventIds.map(eid => ({ guest_id: newGuest.id, event_id: eid })));
      }

      return { success: true, message: `Created guest "${args.name}"${eventIds.length ? ` and invited them to ${eventIds.length} event(s)` : ''}.` };
    } catch (e: any) {
      return { error: e.message };
    }
  }

  async updateGuest(args: { guest_name: string; email?: string; phone?: string; notes?: string; tags?: string[]; attending?: string; transport_needed?: boolean; transport_from?: string; transport_return?: boolean }) {
    const guest = await this.resolveGuest(args.guest_name);
    if (isError(guest)) return guest;

    const patch: Record<string, unknown> = {};
    if (args.email !== undefined) patch.email = args.email || null;
    if (args.phone !== undefined) patch.phone = args.phone || null;
    if (args.notes !== undefined) patch.notes = args.notes || null;
    if (args.tags !== undefined) patch.tags = args.tags.length > 0 ? args.tags : null;
    if (args.attending !== undefined) patch.attending = args.attending || null;
    if (args.transport_needed !== undefined) {
      patch.transport_needed = args.transport_needed;
      patch.transport_from = args.transport_needed ? (args.transport_from || null) : null;
      patch.transport_return = args.transport_needed ? (args.transport_return ?? null) : null;
    }

    if (Object.keys(patch).length === 0) return { error: 'Nothing to update — no fields were provided.' };

    const { error } = await this.supabase.from('guests').update(patch).eq('id', guest.row.id);
    if (error) return { error: error.message };
    return { success: true, message: `Updated ${guest.row.name}.` };
  }

  async updateRsvpStatus(args: { guest_name: string; event_name: string; status: 'attending' | 'declined' | 'pending' }) {
    const guest = await this.resolveGuest(args.guest_name);
    if (isError(guest)) return guest;
    const event = await this.resolveEvent(args.event_name);
    if (isError(event)) return event;

    const response = await fetch('/api/admin/update-rsvp-status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ guest_id: guest.row.id, statuses: { [event.row.id]: args.status } }),
    });
    if (!response.ok) return { error: 'Failed to update RSVP status.' };
    return { success: true, message: `Marked ${guest.row.name} as ${args.status} for ${(event.row.name as any)?.en || event.row.slug}.` };
  }

  async markGuestNotAttending(args: { guest_name: string }) {
    const guest = await this.resolveGuest(args.guest_name);
    if (isError(guest)) return guest;

    const response = await fetch('/api/mark-not-attending', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ guest_id: guest.row.id }),
    });
    if (!response.ok) return { error: 'Failed to mark guest as not attending.' };
    return { success: true, message: `Marked ${guest.row.name} (and their party) as not attending all events.` };
  }

  // ── Transport ──────────────────────────────────────────────────────────

  async createTransportOption(args: { name: string; direction: 'to_venue' | 'from_venue' | 'both'; departure_location?: string; departure_time?: string; return_time?: string; capacity?: number; notes?: string }) {
    const { error } = await this.supabase.from('transport_options').insert({
      name: args.name,
      direction: args.direction,
      departure_location: args.departure_location || null,
      departure_time: args.departure_time || null,
      return_time: args.return_time || null,
      capacity: args.capacity ?? null,
      notes: args.notes || null,
    });
    if (error) return { error: error.message };
    return { success: true, message: `Created transport option "${args.name}".` };
  }

  async assignGuestToTransport(args: { guest_name: string; option_name: string }) {
    const guest = await this.resolveGuest(args.guest_name);
    if (isError(guest)) return guest;
    const option = await this.resolveTransportOption(args.option_name);
    if (isError(option)) return option;

    const { data: existing } = await this.supabase.from('guest_transport').select('id').eq('guest_id', guest.row.id).eq('transport_option_id', option.row.id).maybeSingle();
    if (existing) return { success: true, message: `${guest.row.name} is already on "${option.row.name}".` };

    const { error } = await this.supabase.from('guest_transport').insert({ transport_option_id: option.row.id, guest_id: guest.row.id });
    if (error) return { error: error.message };
    return { success: true, message: `Added ${guest.row.name} to "${option.row.name}".` };
  }

  // ── Accommodation & seating ────────────────────────────────────────────

  async createRoom(args: { name: string; room_type?: string; capacity?: number; floor?: string; notes?: string }) {
    const { error } = await this.supabase.from('venue_rooms').insert({
      name: args.name,
      room_type: args.room_type || 'private',
      capacity: args.capacity ?? 2,
      floor: args.floor || null,
      notes: args.notes || null,
    });
    if (error) return { error: error.message };
    return { success: true, message: `Created room "${args.name}".` };
  }

  async assignGuestToRoom(args: { guest_name: string; room_name: string; bed_label?: string }) {
    const guest = await this.resolveGuest(args.guest_name);
    if (isError(guest)) return guest;
    const room = await this.resolveRoom(args.room_name);
    if (isError(room)) return room;

    await this.supabase.from('guest_room_assignments').delete().eq('guest_id', guest.row.id);
    const { error } = await this.supabase.from('guest_room_assignments').insert({ room_id: room.row.id, guest_id: guest.row.id, bed_label: args.bed_label || null });
    if (error) return { error: error.message };
    return { success: true, message: `Assigned ${guest.row.name} to room "${room.row.name}".` };
  }

  async createSeatingTable(args: { name: string; seats_per_side: number }) {
    const { count } = await this.supabase.from('seating_tables').select('id', { count: 'exact', head: true });
    const { error } = await this.supabase.from('seating_tables').insert({ name: args.name, seats_per_side: args.seats_per_side, sort_order: count || 0 });
    if (error) return { error: error.message };
    return { success: true, message: `Created seating table "${args.name}" with ${args.seats_per_side} seats per side.` };
  }

  async assignGuestToSeat(args: { guest_name: string; table_name: string; side: 'A' | 'B'; position: number }) {
    const guest = await this.resolveGuest(args.guest_name);
    if (isError(guest)) return guest;
    const table = await this.resolveSeatingTable(args.table_name);
    if (isError(table)) return table;

    if (args.position < 1 || args.position > table.row.seats_per_side) {
      return { error: `"${table.row.name}" only has ${table.row.seats_per_side} seats per side — ${args.position} is out of range.` };
    }

    const { data: occupant } = await this.supabase
      .from('seating_assignments')
      .select('id, guest:guests(name)')
      .eq('table_id', table.row.id).eq('side', args.side).eq('position', args.position)
      .maybeSingle();
    if (occupant) {
      return { error: `Seat ${args.side}${args.position} at "${table.row.name}" is already taken by ${(occupant.guest as any)?.name || 'someone else'}. Free that seat first or pick another one.` };
    }

    await this.supabase.from('seating_assignments').delete().eq('guest_id', guest.row.id);
    const { error } = await this.supabase.from('seating_assignments').insert({ table_id: table.row.id, side: args.side, position: args.position, guest_id: guest.row.id });
    if (error) return { error: error.message };
    return { success: true, message: `Seated ${guest.row.name} at "${table.row.name}", seat ${args.side}${args.position}.` };
  }

  // ── Planning ───────────────────────────────────────────────────────────

  async createPlanningTask(args: { name: string; start_month: number; end_month: number; year: number; description?: string }) {
    const { error } = await this.supabase.from('planning_tasks').insert({
      name: args.name,
      description: args.description || null,
      start_month: args.start_month,
      end_month: args.end_month,
      year: args.year,
    });
    if (error) return { error: error.message };
    return { success: true, message: `Created planning task "${args.name}".` };
  }

  async updatePlanningTaskStatus(args: { task_name: string; status: 'pending' | 'done' }) {
    const task = await this.resolvePlanningTask(args.task_name);
    if (isError(task)) return task;
    const { error } = await this.supabase.from('planning_tasks').update({ status: args.status }).eq('id', task.row.id);
    if (error) return { error: error.message };
    return { success: true, message: `Marked "${task.row.name}" as ${args.status}.` };
  }
}
