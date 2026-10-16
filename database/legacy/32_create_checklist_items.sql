BEGIN;

CREATE TABLE IF NOT EXISTS public.checklists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL CHECK (char_length(btrim(name)) BETWEEN 1 AND 150),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.checklists ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated checklist access" ON public.checklists;
CREATE POLICY "Authenticated checklist access" ON public.checklists
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.checklists TO authenticated;

CREATE TABLE IF NOT EXISTS public.checklist_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  checklist_id UUID NOT NULL REFERENCES public.checklists(id) ON DELETE CASCADE,
  title TEXT NOT NULL CHECK (char_length(btrim(title)) BETWEEN 1 AND 500),
  completed BOOLEAN NOT NULL DEFAULT false,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS checklist_items_list_position ON public.checklist_items(checklist_id, position);

ALTER TABLE public.checklist_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated checklist access" ON public.checklist_items;
CREATE POLICY "Authenticated checklist access" ON public.checklist_items
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.checklist_items TO authenticated;

-- Save the entire order atomically, without overwriting titles or completion.
CREATE OR REPLACE FUNCTION public.reorder_checklist_items(list_id UUID, item_ids UUID[])
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  IF cardinality(item_ids) IS NULL
     OR cardinality(item_ids) <> (SELECT count(DISTINCT id) FROM unnest(item_ids) AS ids(id)) THEN
    RAISE EXCEPTION 'Invalid checklist order';
  END IF;

  UPDATE public.checklist_items AS item
  SET position = ordered.ordinality::integer - 1
  FROM unnest(item_ids) WITH ORDINALITY AS ordered(id, ordinality)
  WHERE item.id = ordered.id AND item.checklist_id = list_id;
END;
$$;

REVOKE ALL ON FUNCTION public.reorder_checklist_items(UUID, UUID[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.reorder_checklist_items(UUID, UUID[]) TO authenticated;

COMMIT;
