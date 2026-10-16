-- =============================================================================
-- Phase 1 — Optional owner assignment for tenant #1 at migration time.
--
-- Personal e-mails are never stored in the repository. If the database
-- setting app.tenant1_owner_emails is present (comma-separated list), the
-- matching auth.users become owners of tenant #1; otherwise this is a no-op
-- and the owners are assigned with the manual SQL step in
-- docs/multi-wedding/PHASE1-ROLLOUT.md. Idempotent either way.
-- =============================================================================
DO $$
DECLARE
  raw text := nullif(current_setting('app.tenant1_owner_emails', true), '');
  emails text[];
  n integer;
BEGIN
  IF raw IS NULL THEN
    RAISE NOTICE 'app.tenant1_owner_emails not set: assign tenant #1 owners manually (see PHASE1-ROLLOUT.md)';
    RETURN;
  END IF;

  SELECT array_agg(lower(btrim(e))) INTO emails
  FROM unnest(string_to_array(raw, ',')) AS e
  WHERE btrim(e) <> '';

  INSERT INTO public.wedding_members (wedding_id, user_id, role)
  SELECT '00000000-0000-0000-0000-000000000001', u.id, 'owner'
  FROM auth.users u
  WHERE lower(u.email) = ANY (emails)
  ON CONFLICT (wedding_id, user_id) DO UPDATE SET role = 'owner';

  GET DIAGNOSTICS n = ROW_COUNT;
  IF n <> cardinality(emails) THEN
    RAISE WARNING 'tenant #1 owners: % of % e-mails matched an auth user', n, cardinality(emails);
  END IF;
END $$;
