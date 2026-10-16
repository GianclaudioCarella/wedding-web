-- =============================================================================
-- Phase 1.2 — Tenant key on every tenant table, existing data as tenant #1.
-- See docs/multi-wedding/PLAN.md §2.3 and docs/multi-wedding/PHASE1-ROLLOUT.md.
--
-- * Tenant #1 (the existing wedding) gets the fixed id
--   00000000-0000-0000-0000-000000000001; every existing row is assigned to it.
-- * wedding_id has NO default: the data layer always passes it explicitly, so
--   a missing value fails loudly instead of landing in the wrong tenant.
-- * Child tables carry a denormalised wedding_id kept consistent by composite
--   foreign keys, so a row can never link to a parent of another wedding.
-- * tavily_cache (global cache, no personal data) and user_settings (per user)
--   stay global.
-- * Owners are NOT hardcoded here. They are assigned by e-mail at rollout time
--   (see 20261016120300_tenant1_owners.sql and the rollout runbook).
-- =============================================================================

-- Tenant #1. Identity only; per-wedding content stays in the existing tables.
-- status = 'published' keeps today's public site behaviour (anon can read the
-- active FAQ/registry/accommodation rows) until Phase 2 routing exists.
INSERT INTO public.weddings (id, slug, display_name, partner_names, default_locale, locales, status)
VALUES ('00000000-0000-0000-0000-000000000001', 'giancat', 'Gian & Cat', '{Gian,Cat}', 'en', '{en,pt,es}', 'published')
ON CONFLICT (id) DO NOTHING;

-- -----------------------------------------------------------------------------
-- 1. Add, backfill and require wedding_id; index it.
-- -----------------------------------------------------------------------------
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'guests', 'events', 'event_guests', 'guest_events', 'rsvp_responses', 'site_content',
    'faq_items', 'registry_items', 'external_accommodations', 'venue_rooms', 'guest_room_assignments',
    'guest_stay_requests', 'transport_options', 'guest_transport', 'seating_tables', 'seating_assignments',
    'planning_tasks', 'checklists', 'checklist_items', 'email_campaigns', 'chat_conversations',
    'chat_messages', 'chat_settings', 'documents', 'document_chunks', 'conversation_summaries',
    'api_logs', 'tokens_usage'
  ]
  LOOP
    EXECUTE format('ALTER TABLE public.%I ADD COLUMN wedding_id uuid', t);
    EXECUTE format('UPDATE public.%I SET wedding_id = %L', t, '00000000-0000-0000-0000-000000000001');
    EXECUTE format('ALTER TABLE public.%I ALTER COLUMN wedding_id SET NOT NULL', t);
    EXECUTE format(
      'ALTER TABLE public.%I ADD CONSTRAINT %I FOREIGN KEY (wedding_id) REFERENCES public.weddings(id) ON DELETE CASCADE',
      t, t || '_wedding_id_fkey');
    EXECUTE format('CREATE INDEX %I ON public.%I (wedding_id)', t || '_wedding_id_idx', t);
  END LOOP;
END $$;

-- -----------------------------------------------------------------------------
-- 2. Composite keys: parents expose (id, wedding_id); children reference it.
-- -----------------------------------------------------------------------------
ALTER TABLE public.guests             ADD CONSTRAINT guests_id_wedding_id_key             UNIQUE (id, wedding_id);
ALTER TABLE public.events             ADD CONSTRAINT events_id_wedding_id_key             UNIQUE (id, wedding_id);
ALTER TABLE public.venue_rooms        ADD CONSTRAINT venue_rooms_id_wedding_id_key        UNIQUE (id, wedding_id);
ALTER TABLE public.transport_options  ADD CONSTRAINT transport_options_id_wedding_id_key  UNIQUE (id, wedding_id);
ALTER TABLE public.seating_tables     ADD CONSTRAINT seating_tables_id_wedding_id_key     UNIQUE (id, wedding_id);
ALTER TABLE public.checklists         ADD CONSTRAINT checklists_id_wedding_id_key         UNIQUE (id, wedding_id);
ALTER TABLE public.chat_conversations ADD CONSTRAINT chat_conversations_id_wedding_id_key UNIQUE (id, wedding_id);
ALTER TABLE public.documents          ADD CONSTRAINT documents_id_wedding_id_key          UNIQUE (id, wedding_id);

