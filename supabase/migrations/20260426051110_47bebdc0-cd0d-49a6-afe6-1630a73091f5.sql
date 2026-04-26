
-- ============================================================
-- ENUMS
-- ============================================================
CREATE TYPE public.app_role AS ENUM ('admin', 'owner');
CREATE TYPE public.reservation_status AS ENUM ('pending', 'confirmed', 'in_progress', 'completed', 'cancelled');
CREATE TYPE public.whatsapp_status AS ENUM ('pending', 'sent', 'delivered', 'read', 'failed');
CREATE TYPE public.payment_status AS ENUM ('pending', 'partial', 'paid', 'refunded');
CREATE TYPE public.message_sender AS ENUM ('admin', 'client');
CREATE TYPE public.notification_type AS ENUM ('reservation', 'message', 'arrival', 'departure', 'review', 'payment', 'system');

-- ============================================================
-- TIMESTAMPS HELPER
-- ============================================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- ============================================================
-- USER ROLES (security)
-- ============================================================
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE OR REPLACE FUNCTION public.is_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role IN ('admin', 'owner')
  )
$$;

CREATE POLICY "Admins can view roles" ON public.user_roles
  FOR SELECT USING (public.is_admin(auth.uid()));
CREATE POLICY "Owners can manage roles" ON public.user_roles
  FOR ALL USING (public.has_role(auth.uid(), 'owner'));

-- Auto-grant 'owner' to the first user that signs up
CREATE OR REPLACE FUNCTION public.handle_first_user()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.user_roles) THEN
    INSERT INTO public.user_roles(user_id, role) VALUES (NEW.id, 'owner');
    INSERT INTO public.user_roles(user_id, role) VALUES (NEW.id, 'admin');
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created_first
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_first_user();

-- ============================================================
-- PROPERTIES
-- ============================================================
CREATE TABLE public.properties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  subtitle TEXT,
  location TEXT,
  address TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  whatsapp_number TEXT,
  banner_url TEXT,
  banner_title TEXT,
  banner_message TEXT,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view properties" ON public.properties
  FOR SELECT USING (true);
CREATE POLICY "Admins manage properties" ON public.properties
  FOR ALL USING (public.is_admin(auth.uid()));

CREATE TRIGGER trg_properties_updated
  BEFORE UPDATE ON public.properties
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- SETTINGS (key/value JSON store)
-- ============================================================
CREATE TABLE public.settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  value JSONB NOT NULL DEFAULT '{}'::jsonb,
  description TEXT,
  is_public BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public settings readable by all" ON public.settings
  FOR SELECT USING (is_public = true OR public.is_admin(auth.uid()));
CREATE POLICY "Admins manage settings" ON public.settings
  FOR ALL USING (public.is_admin(auth.uid()));

CREATE TRIGGER trg_settings_updated
  BEFORE UPDATE ON public.settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- CLIENTS
-- ============================================================
CREATE TABLE public.clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name TEXT NOT NULL,
  last_name TEXT,
  phone TEXT,
  email TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage clients" ON public.clients
  FOR ALL USING (public.is_admin(auth.uid()));

CREATE TRIGGER trg_clients_updated
  BEFORE UPDATE ON public.clients
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_clients_phone ON public.clients(phone);
CREATE INDEX idx_clients_email ON public.clients(email);

-- ============================================================
-- RESERVATIONS
-- ============================================================
CREATE TABLE public.reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  property_id UUID REFERENCES public.properties(id) ON DELETE SET NULL,
  reservation_code TEXT NOT NULL UNIQUE,
  client_token TEXT NOT NULL UNIQUE,
  check_in DATE NOT NULL,
  check_out DATE NOT NULL,
  suite_type TEXT DEFAULT 'Suite Premium',
  guests INTEGER NOT NULL DEFAULT 1,
  status reservation_status NOT NULL DEFAULT 'confirmed',
  whatsapp_welcome_sent BOOLEAN NOT NULL DEFAULT false,
  internal_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.reservations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage reservations" ON public.reservations
  FOR ALL USING (public.is_admin(auth.uid()));

CREATE TRIGGER trg_reservations_updated
  BEFORE UPDATE ON public.reservations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_reservations_client ON public.reservations(client_id);
