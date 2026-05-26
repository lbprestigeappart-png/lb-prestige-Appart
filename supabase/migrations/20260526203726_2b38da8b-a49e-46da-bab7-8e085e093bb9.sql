
CREATE TABLE public.restaurants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  phone text NOT NULL,
  contract_path text,
  contract_signed boolean NOT NULL DEFAULT false,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.restaurants TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.restaurants TO authenticated;
GRANT ALL ON public.restaurants TO service_role;

ALTER TABLE public.restaurants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view restaurants"
  ON public.restaurants FOR SELECT
  USING (true);

CREATE POLICY "Admins manage restaurants"
  ON public.restaurants FOR ALL
  USING (public.is_admin(auth.uid()));

CREATE TRIGGER trg_restaurants_updated
  BEFORE UPDATE ON public.restaurants
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.restaurant_dishes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  price_fcfa integer NOT NULL DEFAULT 0,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.restaurant_dishes TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.restaurant_dishes TO authenticated;
GRANT ALL ON public.restaurant_dishes TO service_role;

ALTER TABLE public.restaurant_dishes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view dishes"
  ON public.restaurant_dishes FOR SELECT
  USING (true);

CREATE POLICY "Admins manage dishes"
  ON public.restaurant_dishes FOR ALL
  USING (public.is_admin(auth.uid()));

CREATE INDEX idx_dishes_restaurant ON public.restaurant_dishes(restaurant_id);

CREATE TRIGGER trg_dishes_updated
  BEFORE UPDATE ON public.restaurant_dishes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.restaurants;
ALTER PUBLICATION supabase_realtime ADD TABLE public.restaurant_dishes;

-- Storage bucket for contracts (private)
INSERT INTO storage.buckets (id, name, public) VALUES ('restaurant-contracts', 'restaurant-contracts', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Admins read restaurant contracts"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'restaurant-contracts' AND public.is_admin(auth.uid()));

CREATE POLICY "Admins upload restaurant contracts"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'restaurant-contracts' AND public.is_admin(auth.uid()));

CREATE POLICY "Admins update restaurant contracts"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'restaurant-contracts' AND public.is_admin(auth.uid()));

CREATE POLICY "Admins delete restaurant contracts"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'restaurant-contracts' AND public.is_admin(auth.uid()));

-- Seed mock data
WITH r1 AS (
  INSERT INTO public.restaurants (name, phone, contract_signed, display_order)
  VALUES ('Kuku Cele''Mbap', '+237699112233', true, 1)
  RETURNING id
), r2 AS (
  INSERT INTO public.restaurants (name, phone, contract_signed, display_order)
  VALUES ('Anchimbom', '+237677445566', false, 2)
  RETURNING id
)
INSERT INTO public.restaurant_dishes (restaurant_id, name, description, price_fcfa, display_order)
SELECT id, 'Poulet DG', 'Poulet braisé, plantains mûrs et légumes sautés', 5500, 1 FROM r1
UNION ALL SELECT id, 'Ndolè crevettes', 'Feuilles de ndolè, crevettes, accompagné de bâtons de manioc', 6000, 2 FROM r1
UNION ALL SELECT id, 'Eru viande', 'Eru aux feuilles de waterleaf, viande et fufu d''eau', 4500, 3 FROM r1
UNION ALL SELECT id, 'Achu jaune', 'Achu sauce jaune traditionnelle, viande et poisson fumé', 5000, 1 FROM r2
UNION ALL SELECT id, 'Koki maïs', 'Pâte de haricots cuite, accompagnée de plantains', 3500, 2 FROM r2
UNION ALL SELECT id, 'Poisson braisé miondo', 'Poisson braisé épicé, miondo et sauce tomate', 6500, 3 FROM r2;
