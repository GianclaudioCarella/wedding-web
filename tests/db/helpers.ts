import { randomUUID } from 'node:crypto'
import { Client } from 'pg'

export const DATABASE_URL = process.env.DATABASE_URL
/** Set REQUIRE_DB_TESTS=1 (CI database job) to fail instead of skipping without a DB. */
export const describeDb = (() => {
  if (DATABASE_URL) return true
  if (process.env.REQUIRE_DB_TESTS) throw new Error('REQUIRE_DB_TESTS is set but DATABASE_URL is missing')
  return false
})()

export async function connect(): Promise<Client> {
  const client = new Client({ connectionString: DATABASE_URL })
  await client.connect()
  return client
}

export type Actor = { role: 'anon' } | { role: 'authenticated'; userId: string } | { role: 'service_role' }

export interface QueryOutcome {
  ok: boolean
  rows: Record<string, unknown>[]
  rowCount: number
  error?: string
  code?: string
}

/**
 * Runs `sql` as the given actor inside a savepoint of the caller's
 * transaction, always rolling back, so tests never leave changes behind.
 */
export async function as(client: Client, actor: Actor, sql: string, params: unknown[] = []): Promise<QueryOutcome> {
  await client.query('BEGIN')
  try {
    const sub = actor.role === 'authenticated' ? actor.userId : ''
    const claims = JSON.stringify(sub ? { sub, role: actor.role } : { role: actor.role })
    await client.query(
      `SELECT set_config('request.jwt.claims', $1, true), set_config('request.jwt.claim.sub', $2, true),
              set_config('request.jwt.claim.role', $3, true)`,
      [claims, sub, actor.role],
    )
    await client.query(`SET LOCAL ROLE ${actor.role}`)
    const res = await client.query(sql, params)
    return { ok: true, rows: res.rows, rowCount: res.rowCount ?? 0 }
  } catch (e) {
    const err = e as { message: string; code?: string }
    return { ok: false, rows: [], rowCount: 0, error: err.message, code: err.code }
  } finally {
    await client.query('ROLLBACK')
  }
}

export const TENANT_TABLES = [
  'guests', 'events', 'event_guests', 'guest_events', 'rsvp_responses', 'site_content',
  'faq_items', 'registry_items', 'external_accommodations', 'venue_rooms', 'guest_room_assignments',
  'guest_stay_requests', 'transport_options', 'guest_transport', 'seating_tables', 'seating_assignments',
  'planning_tasks', 'checklists', 'checklist_items', 'email_campaigns', 'chat_conversations',
  'chat_messages', 'chat_settings', 'documents', 'document_chunks', 'conversation_summaries',
  'api_logs', 'tokens_usage',
] as const

export const PUBLIC_CONTENT_TABLES = ['external_accommodations', 'faq_items', 'registry_items', 'site_content', 'transport_options']

export interface WeddingFixture {
  id: string
  ids: Record<string, string>
}