CREATE INDEX idx_reservations_token ON public.reservations(client_token);
CREATE INDEX idx_reservations_dates ON public.reservations(check_in, check_out);

-- Generate unique token + code
CREATE OR REPLACE FUNCTION public.generate_reservation_token()
RETURNS TEXT LANGUAGE plpgsql AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result TEXT := '';
  i INTEGER;
BEGIN
  FOR i IN 1..16 LOOP
    result := result || substr(chars, floor(random() * length(chars))::int + 1, 1);
  END LOOP;
  RETURN result;
END;
$$ SET search_path = public;

CREATE OR REPLACE FUNCTION public.generate_reservation_code()
RETURNS TEXT LANGUAGE plpgsql AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result TEXT := 'LB-';
  i INTEGER;
BEGIN
  FOR i IN 1..6 LOOP
    result := result || substr(chars, floor(random() * length(chars))::int + 1, 1);
  END LOOP;
  RETURN result;
END;
$$ SET search_path = public;

CREATE OR REPLACE FUNCTION public.set_reservation_defaults()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.client_token IS NULL OR NEW.client_token = '' THEN
    LOOP
      NEW.client_token := public.generate_reservation_token();
      EXIT WHEN NOT EXISTS (SELECT 1 FROM public.reservations WHERE client_token = NEW.client_token);
    END LOOP;
  END IF;
  IF NEW.reservation_code IS NULL OR NEW.reservation_code = '' THEN
    LOOP
      NEW.reservation_code := public.generate_reservation_code();
      EXIT WHEN NOT EXISTS (SELECT 1 FROM public.reservations WHERE reservation_code = NEW.reservation_code);
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$ SET search_path = public;

CREATE TRIGGER trg_reservation_defaults
  BEFORE INSERT ON public.reservations
  FOR EACH ROW EXECUTE FUNCTION public.set_reservation_defaults();

-- ============================================================
-- WHATSAPP TEMPLATES
-- ============================================================
CREATE TABLE public.whatsapp_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  content TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.whatsapp_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage templates" ON public.whatsapp_templates
  FOR ALL USING (public.is_admin(auth.uid()));

CREATE TRIGGER trg_templates_updated
  BEFORE UPDATE ON public.whatsapp_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- WHATSAPP LOGS
-- ============================================================
CREATE TABLE public.whatsapp_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_id UUID REFERENCES public.reservations(id) ON DELETE SET NULL,
  template_key TEXT,
  recipient_name TEXT,
  recipient_phone TEXT NOT NULL,
  content TEXT NOT NULL,
  status whatsapp_status NOT NULL DEFAULT 'pending',
  provider_message_id TEXT,
  error_message TEXT,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.whatsapp_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage whatsapp logs" ON public.whatsapp_logs
  FOR ALL USING (public.is_admin(auth.uid()));

CREATE INDEX idx_wa_logs_reservation ON public.whatsapp_logs(reservation_id);
CREATE INDEX idx_wa_logs_created ON public.whatsapp_logs(created_at DESC);

-- ============================================================
-- WHATSAPP AUTOMATIONS
-- ============================================================
CREATE TABLE public.whatsapp_automations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  template_key TEXT NOT NULL,
  trigger_type TEXT NOT NULL, -- 'on_create', 'before_checkin', 'on_checkout', 'after_checkout'
  offset_days INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.whatsapp_automations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage automations" ON public.whatsapp_automations
  FOR ALL USING (public.is_admin(auth.uid()));

CREATE TRIGGER trg_automations_updated
  BEFORE UPDATE ON public.whatsapp_automations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- MESSAGES (admin <-> client)
-- ============================================================
CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_id UUID NOT NULL REFERENCES public.reservations(id) ON DELETE CASCADE,
  sender message_sender NOT NULL,
  content TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage messages" ON public.messages
  FOR ALL USING (public.is_admin(auth.uid()));

CREATE INDEX idx_messages_reservation ON public.messages(reservation_id);

-- ============================================================
-- REVIEWS
-- ============================================================
CREATE TABLE public.reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_id UUID REFERENCES public.reservations(id) ON DELETE SET NULL,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  is_published BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage reviews" ON public.reviews
  FOR ALL USING (public.is_admin(auth.uid()));
CREATE POLICY "Anyone reads published reviews" ON public.reviews
  FOR SELECT USING (is_published = true);

