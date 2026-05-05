-- Helper: vérifie qu'un token de réservation existe
CREATE OR REPLACE FUNCTION public.is_valid_reservation_token(_token text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.reservations WHERE client_token = _token);
$$;

-- Policies: autoriser upload/lecture anonyme des CNI dans le sous-dossier <token>/
DROP POLICY IF EXISTS "Clients can upload their id docs" ON storage.objects;
CREATE POLICY "Clients can upload their id docs"
ON storage.objects FOR INSERT
TO public
WITH CHECK (
  bucket_id = 'id-documents'
  AND public.is_valid_reservation_token((storage.foldername(name))[1])
);

DROP POLICY IF EXISTS "Clients can update their id docs" ON storage.objects;
CREATE POLICY "Clients can update their id docs"
ON storage.objects FOR UPDATE
TO public
USING (
  bucket_id = 'id-documents'
  AND public.is_valid_reservation_token((storage.foldername(name))[1])
)
WITH CHECK (
  bucket_id = 'id-documents'
  AND public.is_valid_reservation_token((storage.foldername(name))[1])
);
