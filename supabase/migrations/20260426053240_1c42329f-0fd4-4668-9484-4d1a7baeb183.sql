INSERT INTO public.settings (key, value, is_public)
VALUES (
  'whatsapp_config',
  jsonb_build_object(
    'mode', 'sandbox',
    'from_sandbox', 'whatsapp:+14155238886',
    'from_production', '',
    'sandbox_join_code', '',
    'enabled', true
  ),
  false
)
ON CONFLICT (key) DO NOTHING;