-- ============================================================
-- PAYMENTS
-- ============================================================
CREATE TABLE public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_id UUID NOT NULL REFERENCES public.reservations(id) ON DELETE CASCADE,
  amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'XAF',
  status payment_status NOT NULL DEFAULT 'pending',
  payment_type TEXT, -- deposit, balance, full
  reference TEXT,
  notes TEXT,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage payments" ON public.payments
  FOR ALL USING (public.is_admin(auth.uid()));

CREATE TRIGGER trg_payments_updated
  BEFORE UPDATE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- NOTIFICATIONS
-- ============================================================
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type notification_type NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  link TEXT,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage notifications" ON public.notifications
  FOR ALL USING (public.is_admin(auth.uid()));

CREATE INDEX idx_notifications_created ON public.notifications(created_at DESC);

-- ============================================================
-- USEFUL DOCUMENTS
-- ============================================================
CREATE TABLE public.useful_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  file_type TEXT NOT NULL DEFAULT 'PDF',
  file_size TEXT,
  storage_path TEXT,
  external_url TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_public BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.useful_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public docs viewable by all" ON public.useful_documents
  FOR SELECT USING (is_public = true OR public.is_admin(auth.uid()));
CREATE POLICY "Admins manage docs" ON public.useful_documents
  FOR ALL USING (public.is_admin(auth.uid()));

CREATE TRIGGER trg_docs_updated
  BEFORE UPDATE ON public.useful_documents
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- PUBLIC FUNCTIONS for client space (token-based access)
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_client_space(_token TEXT)
RETURNS JSONB
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  result JSONB;
  reservation_data RECORD;
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
    'settings', (SELECT jsonb_object_agg(key, value) FROM public.settings WHERE is_public = true),
    'documents', COALESCE((SELECT jsonb_agg(jsonb_build_object(
      'id', id, 'title', title, 'file_type', file_type, 'file_size', file_size,
      'storage_path', storage_path, 'external_url', external_url
    ) ORDER BY display_order) FROM public.useful_documents WHERE is_public = true), '[]'::jsonb)
  ) INTO result;

  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_client_messages(_token TEXT)
RETURNS SETOF public.messages
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _reservation_id UUID;
BEGIN
  SELECT id INTO _reservation_id FROM public.reservations WHERE client_token = _token;
  IF _reservation_id IS NULL THEN RETURN; END IF;
  RETURN QUERY SELECT * FROM public.messages WHERE reservation_id = _reservation_id ORDER BY created_at ASC;
END;
$$;

CREATE OR REPLACE FUNCTION public.send_client_message(_token TEXT, _content TEXT)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _reservation_id UUID;
  _client_name TEXT;
  _msg_id UUID;
BEGIN
  SELECT r.id, c.first_name INTO _reservation_id, _client_name
  FROM public.reservations r
  JOIN public.clients c ON c.id = r.client_id
  WHERE r.client_token = _token;

  IF _reservation_id IS NULL THEN
    RAISE EXCEPTION 'Invalid token';
  END IF;

  IF length(trim(_content)) = 0 OR length(_content) > 2000 THEN
    RAISE EXCEPTION 'Invalid message content';
  END IF;

  INSERT INTO public.messages(reservation_id, sender, content)
  VALUES (_reservation_id, 'client', _content)
  RETURNING id INTO _msg_id;

  INSERT INTO public.notifications(type, title, body, link)
  VALUES ('message', 'Nouveau message client', _client_name || ' a envoyé un message', '/admin/messages');

  RETURN _msg_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.submit_client_review(_token TEXT, _rating INTEGER, _comment TEXT)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _reservation_id UUID;
  _client_id UUID;
  _client_name TEXT;
  _review_id UUID;
BEGIN
  SELECT r.id, r.client_id, c.first_name INTO _reservation_id, _client_id, _client_name
  FROM public.reservations r
  JOIN public.clients c ON c.id = r.client_id
  WHERE r.client_token = _token;

  IF _reservation_id IS NULL THEN
    RAISE EXCEPTION 'Invalid token';
  END IF;

  IF _rating < 1 OR _rating > 5 THEN
    RAISE EXCEPTION 'Rating must be between 1 and 5';
  END IF;

  INSERT INTO public.reviews(reservation_id, client_id, rating, comment, is_published)
  VALUES (_reservation_id, _client_id, _rating, _comment, false)
  RETURNING id INTO _review_id;

  INSERT INTO public.notifications(type, title, body, link)
  VALUES ('review', 'Nouvel avis reçu', _client_name || ' a laissé un avis (' || _rating || '/5)', '/admin/reviews');

  RETURN _review_id;
