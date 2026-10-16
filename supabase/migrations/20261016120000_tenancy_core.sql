-- =============================================================================
-- Phase 1.1 — Tenancy core: weddings, members, invitations, domains,
-- platform admins and the role helpers every RLS policy is built on.
-- See docs/multi-wedding/PLAN.md §2.1–2.2.
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS citext WITH SCHEMA extensions;

CREATE TYPE public.wedding_role AS ENUM ('owner', 'partner', 'planner', 'editor', 'viewer');

CREATE TABLE public.weddings (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug           extensions.citext NOT NULL UNIQUE
                 CHECK (slug::text ~ '^[a-z0-9](-?[a-z0-9])*$' AND length(slug::text) BETWEEN 3 AND 40),
  display_name   text NOT NULL,
  partner_names  text[] NOT NULL DEFAULT '{}',
  wedding_date   date,
  timezone       text NOT NULL DEFAULT 'Europe/Madrid',
  default_locale text NOT NULL DEFAULT 'en',
  locales        text[] NOT NULL DEFAULT '{en}',
  status         text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  contact_email  text,
  theme          jsonb NOT NULL DEFAULT '{}'::jsonb,
  settings       jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by     uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT weddings_default_locale_in_locales CHECK (default_locale = ANY (locales))
);

CREATE TABLE public.wedding_members (
  wedding_id uuid NOT NULL REFERENCES public.weddings(id) ON DELETE CASCADE,
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role       public.wedding_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (wedding_id, user_id)
);
CREATE INDEX wedding_members_user_id_idx ON public.wedding_members (user_id);

CREATE TABLE public.wedding_invitations (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wedding_id  uuid NOT NULL REFERENCES public.weddings(id) ON DELETE CASCADE,
  email       extensions.citext NOT NULL,
  role        public.wedding_role NOT NULL CHECK (role <> 'owner'),
  token_hash  text NOT NULL UNIQUE,
  invited_by  uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  expires_at  timestamptz NOT NULL DEFAULT now() + interval '14 days',
  accepted_at timestamptz
);
CREATE INDEX wedding_invitations_wedding_id_idx ON public.wedding_invitations (wedding_id);

-- Host mapping; stays empty until host-based routing (PLAN.md §5, Phase 4).
CREATE TABLE public.wedding_domains (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wedding_id  uuid NOT NULL REFERENCES public.weddings(id) ON DELETE CASCADE,
  hostname    extensions.citext NOT NULL UNIQUE,
  is_primary  boolean NOT NULL DEFAULT false,
  verified_at timestamptz
);
CREATE INDEX wedding_domains_wedding_id_idx ON public.wedding_domains (wedding_id);

-- Platform operators (not couples). Managed by service_role only.
CREATE TABLE public.platform_admins (
  user_id    uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE FUNCTION public.set_updated_at() RETURNS trigger
  LANGUAGE plpgsql
  SET search_path = ''
  AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER weddings_set_updated_at BEFORE UPDATE ON public.weddings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- -----------------------------------------------------------------------------
-- Role helpers. SECURITY DEFINER so policies can consult wedding_members /
-- weddings without recursing into their own RLS. search_path is pinned.
-- -----------------------------------------------------------------------------

-- Hierarchy: owner > partner > planner > editor > viewer.
CREATE FUNCTION public.role_rank(r public.wedding_role) RETURNS integer
  LANGUAGE sql IMMUTABLE
  SET search_path = ''
  AS $$
  SELECT array_position(ARRAY['viewer', 'editor', 'planner', 'partner', 'owner']::public.wedding_role[], r)
$$;

CREATE FUNCTION public.is_platform_admin() RETURNS boolean
  LANGUAGE sql STABLE SECURITY DEFINER
  SET search_path = ''
  AS $$
  SELECT EXISTS (SELECT 1 FROM public.platform_admins p WHERE p.user_id = auth.uid())
$$;

-- The calling user's role in a wedding, or NULL when not a member.
CREATE FUNCTION public.wedding_role_of(w uuid) RETURNS public.wedding_role
  LANGUAGE sql STABLE SECURITY DEFINER
  SET search_path = ''
  AS $$
  SELECT m.role FROM public.wedding_members m WHERE m.wedding_id = w AND m.user_id = auth.uid()
$$;

-- TRUE when the calling user holds at least min_role in wedding w
-- (platform admins always pass). Basis of every tenant RLS policy.
CREATE FUNCTION public.is_wedding_member(w uuid, min_role public.wedding_role DEFAULT 'viewer') RETURNS boolean
  LANGUAGE sql STABLE SECURITY DEFINER
  SET search_path = ''
  AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.wedding_members m
    WHERE m.wedding_id = w
      AND m.user_id = auth.uid()
      AND public.role_rank(m.role) >= public.role_rank(min_role)
  ) OR public.is_platform_admin()