/** SQL creating one wedding with one row in every tenant table. */
export function weddingFixtureSql(w: WeddingFixture, authorId: string, slug: string, status = 'published'): string {
  const i = w.ids
  const q = (s: string) => `'${s}'`
  return `
    INSERT INTO public.weddings (id, slug, display_name, locales, status) VALUES (${q(w.id)}, ${q(slug)}, 'Test ${slug}', '{en,pt}', ${q(status)});
    INSERT INTO public.guests (id, wedding_id, name, language, invite_token) VALUES (${q(i.guests)}, ${q(w.id)}, 'Guest ${slug}', 'en', ${q('tok-' + i.guests)});
    INSERT INTO public.events (id, wedding_id, event_date, slug, name) VALUES (${q(i.events)}, ${q(w.id)}, '2027-01-01', 'party', '{"en":"Party"}');
    INSERT INTO public.event_guests (id, wedding_id, event_id, guest_id) VALUES (${q(i.event_guests)}, ${q(w.id)}, ${q(i.events)}, ${q(i.guests)});
    INSERT INTO public.guest_events (id, wedding_id, event_id, guest_id) VALUES (${q(i.guest_events)}, ${q(w.id)}, ${q(i.events)}, ${q(i.guests)});
    INSERT INTO public.rsvp_responses (id, wedding_id, event_id, guest_id, status) VALUES (${q(i.rsvp_responses)}, ${q(w.id)}, ${q(i.events)}, ${q(i.guests)}, 'attending');
    INSERT INTO public.site_content (id, wedding_id, key, value) VALUES (${q(i.site_content)}, ${q(w.id)}, 'hero', 'x');
    INSERT INTO public.faq_items (id, wedding_id, question) VALUES (${q(i.faq_items)}, ${q(w.id)}, '{"en":"Q"}');
    INSERT INTO public.registry_items (id, wedding_id, title) VALUES (${q(i.registry_items)}, ${q(w.id)}, 'Gift');
    INSERT INTO public.external_accommodations (id, wedding_id, name) VALUES (${q(i.external_accommodations)}, ${q(w.id)}, 'Hotel');
    INSERT INTO public.venue_rooms (id, wedding_id, name) VALUES (${q(i.venue_rooms)}, ${q(w.id)}, 'Room');
    INSERT INTO public.guest_room_assignments (id, wedding_id, room_id, guest_id) VALUES (${q(i.guest_room_assignments)}, ${q(w.id)}, ${q(i.venue_rooms)}, ${q(i.guests)});
    INSERT INTO public.guest_stay_requests (id, wedding_id, guest_id) VALUES (${q(i.guest_stay_requests)}, ${q(w.id)}, ${q(i.guests)});
    INSERT INTO public.transport_options (id, wedding_id, name) VALUES (${q(i.transport_options)}, ${q(w.id)}, 'Bus');
    INSERT INTO public.guest_transport (id, wedding_id, guest_id, transport_option_id) VALUES (${q(i.guest_transport)}, ${q(w.id)}, ${q(i.guests)}, ${q(i.transport_options)});
    INSERT INTO public.seating_tables (id, wedding_id, name) VALUES (${q(i.seating_tables)}, ${q(w.id)}, 'T1');
    INSERT INTO public.seating_assignments (id, wedding_id, table_id, side, position, guest_id) VALUES (${q(i.seating_assignments)}, ${q(w.id)}, ${q(i.seating_tables)}, 'A', 1, ${q(i.guests)});
    INSERT INTO public.planning_tasks (id, wedding_id, name, start_month, end_month, year) VALUES (${q(i.planning_tasks)}, ${q(w.id)}, 'Task', 1, 2, 2027);
    INSERT INTO public.checklists (id, wedding_id, name) VALUES (${q(i.checklists)}, ${q(w.id)}, 'List');
    INSERT INTO public.checklist_items (id, wedding_id, checklist_id, title) VALUES (${q(i.checklist_items)}, ${q(w.id)}, ${q(i.checklists)}, 'Item');
    INSERT INTO public.email_campaigns (id, wedding_id, subject, body) VALUES (${q(i.email_campaigns)}, ${q(w.id)}, 'S', 'B');
    INSERT INTO public.chat_conversations (id, wedding_id, user_id, title) VALUES (${q(i.chat_conversations)}, ${q(w.id)}, ${q(authorId)}, 'Chat');
    INSERT INTO public.chat_messages (id, wedding_id, conversation_id, role, content) VALUES (${q(i.chat_messages)}, ${q(w.id)}, ${q(i.chat_conversations)}, 'user', 'hi');
    INSERT INTO public.chat_settings (id, wedding_id, setting_key, setting_value) VALUES (${q(i.chat_settings)}, ${q(w.id)}, 'system_message', 'x');
    INSERT INTO public.documents (id, wedding_id, filename, file_type, file_size, uploaded_by, status) VALUES (${q(i.documents)}, ${q(w.id)}, 'doc.txt', 'text/plain', 1, ${q(authorId)}, 'completed');
    INSERT INTO public.document_chunks (id, wedding_id, document_id, chunk_index, content, embedding) VALUES (${q(i.document_chunks)}, ${q(w.id)}, ${q(i.documents)}, 0, 'secret ${slug}', array_fill(0.1::real, ARRAY[1536])::public.vector);
    INSERT INTO public.conversation_summaries (id, wedding_id, conversation_id, user_id, summary, message_count) VALUES (${q(i.conversation_summaries)}, ${q(w.id)}, ${q(i.chat_conversations)}, ${q(authorId)}, 'sum', 1);
    INSERT INTO public.api_logs (id, wedding_id, api_name, user_id) VALUES (${q(i.api_logs)}, ${q(w.id)}, 'tavily', ${q(authorId)});
    INSERT INTO public.tokens_usage (id, wedding_id, model, provider, user_id) VALUES (${q(i.tokens_usage)}, ${q(w.id)}, 'm', 'p', ${q(authorId)});
  `
}

export function newWedding(): WeddingFixture {
  return { id: randomUUID(), ids: Object.fromEntries(TENANT_TABLES.map((t) => [t, randomUUID()])) }
}
