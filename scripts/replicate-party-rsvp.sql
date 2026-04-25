-- Script para replicar RSVP responses dos primary guests aos party members
--
-- Uso: Execute este script no Supabase SQL Editor
--
-- O script faz:
-- 1. Encontra todos os primary guests com RSVP responses
-- 2. Para cada party member deles, replica o RSVP com o mesmo status

-- Primeiro, vamos visualizar quantas atualizações serão feitas
SELECT
  COUNT(DISTINCT pg.id) as total_primary_guests,
  COUNT(DISTINCT pm.id) as total_party_members,
  COUNT(DISTINCT rr.id) as total_rsvp_responses
FROM guests pg
INNER JOIN rsvp_responses rr ON rr.guest_id = pg.id
LEFT JOIN guests pm ON pm.party_leader_id = pg.id
WHERE pg.party_leader_id IS NULL
AND pm.id IS NOT NULL;

-- ============================================================================
-- EXECUTAR ESTE INSERT PARA REPLICAR OS RSVP
-- ============================================================================

INSERT INTO rsvp_responses (guest_id, event_id, status, dietary_requirements, dietary_notes, responded_at, updated_at)
SELECT
  pm.id as guest_id,
  rr.event_id,
  rr.status,
  rr.dietary_requirements,
  rr.dietary_notes,
  rr.responded_at,
  NOW() as updated_at
FROM guests pg
INNER JOIN rsvp_responses rr ON rr.guest_id = pg.id
INNER JOIN guests pm ON pm.party_leader_id = pg.id
WHERE pg.party_leader_id IS NULL
ON CONFLICT (guest_id, event_id)
DO UPDATE SET
  status = EXCLUDED.status,
  dietary_requirements = EXCLUDED.dietary_requirements,
  dietary_notes = EXCLUDED.dietary_notes,
  updated_at = NOW();

-- ============================================================================
-- VERIFICAR RESULTADOS
-- ============================================================================

-- Ver quantos RSVP foram replicados para party members
SELECT
  g.name,
  g.party_role,
  COUNT(rr.id) as rsvp_count
FROM guests g
LEFT JOIN rsvp_responses rr ON rr.guest_id = g.id
WHERE g.party_leader_id IS NOT NULL
GROUP BY g.id, g.name, g.party_role
HAVING COUNT(rr.id) > 0
ORDER BY g.name;
