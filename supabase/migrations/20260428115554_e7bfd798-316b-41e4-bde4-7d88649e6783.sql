
-- Table to store client ID documents linked to reservations
CREATE TABLE public.client_id_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  reservation_id UUID NOT NULL,
  id_number TEXT,
  front_path TEXT,
  back_path TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_client_id_documents_reservation ON public.client_id_documents(reservation_id);

ALTER TABLE public.client_id_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage id documents"
ON public.client_id_documents FOR ALL
USING (is_admin(auth.uid()));

CREATE TRIGGER update_client_id_documents_updated_at
BEFORE UPDATE ON public.client_id_documents
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Private storage bucket for ID documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('id-documents', 'id-documents', false)
ON CONFLICT (id) DO NOTHING;

-- Admins can fully manage the bucket
CREATE POLICY "Admins read id-documents"
ON storage.objects FOR SELECT
USING (bucket_id = 'id-documents' AND is_admin(auth.uid()));

CREATE POLICY "Admins insert id-documents"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'id-documents' AND is_admin(auth.uid()));

CREATE POLICY "Admins update id-documents"
ON storage.objects FOR UPDATE
USING (bucket_id = 'id-documents' AND is_admin(auth.uid()));

CREATE POLICY "Admins delete id-documents"
ON storage.objects FOR DELETE
USING (bucket_id = 'id-documents' AND is_admin(auth.uid()));

-- Public (anonymous) clients can upload into their reservation folder using the token as the first folder segment.
-- This allows uploads to paths like "<client_token>/front.jpg"
CREATE POLICY "Clients upload own id-documents by token"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'id-documents'
  AND EXISTS (
    SELECT 1 FROM public.reservations r
    WHERE r.client_token = (storage.foldername(name))[1]
  )
);

-- RPC for the client to submit ID info with their token
CREATE OR REPLACE FUNCTION public.submit_client_id(
  _token TEXT,
  _id_number TEXT,
  _front_path TEXT,
  _back_path TEXT
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _res_id UUID;
  _client_name TEXT;
  _doc_id UUID;
BEGIN
  SELECT r.id, c.first_name INTO _res_id, _client_name
  FROM public.reservations r
  JOIN public.clients c ON c.id = r.client_id
  WHERE r.client_token = _token;

  IF _res_id IS NULL THEN
    RAISE EXCEPTION 'Réservation introuvable';
  END IF;

  IF length(trim(coalesce(_id_number, ''))) < 3 THEN
    RAISE EXCEPTION 'Numéro CNI requis';
  END IF;

  INSERT INTO public.client_id_documents (reservation_id, id_number, front_path, back_path)
  VALUES (_res_id, _id_number, _front_path, _back_path)
  ON CONFLICT (reservation_id) DO UPDATE
    SET id_number = EXCLUDED.id_number,
        front_path = COALESCE(EXCLUDED.front_path, public.client_id_documents.front_path),
        back_path = COALESCE(EXCLUDED.back_path, public.client_id_documents.back_path),
        updated_at = now()
  RETURNING id INTO _doc_id;

  INSERT INTO public.notifications(type, title, body, link)
  VALUES ('rules_signed', 'Pièce d''identité reçue',
          coalesce(_client_name, 'Un client') || ' a envoyé sa pièce d''identité',
          '/admin/rules');

  RETURN _doc_id;
END;
$$;

-- Extend get_client_space to include id document info
CREATE OR REPLACE FUNCTION public.get_client_space(_token text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  result JSONB;
  reservation_data RECORD;
  id_doc RECORD;
BEGIN
  SELECT r.*, c.first_name, c.last_name, c.phone, c.email,
         p.name as property_name, p.subtitle as property_subtitle,
         p.location as property_location, p.banner_url, p.banner_title, p.banner_message,
         p.contact_phone as property_phone, p.contact_email as property_email,
         p.whatsapp_number
  INTO reservation_data
  FROM public.reservations r
  JOIN public.clients c ON c.id = r.client_id
  LEFT JOIN public.properties p ON p.id = r.property_id
  WHERE r.client_token = _token;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  SELECT id_number, front_path, back_path, created_at
    INTO id_doc
  FROM public.client_id_documents
  WHERE reservation_id = reservation_data.id;

  SELECT jsonb_build_object(
    'reservation', jsonb_build_object(
      'id', reservation_data.id,
      'code', reservation_data.reservation_code,
      'token', reservation_data.client_token,
      'check_in', reservation_data.check_in,
      'check_out', reservation_data.check_out,
      'suite_type', reservation_data.suite_type,
      'guests', reservation_data.guests,
      'status', reservation_data.status
    ),
    'client', jsonb_build_object(
      'first_name', reservation_data.first_name,
      'last_name', reservation_data.last_name,
      'phone', reservation_data.phone,
      'email', reservation_data.email
    ),
    'property', jsonb_build_object(
      'name', reservation_data.property_name,
      'subtitle', reservation_data.property_subtitle,
      'location', reservation_data.property_location,
      'banner_url', reservation_data.banner_url,
      'banner_title', reservation_data.banner_title,
      'banner_message', reservation_data.banner_message,
      'phone', reservation_data.property_phone,
      'email', reservation_data.property_email,
      'whatsapp', reservation_data.whatsapp_number
    ),
    'id_document', CASE WHEN id_doc.id_number IS NULL THEN NULL ELSE jsonb_build_object(
      'id_number', id_doc.id_number,
      'front_path', id_doc.front_path,
      'back_path', id_doc.back_path,
      'submitted_at', id_doc.created_at
    ) END,
    'settings', (SELECT jsonb_object_agg(key, value) FROM public.settings WHERE is_public = true),
    'documents', COALESCE((SELECT jsonb_agg(jsonb_build_object(
      'id', id, 'title', title, 'file_type', file_type, 'file_size', file_size,
      'storage_path', storage_path, 'external_url', external_url
    ) ORDER BY display_order) FROM public.useful_documents WHERE is_public = true), '[]'::jsonb)
  ) INTO result;

  RETURN result;
END;
$function$;
