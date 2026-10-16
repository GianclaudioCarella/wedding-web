-- Generate missing invite_tokens for guests that don't have one yet
-- This is needed for the new invite system

UPDATE guests
SET invite_token = gen_random_uuid()::text
WHERE invite_token IS NULL OR invite_token = '';
