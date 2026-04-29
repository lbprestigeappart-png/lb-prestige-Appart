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
  _today DATE := (now() AT TIME ZONE 'UTC')::date;
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
    -- Invalid token
    RETURN jsonb_build_object('status', 'invalid');
  END IF;

  -- Expired: check_out date has passed (link inactive after departure day)
  IF reservation_data.check_out < _today THEN
    RETURN jsonb_build_object(
      'status', 'expired',
      'property', jsonb_build_object(
        'name', reservation_data.property_name,
        'banner_url', reservation_data.banner_url,
        'banner_title', reservation_data.banner_title
      ),
      'client', jsonb_build_object('first_name', reservation_data.first_name)
    );
  END IF;

  SELECT id_number, front_path, back_path, created_at
    INTO id_doc
  FROM public.client_id_documents
  WHERE reservation_id = reservation_data.id;

  SELECT jsonb_build_object(
    'status', 'active',
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