$$;

-- TRUE when the calling user is a member of any wedding (used for global
-- caches that are only reachable from the dashboard).
CREATE FUNCTION public.is_any_wedding_member() RETURNS boolean
  LANGUAGE sql STABLE SECURITY DEFINER
  SET search_path = ''
  AS $$
  SELECT EXISTS (SELECT 1 FROM public.wedding_members m WHERE m.user_id = auth.uid())
      OR public.is_platform_admin()
$$;

-- TRUE when the wedding's public site is live. Lets anon policies check the
-- wedding status without being granted access to the weddings table.
CREATE FUNCTION public.is_wedding_public(w uuid) RETURNS boolean
  LANGUAGE sql STABLE SECURITY DEFINER
  SET search_path = ''
  AS $$
  SELECT EXISTS (SELECT 1 FROM public.weddings x WHERE x.id = w AND x.status = 'published')
$$;

REVOKE ALL ON FUNCTION public.is_platform_admin() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.wedding_role_of(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_wedding_member(uuid, public.wedding_role) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_any_wedding_member() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_wedding_public(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_platform_admin() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.wedding_role_of(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_wedding_member(uuid, public.wedding_role) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_any_wedding_member() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_wedding_public(uuid) TO anon, authenticated, service_role;

-- -----------------------------------------------------------------------------
-- RLS for the tenancy tables.
-- wedding_members and platform_admins are read by the SECURITY DEFINER helpers
-- above, so they are not FORCEd (the owner must be able to read them without
-- re-entering these policies). Clients never connect as the owner.
-- -----------------------------------------------------------------------------

ALTER TABLE public.weddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weddings FORCE ROW LEVEL SECURITY;
CREATE POLICY weddings_select ON public.weddings FOR SELECT TO authenticated
  USING (public.is_wedding_member(id));
CREATE POLICY weddings_update ON public.weddings FOR UPDATE TO authenticated
  USING (public.is_wedding_member(id, 'partner')) WITH CHECK (public.is_wedding_member(id, 'partner'));
-- INSERT/DELETE: service_role only (create_wedding() RPC arrives in Phase 3).

ALTER TABLE public.wedding_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY wedding_members_select ON public.wedding_members FOR SELECT TO authenticated
  USING (public.is_wedding_member(wedding_id));
CREATE POLICY wedding_members_insert ON public.wedding_members FOR INSERT TO authenticated
  WITH CHECK (public.is_wedding_member(wedding_id, 'owner') AND role <> 'owner');
CREATE POLICY wedding_members_update ON public.wedding_members FOR UPDATE TO authenticated
  USING (public.is_wedding_member(wedding_id, 'owner') AND role <> 'owner')
  WITH CHECK (public.is_wedding_member(wedding_id, 'owner') AND role <> 'owner');
CREATE POLICY wedding_members_delete ON public.wedding_members FOR DELETE TO authenticated
  USING (public.is_wedding_member(wedding_id, 'owner') AND role <> 'owner');

ALTER TABLE public.wedding_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wedding_invitations FORCE ROW LEVEL SECURITY;
CREATE POLICY wedding_invitations_owner_all ON public.wedding_invitations FOR ALL TO authenticated
  USING (public.is_wedding_member(wedding_id, 'owner'))
  WITH CHECK (public.is_wedding_member(wedding_id, 'owner'));

ALTER TABLE public.wedding_domains ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wedding_domains FORCE ROW LEVEL SECURITY;
CREATE POLICY wedding_domains_select ON public.wedding_domains FOR SELECT TO authenticated
  USING (public.is_wedding_member(wedding_id));

ALTER TABLE public.platform_admins ENABLE ROW LEVEL SECURITY;
-- No policies: service_role only.
