-- Generic seed applied by `supabase db reset` (local development only).
-- Contains no wedding-specific data. Tenant #1 data lives in
-- supabase/fixtures/tenant1/ and is never applied automatically.
-- Tenant #1 itself (the weddings row) is created by the migrations.

INSERT INTO public.chat_settings (wedding_id, setting_key, setting_value)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'system_message',
  'You are a helpful AI assistant for wedding planning. Use the available tools to query the wedding database and provide accurate, up-to-date information about guests, events and statistics.'
)
ON CONFLICT (wedding_id, setting_key) DO NOTHING;
