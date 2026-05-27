
-- 1. Add image_path to dishes
ALTER TABLE public.restaurant_dishes ADD COLUMN IF NOT EXISTS image_path text;

-- 2. Drinks table
CREATE TABLE IF NOT EXISTS public.restaurant_drinks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL,
  name text NOT NULL,
  drink_type text NOT NULL DEFAULT 'soft',
  price_fcfa integer NOT NULL DEFAULT 0,
  image_path text,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.restaurant_drinks TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.restaurant_drinks TO authenticated;
GRANT ALL ON public.restaurant_drinks TO service_role;

ALTER TABLE public.restaurant_drinks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view drinks" ON public.restaurant_drinks FOR SELECT USING (true);
CREATE POLICY "Admins manage drinks" ON public.restaurant_drinks FOR ALL USING (is_admin(auth.uid()));

CREATE TRIGGER update_restaurant_drinks_updated_at
BEFORE UPDATE ON public.restaurant_drinks
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. Public bucket for dish/drink images
INSERT INTO storage.buckets (id, name, public)
VALUES ('dish-images', 'dish-images', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Dish images public read"
ON storage.objects FOR SELECT
USING (bucket_id = 'dish-images');

CREATE POLICY "Admins upload dish images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'dish-images' AND is_admin(auth.uid()));

CREATE POLICY "Admins update dish images"
ON storage.objects FOR UPDATE
USING (bucket_id = 'dish-images' AND is_admin(auth.uid()));

CREATE POLICY "Admins delete dish images"
ON storage.objects FOR DELETE
USING (bucket_id = 'dish-images' AND is_admin(auth.uid()));