END;
$$;

-- ============================================================
-- STORAGE BUCKETS
-- ============================================================
INSERT INTO storage.buckets (id, name, public) VALUES ('documents', 'documents', true) ON CONFLICT DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('banners', 'banners', true) ON CONFLICT DO NOTHING;

CREATE POLICY "Public can read documents" ON storage.objects
  FOR SELECT USING (bucket_id IN ('documents', 'banners'));
CREATE POLICY "Admins upload documents" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id IN ('documents', 'banners') AND public.is_admin(auth.uid()));
CREATE POLICY "Admins update documents" ON storage.objects
  FOR UPDATE USING (bucket_id IN ('documents', 'banners') AND public.is_admin(auth.uid()));
CREATE POLICY "Admins delete documents" ON storage.objects
  FOR DELETE USING (bucket_id IN ('documents', 'banners') AND public.is_admin(auth.uid()));

-- ============================================================
-- REALTIME for messages & notifications
-- ============================================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.reservations;

-- ============================================================
-- SEED DATA
-- ============================================================
INSERT INTO public.properties (name, subtitle, location, address, contact_email, contact_phone, whatsapp_number, banner_title, banner_message, is_default)
VALUES (
  'LB Prestige Appart',
  'KOTTO • CARREFOUR DES ROSES',
  'Douala, Cameroun',
  'Carrefour des Roses, Kotto, Douala',
  'conciergerie@lb-prestige.cm',
  '+237 6 90 00 00 00',
  '+33660061723',
  'Bienvenue chez LB Prestige Appart',
  'Votre séjour d''exception commence ici.',
  true
);

-- Public settings
INSERT INTO public.settings (key, value, description, is_public) VALUES
('access_codes', '{"door": "4782#", "safe": "1956", "instructions": "À votre arrivée, composez le code porte sur le clavier de l''entrée principale puis #. Le coffre se trouve dans le dressing de la chambre principale."}'::jsonb, 'Codes d''accès', true),
('wifi', '{"ssid": "LB-Prestige-5G", "password": "Prestige@Kotto2026"}'::jsonb, 'Wi-Fi', true),
('netflix', '{"username": "famille@lb-prestige.cm", "password": "Netflix2026!", "instructions": "Connectez-vous via l''app Netflix sur la TV. Profil ''Invités''."}'::jsonb, 'Netflix', true),
('kitchen', '{"text": "La cuisine est entièrement équipée : plaques, four, micro-ondes, lave-vaisselle, machine à café Nespresso, bouilloire, grille-pain. Merci de laisser la cuisine propre après usage."}'::jsonb, 'Cuisine', true),
('parking', '{"text": "Place de parking privée n°3 dans le sous-sol. Accès via le portail télécommandé (télécommande dans le tiroir de l''entrée)."}'::jsonb, 'Parking', true),
('house_rules', '{"text": "Bienvenue à LB Prestige Appart.\n\nAfin de garantir un séjour agréable à tous nos hôtes, merci de respecter les règles suivantes :\n\n• Heure d''arrivée : à partir de 15h00\n• Heure de départ : avant 11h00\n• L''appartement est strictement non-fumeur\n• Les animaux ne sont pas admis\n• Merci de respecter le calme du voisinage entre 22h00 et 07h00\n• Aucune fête ou événement n''est autorisé sans accord préalable\n• L''appartement doit être restitué dans un état de propreté correct\n• Tout dégât matériel sera facturé selon devis\n• Nombre maximum d''occupants : 4 personnes\n\nPour toute question, votre conciergerie est joignable 7j/7 de 8h à 22h via la messagerie de votre espace client.\n\nNous vous souhaitons un excellent séjour."}'::jsonb, 'Règlement intérieur', true),
('useful_contacts', '{"phone": "+237 6 90 00 00 00", "email": "conciergerie@lb-prestige.cm", "hours": "7j/7 de 8h à 22h"}'::jsonb, 'Contacts utiles', true);