-- Replace each single-column FK with a composite one (same name, same ON DELETE).
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN SELECT * FROM (VALUES
    ('event_guests',           'event_id',            'events'),
    ('event_guests',           'guest_id',            'guests'),
    ('guest_events',           'event_id',            'events'),
    ('guest_events',           'guest_id',            'guests'),
    ('rsvp_responses',         'event_id',            'events'),
    ('rsvp_responses',         'guest_id',            'guests'),
    ('guest_room_assignments', 'guest_id',            'guests'),
    ('guest_room_assignments', 'room_id',             'venue_rooms'),
    ('guest_stay_requests',    'guest_id',            'guests'),
    ('guest_transport',        'guest_id',            'guests'),
    ('guest_transport',        'transport_option_id', 'transport_options'),
    ('seating_assignments',    'guest_id',            'guests'),
    ('seating_assignments',    'table_id',            'seating_tables'),
    ('checklist_items',        'checklist_id',        'checklists'),
    ('chat_messages',          'conversation_id',     'chat_conversations'),
    ('conversation_summaries', 'conversation_id',     'chat_conversations'),
    ('document_chunks',        'document_id',         'documents')
  ) AS v(child, col, parent)
  LOOP
    EXECUTE format('ALTER TABLE public.%I DROP CONSTRAINT %I', r.child, r.child || '_' || r.col || '_fkey');
    EXECUTE format(
      'ALTER TABLE public.%I ADD CONSTRAINT %I FOREIGN KEY (%I, wedding_id) REFERENCES public.%I(id, wedding_id) ON DELETE CASCADE',
      r.child, r.child || '_' || r.col || '_fkey', r.col, r.parent);
  END LOOP;
END $$;

-- -----------------------------------------------------------------------------
-- 3. Uniqueness becomes per tenant.
-- -----------------------------------------------------------------------------
ALTER TABLE public.site_content DROP CONSTRAINT site_content_key_key;
ALTER TABLE public.site_content ADD CONSTRAINT site_content_wedding_id_key_key UNIQUE (wedding_id, key);

ALTER TABLE public.chat_settings DROP CONSTRAINT chat_settings_setting_key_key;
ALTER TABLE public.chat_settings ADD CONSTRAINT chat_settings_wedding_id_setting_key_key UNIQUE (wedding_id, setting_key);

ALTER TABLE public.external_accommodations DROP CONSTRAINT external_accommodations_name_unique;
ALTER TABLE public.external_accommodations ADD CONSTRAINT external_accommodations_wedding_id_name_key UNIQUE (wedding_id, name);

-- Event slugs were never unique; they become unique per wedding (NULLs allowed).
-- Pre-flight check for duplicates is in the rollout runbook.
CREATE UNIQUE INDEX events_wedding_id_slug_key ON public.events (wedding_id, slug);

-- guests_invite_token_key stays GLOBAL on purpose: the token alone identifies
-- the guest (and therefore the wedding) on public routes.

-- -----------------------------------------------------------------------------
-- 4. Remove schema hardcodes.
-- -----------------------------------------------------------------------------
-- Generated column with 'https://giancat.com/...'. Links are now built in the
-- app (lib/links.ts) from the wedding and the guest's invite token.
ALTER TABLE public.guests DROP COLUMN rsvp_link;

-- Fixed language list replaced by validation against weddings.locales.
ALTER TABLE public.guests DROP CONSTRAINT guests_language_check;

CREATE FUNCTION public.guests_validate_language() RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = ''
  AS $$
BEGIN
  IF NEW.language IS NOT NULL AND NEW.wedding_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.weddings w WHERE w.id = NEW.wedding_id AND NEW.language = ANY (w.locales)
  ) THEN
    RAISE EXCEPTION 'Language "%" is not enabled for this wedding', NEW.language
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.guests_validate_language() FROM PUBLIC;

CREATE TRIGGER guests_validate_language BEFORE INSERT OR UPDATE OF language, wedding_id ON public.guests
  FOR EACH ROW EXECUTE FUNCTION public.guests_validate_language();
