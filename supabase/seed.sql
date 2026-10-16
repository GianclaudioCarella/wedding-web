-- Generic seed applied by `supabase db reset` (local development only).
-- Contains no wedding-specific data. Tenant #1 data lives in
-- supabase/fixtures/tenant1/ and is never applied automatically.

INSERT INTO public.chat_settings (setting_key, setting_value)
SELECT 'system_message',
       'You are a helpful AI assistant for wedding planning. Use the available tools to query the wedding database and provide accurate, up-to-date information about guests, events and statistics.'
WHERE NOT EXISTS (SELECT 1 FROM public.chat_settings WHERE setting_key = 'system_message');
