-- =============================================================================
-- Phase 1.3 — Membership-scoped RLS (PLAN.md §3).
--
-- Drops every policy inherited from the baseline (including the permissive
-- "Allow all for authenticated users", the email_campaigns policy that was open
-- to anon, and the "any authenticated user" reads on documents/chunks/chat
-- settings/planning) and replaces them with policies built on
-- is_wedding_member(wedding_id, min_role). RLS is enabled AND forced on every
-- table (api_logs and tokens_usage had it disabled).
--
-- Public guest access (invite page, RSVP) does not use these policies: it goes
-- through server routes that validate the invite token with service_role.
-- The only anon access left is read-only, active rows of published weddings.
-- =============================================================================

-- 1) Drop all baseline policies on the pre-existing tables.
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT tablename, policyname FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename NOT IN ('weddings', 'wedding_members', 'wedding_invitations', 'wedding_domains', 'platform_admins')
  LOOP
    EXECUTE format('DROP POLICY %I ON public.%I', r.policyname, r.tablename);
  END LOOP;
END $$;

-- 2) Enable + force RLS on every pre-existing table.
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
    'api_logs', 'tokens_usage', 'tavily_cache', 'user_settings'
  ]
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('ALTER TABLE public.%I FORCE ROW LEVEL SECURITY', t);
  END LOOP;
END $$;

-- 3) Standard member policies: select >= read_role, insert/update >= write_role,
--    delete >= delete_role. All TO authenticated; anon gets nothing.
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN SELECT * FROM (VALUES
    -- guest data
    ('guests',                  'viewer', 'editor', 'partner'),
    ('rsvp_responses',          'viewer', 'editor', 'partner'),
    ('guest_stay_requests',     'viewer', 'editor', 'partner'),
    ('guest_events',            'viewer', 'editor', 'editor'),
    ('event_guests',            'viewer', 'editor', 'editor'),
    ('guest_room_assignments',  'viewer', 'editor', 'editor'),
    ('guest_transport',         'viewer', 'editor', 'editor'),
    -- organisation data
    ('events',                  'viewer', 'editor', 'editor'),
    ('venue_rooms',             'viewer', 'editor', 'editor'),
    ('transport_options',       'viewer', 'editor', 'editor'),
    ('seating_tables',          'viewer', 'editor', 'editor'),
    ('seating_assignments',     'viewer', 'editor', 'editor'),
    ('planning_tasks',          'viewer', 'editor', 'editor'),
    ('checklists',              'viewer', 'editor', 'editor'),
    ('checklist_items',         'viewer', 'editor', 'editor'),
    -- site content
    ('site_content',            'viewer', 'editor', 'editor'),
    ('faq_items',               'viewer', 'editor', 'editor'),
    ('registry_items',          'viewer', 'editor', 'editor'),
    ('external_accommodations', 'viewer', 'editor', 'editor'),
    -- comms
    ('email_campaigns',         'viewer', 'editor', 'partner'),
    -- AI
    ('chat_settings',           'viewer', 'editor', 'partner'),
    ('document_chunks',         'viewer', 'editor', 'editor')
  ) AS v(tbl, read_role, write_role, delete_role)
  LOOP
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (public.is_wedding_member(wedding_id, %L))',
      r.tbl || '_select', r.tbl, r.read_role);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR INSERT TO authenticated WITH CHECK (public.is_wedding_member(wedding_id, %L))',
      r.tbl || '_insert', r.tbl, r.write_role);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR UPDATE TO authenticated USING (public.is_wedding_member(wedding_id, %L)) WITH CHECK (public.is_wedding_member(wedding_id, %L))',
      r.tbl || '_update', r.tbl, r.write_role, r.write_role);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR DELETE TO authenticated USING (public.is_wedding_member(wedding_id, %L))',
      r.tbl || '_delete', r.tbl, r.delete_role);
  END LOOP;
END $$;

-- 4) Public, read-only content of published weddings (same tables anon could
--    read before; previously unconditional or across all data).
CREATE POLICY site_content_public_read ON public.site_content FOR SELECT TO anon, authenticated
  USING (public.is_wedding_public(wedding_id));
CREATE POLICY faq_items_public_read ON public.faq_items FOR SELECT TO anon, authenticated
  USING (is_active = true AND public.is_wedding_public(wedding_id));
