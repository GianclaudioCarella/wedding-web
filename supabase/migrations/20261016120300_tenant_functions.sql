-- =============================================================================
-- Phase 1.6 — SQL functions and views scoped per wedding.
-- =============================================================================

-- RAG search now requires the wedding and filters on it (SECURITY INVOKER, so
-- RLS applies on top). Replaces the unscoped 3-argument version.
DROP FUNCTION public.search_document_chunks(public.vector, double precision, integer);

CREATE FUNCTION public.search_document_chunks(
  p_wedding_id uuid,
  query_embedding public.vector,
  match_threshold double precision DEFAULT 0.5,
  match_count integer DEFAULT 5
) RETURNS TABLE(chunk_id uuid, document_id uuid, content text, distance double precision, metadata jsonb, document_filename text)
  LANGUAGE sql STABLE
  SECURITY INVOKER
  SET search_path = public, extensions
  AS $$
  SELECT dc.id, dc.document_id, dc.content,
         (dc.embedding <=> query_embedding)::double precision,
         dc.metadata, d.filename
  FROM public.document_chunks dc
  JOIN public.documents d ON d.id = dc.document_id AND d.wedding_id = dc.wedding_id
  WHERE dc.wedding_id = p_wedding_id
    AND d.status = 'completed'
    AND (dc.embedding <=> query_embedding) < match_threshold
  ORDER BY dc.embedding <=> query_embedding
  LIMIT match_count
$$;

-- Checklist reordering is limited to one wedding's list (RLS still applies).
DROP FUNCTION public.reorder_checklist_items(uuid, uuid[]);

CREATE FUNCTION public.reorder_checklist_items(p_wedding_id uuid, list_id uuid, item_ids uuid[]) RETURNS void
  LANGUAGE plpgsql
  SECURITY INVOKER
  SET search_path TO 'public'
  AS $$
BEGIN
  IF cardinality(item_ids) IS NULL
     OR cardinality(item_ids) <> (SELECT count(DISTINCT id) FROM unnest(item_ids) AS ids(id)) THEN
    RAISE EXCEPTION 'Invalid checklist order';
  END IF;

  UPDATE public.checklist_items AS item
  SET position = ordered.ordinality::integer - 1
  FROM unnest(item_ids) WITH ORDINALITY AS ordered(id, ordinality)
  WHERE item.id = ordered.id AND item.checklist_id = list_id AND item.wedding_id = p_wedding_id;
END;
$$;

-- The metrics view ran with its owner's rights, bypassing RLS on api_logs for
-- anyone allowed to select it. Make it respect the caller's RLS and expose the
-- wedding so callers can filter.
DROP VIEW public.v_tavily_metrics;
CREATE VIEW public.v_tavily_metrics WITH (security_invoker = true) AS
 SELECT wedding_id,
    date_trunc('hour'::text, "timestamp") AS hour,
    count(*) AS total_calls,
    count(*) FILTER (WHERE (success = true)) AS successful_calls,
    count(*) FILTER (WHERE (success = false)) AS failed_calls,
    (avg(response_time_ms))::integer AS avg_response_time_ms,
    max(response_time_ms) AS max_response_time_ms
   FROM public.api_logs
  WHERE ((api_name = 'tavily'::text) AND ("timestamp" >= (now() - '7 days'::interval)))
  GROUP BY wedding_id, (date_trunc('hour'::text, "timestamp"))
  ORDER BY (date_trunc('hour'::text, "timestamp")) DESC;
