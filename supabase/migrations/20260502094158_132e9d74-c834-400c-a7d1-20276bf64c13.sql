
ALTER TABLE public.reviews
  ADD COLUMN IF NOT EXISTS guest_name text,
  ADD COLUMN IF NOT EXISTS country text,
  ADD COLUMN IF NOT EXISTS stay_date date,
  ADD COLUMN IF NOT EXISTS booking_ref text,
  ADD COLUMN IF NOT EXISTS cleanliness integer,
  ADD COLUMN IF NOT EXISTS comfort integer,
  ADD COLUMN IF NOT EXISTS location_score integer,
  ADD COLUMN IF NOT EXISTS staff integer,
  ADD COLUMN IF NOT EXISTS value integer,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'pending';

ALTER TABLE public.reviews
  DROP CONSTRAINT IF EXISTS reviews_subscores_range;
ALTER TABLE public.reviews
  ADD CONSTRAINT reviews_subscores_range CHECK (
    (cleanliness IS NULL OR cleanliness BETWEEN 1 AND 5) AND
    (comfort IS NULL OR comfort BETWEEN 1 AND 5) AND
    (location_score IS NULL OR location_score BETWEEN 1 AND 5) AND
    (staff IS NULL OR staff BETWEEN 1 AND 5) AND
    (value IS NULL OR value BETWEEN 1 AND 5)
  );

ALTER TABLE public.reviews
  DROP CONSTRAINT IF EXISTS reviews_status_check;
ALTER TABLE public.reviews
  ADD CONSTRAINT reviews_status_check CHECK (status IN ('pending','sent','error'));

CREATE OR REPLACE FUNCTION public.submit_client_booking_review(
  _token text,
  _guest_name text,
  _country text,
  _booking_ref text,
  _global_score integer,
  _cleanliness integer,
  _comfort integer,
  _location integer,
  _staff integer,
  _value integer,
  _comment text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _reservation_id UUID;
  _client_id UUID;
  _client_name TEXT;
  _check_in DATE;
  _review_id UUID;
BEGIN
  SELECT r.id, r.client_id, r.check_in, c.first_name
    INTO _reservation_id, _client_id, _check_in, _client_name
  FROM public.reservations r
  JOIN public.clients c ON c.id = r.client_id
  WHERE r.client_token = _token;

  IF _reservation_id IS NULL THEN
    RAISE EXCEPTION 'Invalid token';
  END IF;

  IF _global_score IS NULL OR _global_score < 1 OR _global_score > 5 THEN
    RAISE EXCEPTION 'Note globale invalide';
  END IF;

  IF length(trim(coalesce(_comment,''))) < 50 THEN
    RAISE EXCEPTION 'Le commentaire doit contenir au moins 50 caractères';
  END IF;

  IF length(trim(coalesce(_guest_name,''))) < 2 THEN
    RAISE EXCEPTION 'Nom requis';
  END IF;

  INSERT INTO public.reviews(
    reservation_id, client_id, rating, comment, is_published,
    guest_name, country, stay_date, booking_ref,
    cleanliness, comfort, location_score, staff, value, status
  )
  VALUES (
    _reservation_id, _client_id, _global_score, _comment, false,
    _guest_name, _country, _check_in, _booking_ref,
    _cleanliness, _comfort, _location, _staff, _value, 'pending'
  )
  RETURNING id INTO _review_id;

  INSERT INTO public.notifications(type, title, body, link)
  VALUES ('review',
          'Nouvel avis Booking reçu',
          coalesce(_client_name,'Un client') || ' a laissé un avis (' || _global_score || '/5) — à reporter sur Booking.com',
          '/admin/reviews');

  RETURN _review_id;
END;
$function$;
