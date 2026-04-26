-- Étendre les statuts WhatsApp pour le fallback en cascade
ALTER TYPE whatsapp_status ADD VALUE IF NOT EXISTS 'fallback_wa';
ALTER TYPE whatsapp_status ADD VALUE IF NOT EXISTS 'manual_required';
ALTER TYPE whatsapp_status ADD VALUE IF NOT EXISTS 'error';

-- Ajouter colonnes de suivi sur reservations
ALTER TABLE public.reservations
  ADD COLUMN IF NOT EXISTS client_link_opened_at timestamptz,
  ADD COLUMN IF NOT EXISTS client_link_open_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS rules_signed_at timestamptz,
  ADD COLUMN IF NOT EXISTS rules_signed_name text;

-- Ajouter colonne mode/wa_link sur whatsapp_logs pour tracer fallback
ALTER TABLE public.whatsapp_logs
  ADD COLUMN IF NOT EXISTS mode text,
  ADD COLUMN IF NOT EXISTS wa_link text;

-- Fonction publique : marquer le lien client comme ouvert (appelable sans auth via RPC)
CREATE OR REPLACE FUNCTION public.mark_client_link_opened(_token text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.reservations
  SET client_link_opened_at = COALESCE(client_link_opened_at, now()),
      client_link_open_count = client_link_open_count + 1
  WHERE client_token = _token;
END;
$$;

-- Fonction publique : signer le règlement intérieur
CREATE OR REPLACE FUNCTION public.sign_rules(_token text, _signed_name text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _res_id uuid;
  _client_name text;
BEGIN
  IF length(trim(coalesce(_signed_name, ''))) < 2 THEN
    RAISE EXCEPTION 'Nom requis pour la signature';
  END IF;

  SELECT r.id, c.first_name INTO _res_id, _client_name
  FROM public.reservations r
  JOIN public.clients c ON c.id = r.client_id
  WHERE r.client_token = _token;

  IF _res_id IS NULL THEN
    RAISE EXCEPTION 'Réservation introuvable';
  END IF;

  UPDATE public.reservations
  SET rules_signed_at = now(),
      rules_signed_name = _signed_name
  WHERE id = _res_id;

  INSERT INTO public.notifications(type, title, body, link)
  VALUES ('rules_signed', 'Règlement intérieur signé',
          coalesce(_client_name, 'Un client') || ' a signé le règlement intérieur',
          '/admin/reservations');
END;
$$;