CREATE POLICY registry_items_public_read ON public.registry_items FOR SELECT TO anon, authenticated
  USING (is_active = true AND public.is_wedding_public(wedding_id));
CREATE POLICY external_accommodations_public_read ON public.external_accommodations FOR SELECT TO anon, authenticated
  USING (is_active = true AND public.is_wedding_public(wedding_id));
CREATE POLICY transport_options_public_read ON public.transport_options FOR SELECT TO anon, authenticated
  USING (is_active = true AND public.is_wedding_public(wedding_id));

-- 5) Documents: members read, editors write; uploader recorded as the caller.
CREATE POLICY documents_select ON public.documents FOR SELECT TO authenticated
  USING (public.is_wedding_member(wedding_id, 'viewer'));
CREATE POLICY documents_insert ON public.documents FOR INSERT TO authenticated
  WITH CHECK (uploaded_by = auth.uid() AND public.is_wedding_member(wedding_id, 'editor'));
CREATE POLICY documents_update ON public.documents FOR UPDATE TO authenticated
  USING (public.is_wedding_member(wedding_id, 'editor')) WITH CHECK (public.is_wedding_member(wedding_id, 'editor'));
CREATE POLICY documents_delete ON public.documents FOR DELETE TO authenticated
  USING (public.is_wedding_member(wedding_id, 'editor'));

-- 6) Chat: private to the author AND requires editor membership.
CREATE POLICY chat_conversations_author ON public.chat_conversations FOR ALL TO authenticated
  USING (user_id = auth.uid() AND public.is_wedding_member(wedding_id, 'editor'))
  WITH CHECK (user_id = auth.uid() AND public.is_wedding_member(wedding_id, 'editor'));

CREATE POLICY chat_messages_author ON public.chat_messages FOR ALL TO authenticated
  USING (
    public.is_wedding_member(wedding_id, 'editor')
    AND EXISTS (SELECT 1 FROM public.chat_conversations c
                WHERE c.id = chat_messages.conversation_id AND c.user_id = auth.uid())
  )
  WITH CHECK (
    public.is_wedding_member(wedding_id, 'editor')
    AND EXISTS (SELECT 1 FROM public.chat_conversations c
                WHERE c.id = chat_messages.conversation_id AND c.user_id = auth.uid())
  );

CREATE POLICY conversation_summaries_author ON public.conversation_summaries FOR ALL TO authenticated
  USING (user_id = auth.uid() AND public.is_wedding_member(wedding_id, 'editor'))
  WITH CHECK (user_id = auth.uid() AND public.is_wedding_member(wedding_id, 'editor'));

-- 7) Usage logs (written by the dashboard): members read, editors append rows
--    attributed to themselves; no update/delete (service_role only).
CREATE POLICY api_logs_select ON public.api_logs FOR SELECT TO authenticated
  USING (public.is_wedding_member(wedding_id, 'viewer'));
CREATE POLICY api_logs_insert ON public.api_logs FOR INSERT TO authenticated
  WITH CHECK ((user_id IS NULL OR user_id = auth.uid()) AND public.is_wedding_member(wedding_id, 'editor'));
CREATE POLICY tokens_usage_select ON public.tokens_usage FOR SELECT TO authenticated
  USING (public.is_wedding_member(wedding_id, 'viewer'));
CREATE POLICY tokens_usage_insert ON public.tokens_usage FOR INSERT TO authenticated
  WITH CHECK ((user_id IS NULL OR user_id = auth.uid()) AND public.is_wedding_member(wedding_id, 'editor'));

-- 8) Global web-search cache: no personal data, only reachable by users that
--    belong to some wedding (was: any authenticated user). Moves server-side
--    in Phase 3.
CREATE POLICY tavily_cache_select ON public.tavily_cache FOR SELECT TO authenticated
  USING (public.is_any_wedding_member());
CREATE POLICY tavily_cache_insert ON public.tavily_cache FOR INSERT TO authenticated
  WITH CHECK (public.is_any_wedding_member());
CREATE POLICY tavily_cache_update ON public.tavily_cache FOR UPDATE TO authenticated
  USING (public.is_any_wedding_member()) WITH CHECK (public.is_any_wedding_member());

-- 9) Per-user settings (unchanged semantics, now TO authenticated only).
CREATE POLICY user_settings_own ON public.user_settings FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