-- WhatsApp templates
INSERT INTO public.whatsapp_templates (key, name, content, description) VALUES
('welcome', 'Bienvenue', 'Cher(e) {prenom},

C''est avec un immense plaisir que nous vous souhaitons la bienvenue chez LB Prestige Appart — votre adresse d''exception pour un séjour raffiné et inoubliable.

Pour accéder à votre espace personnel (Wi-Fi, code d''entrée, services, règlement intérieur), voici vos identifiants :
{lien}

Votre code personnel d''accès est :
{code}

Nous restons à votre disposition et vous souhaitons un excellent séjour.', 'Envoyé à la création de la réservation'),
('arrival_reminder', 'Rappel arrivée', 'Cher(e) {prenom},

Votre arrivée chez LB Prestige Appart approche ! Nous avons hâte de vous accueillir.

Retrouvez toutes les informations pratiques (accès, codes, Wi-Fi) ici :
{lien}', 'Rappel J-2 avant arrivée'),
('promotion', 'Promotion', 'Cher(e) {prenom},

Profitez de notre offre spéciale pour votre prochain séjour chez LB Prestige Appart !

Réservez directement via votre espace personnel :
{lien}', 'Offre commerciale'),
('thanks', 'Remerciement', 'Cher(e) {prenom},

Merci d''avoir choisi LB Prestige Appart pour votre séjour. Nous espérons que vous avez passé un moment exceptionnel.

Nous serions honorés de recevoir votre avis ici :
{lien}', 'Après le départ'),
('checkout', 'Check-out', 'Cher(e) {prenom},

Votre départ approche. Quelques rappels pour le check-out :
- Heure de départ : avant 11h
- Merci de fermer portes et fenêtres
- Merci de nous signaler tout besoin particulier

Nous vous remercions pour votre confiance.', 'Veille du départ');

-- WhatsApp automations
INSERT INTO public.whatsapp_automations (key, name, template_key, trigger_type, offset_days, description) VALUES
('auto_welcome', 'Message de bienvenue automatique', 'welcome', 'on_create', 0, 'Envoyé automatiquement à la création'),
('auto_reminder', 'Rappel d''arrivée', 'arrival_reminder', 'before_checkin', 2, 'Envoyé 2 jours avant l''arrivée'),
('auto_checkout', 'Rappel check-out', 'checkout', 'before_checkin', -1, 'Envoyé la veille du départ (offset négatif depuis check_out)'),
('auto_thanks', 'Remerciement post-séjour', 'thanks', 'after_checkout', 1, 'Envoyé 1 jour après le départ'),
('auto_review', 'Demande d''avis', 'thanks', 'after_checkout', 3, 'Envoyé 3 jours après le départ');

-- Useful documents (placeholders)
INSERT INTO public.useful_documents (title, file_type, file_size, external_url, display_order) VALUES
('Fiche séjour personnalisée', 'PDF', '1.2 Mo', '#', 1),
('Contrat de location courte durée', 'PDF', '240 Ko', '#', 2),
('Consignes d''arrivée détaillées', 'PDF', '180 Ko', '#', 3),
('Plan du quartier & adresses utiles', 'PDF', '850 Ko', '#', 4);

-- Demo clients & reservations
DO $$
DECLARE
  prop_id UUID;
  client1_id UUID;
  client2_id UUID;
BEGIN
  SELECT id INTO prop_id FROM public.properties WHERE is_default = true LIMIT 1;

  INSERT INTO public.clients (first_name, last_name, phone, email)
  VALUES ('Émilie', 'Dubois', '+33612345678', 'emilie.dubois@example.com')
  RETURNING id INTO client1_id;

  INSERT INTO public.clients (first_name, last_name, phone, email)
  VALUES ('Jean', 'Mbarga', '+237699887766', 'jean.mbarga@example.com')
  RETURNING id INTO client2_id;

  INSERT INTO public.reservations (client_id, property_id, check_in, check_out, suite_type, guests, status)
  VALUES (client1_id, prop_id, '2026-04-12', '2026-04-18', 'Suite Premium', 2, 'confirmed');

  INSERT INTO public.reservations (client_id, property_id, check_in, check_out, suite_type, guests, status)
  VALUES (client2_id, prop_id, CURRENT_DATE, CURRENT_DATE + 4, 'Suite Premium', 3, 'in_progress');
END $$;
