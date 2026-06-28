# Database Setup

This project uses [Supabase](https://supabase.com) as its database (PostgreSQL + Auth + Storage).

## First-time Setup

### 1. Create a Supabase project

Go to [supabase.com](https://supabase.com), create a new project, and note your **Project URL** and **anon key** — you'll need them in `.env.local`.

### 2. Run the migrations

Open the **SQL Editor** in your Supabase dashboard and run the files in the `database/` folder **in numerical order**:

| File | What it creates |
|------|-----------------|
| `01_create_guests_table.sql` | `guests` table — core guest list and RSVP data |
| `02_create_events_tables.sql` | `events` and `event_guests` tables |
| `03_create_chat_tables.sql` | `chat_conversations` and `chat_messages` tables |
| `04_create_documents_tables.sql` | `documents` and `document_chunks` tables (enables pgvector) |
| `05_create_memory_tables.sql` | `conversation_summaries` table |
| `06_create_tavily_cache_table.sql` | `tavily_cache` table — caches web search results |
| `07_create_user_settings_table.sql` | `user_settings` table — stores per-user API keys and preferences |
| `08_setup_metrics_supabase.sql` | Metrics/logging tables for API monitoring |
| `09_add_guest_tags.sql` | Adds `tags` column to guests |
| `10_add_spanish_language.sql` | Adds Spanish as a supported guest language |
| `11_fix_events_policies.sql` | RLS policies for events |
| `11_fix_rsvp_links.sql` | Fixes RSVP link generation on guests |
| `12_create_planning_tasks_table.sql` | `planning_tasks` table |
| `13_add_pinterest_board_url.sql` | Adds Pinterest field to user_settings |
| `14_fix_event_guests_policies.sql` | RLS policies for event_guests |
| `15_create_wedding_management_tables.sql` | Additional management tables (venue rooms, accommodations, FAQs, etc.) |
| `16_fix_guests_policies.sql` | RLS policies for guests |
| `17_add_missing_columns_to_guests.sql` | Adds invite_token, party_role, party_leader_id, invited_at |
| `18_add_missing_columns_to_events.sql` | Adds event_time, sort_order |
| `20_remove_total_guests_column.sql` | Removes old total_guests column (replaced by party system) |
| `21_generate_missing_invite_tokens.sql` | Generates invite tokens for guests that don't have one |
| `22_add_directions_url_and_seed_hotels.sql` | Adds directions URL + seeds hotel data |
| `23_add_event_slug.sql` | Adds slug column to events |
| `24_seed_faqs.sql` | Seeds FAQ content |
| `25_convert_faq_to_jsonb.sql` | Converts FAQ fields to JSONB for multilanguage support |
| `26_convert_accommodations_to_jsonb.sql` | Converts accommodation descriptions to JSONB |
| `27_convert_events_to_jsonb.sql` | Converts event name/description to JSONB |
| `28_change_hotel_stay_nights.sql` | Renames thursday_night → sunday_night in guest_stay_requests |

All scripts use `IF NOT EXISTS` / `IF EXISTS` guards and are safe to re-run.

### 3. Configure environment variables

```bash
NEXT_PUBLIC_SUPABASE_URL=https://<your-project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
```

For admin operations (e.g. sending invitations server-side), also add the service role key — **never expose this on the client**:

```bash
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>
```

## Applying new migrations

When a new migration file is added, just run it in the Supabase SQL Editor. No special tooling needed — the numbered prefix keeps the order clear.

## Notes

- **Authentication**: handled by Supabase Auth. Admin pages require a logged-in user.
- **Row Level Security (RLS)**: enabled on all tables. Policies are included in the migration files.
- **pgvector**: enabled automatically by `04_create_documents_tables.sql` — required for the RAG document search system (see `docs/RAG_README.md`).
- **Seeds**: files `22`, `24` insert data (hotels and FAQs). They are safe to re-run but will overwrite existing seed data.
