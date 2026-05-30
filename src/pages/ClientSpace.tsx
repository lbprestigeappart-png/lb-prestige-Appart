import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Crown } from "lucide-react";
import { toast } from "sonner";

// Premium components
import "@/components/client/animations.css";
import ClientBanner from "@/components/client/ClientBanner";
import WelcomeCard from "@/components/client/WelcomeCard";
import ClientNavigation, { type ClientTab } from "@/components/client/ClientNavigation";
import AccessCodes from "@/components/client/AccessCodes";
import WifiCard from "@/components/client/WifiCard";
import WhatsappCta from "@/components/client/WhatsappCta";
import InfoPratiques from "@/components/client/InfoPratiques";
import ClientChat from "@/components/client/ClientChat";
import DocumentsList from "@/components/client/DocumentsList";
import ReviewForm, { type ReviewData } from "@/components/client/ReviewForm";
import RestaurantsSection, { type CartItem } from "@/components/client/RestaurantsSection";

export default function ClientSpace() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<ClientTab>("home");
  const [restaurants, setRestaurants] = useState<any[]>([]);
  const [cart, setCart] = useState<Record<string, CartItem>>({});
  const [messages, setMessages] = useState<any[]>([]);

  /* ─── Data fetching ─── */
  async function refresh() {
    if (!token) return;
    const { data: res } = await supabase.rpc("get_client_space", { _token: token });
    const base: any = res;
    if (!base || base.status === "invalid" || base.status === "expired") {
      setData(base ?? { status: "invalid" });
      return;
    }
    const { data: r } = await supabase
      .from("reservations")
      .select("rules_signed_at, rules_signed_name, client_link_opened_at")
      .eq("client_token", token)
      .maybeSingle();
    if (r) base.reservation = { ...base.reservation, ...r };
    setData(base);
  }

  useEffect(() => {
    (async () => {
      if (!token) return;
      supabase.rpc("mark_client_link_opened", { _token: token });
      await refresh();
      setLoading(false);
      const { data: msgs } = await supabase.rpc("get_client_messages", { _token: token });
      setMessages((msgs as any) ?? []);
    })();
  }, [token]);

  /* ─── Realtime subscriptions ─── */
  useEffect(() => {
    if (!token) return;
    const ch = supabase
      .channel(`property-updates-${token}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "properties" }, () => refresh())
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "settings" }, () => refresh())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [token]);

  useEffect(() => {
    if (!data?.reservation?.id) return;
    const ch = supabase
      .channel(`client-${data.reservation.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `reservation_id=eq.${data.reservation.id}` },
        (p) => setMessages((m) => [...m, p.new])
      )
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [data?.reservation?.id]);

  /* ─── Restaurants ─── */
  async function loadRestaurants() {
    const [{ data: rs }, { data: ds }, { data: bs }] = await Promise.all([
      supabase.from("restaurants" as any).select("*").order("display_order").order("created_at"),
      supabase.from("restaurant_dishes" as any).select("*").order("display_order"),
      supabase.from("restaurant_drinks" as any).select("*").order("display_order"),
    ]);
    const grouped = ((rs ?? []) as any[]).map((r) => ({
      ...r,
      dishes: ((ds ?? []) as any[]).filter((d) => d.restaurant_id === r.id),
      drinks: ((bs ?? []) as any[]).filter((d) => d.restaurant_id === r.id),
    }));
    setRestaurants(grouped);
  }

  useEffect(() => { loadRestaurants(); }, []);
  useEffect(() => {
    const ch = supabase
      .channel("restaurants-public")
      .on("postgres_changes", { event: "*", schema: "public", table: "restaurants" }, () => loadRestaurants())
      .on("postgres_changes", { event: "*", schema: "public", table: "restaurant_dishes" }, () => loadRestaurants())
      .on("postgres_changes", { event: "*", schema: "public", table: "restaurant_drinks" }, () => loadRestaurants())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  /* ─── Actions ─── */
  async function sendMessage(content: string) {
    if (!token) return;
    const { error } = await supabase.rpc("send_client_message", { _token: token, _content: content });
    if (error) toast.error(error.message);
  }

  async function signRules(name: string) {
    if (!token) return;
    const { error } = await supabase.rpc("sign_rules", { _token: token, _signed_name: name });
    if (error) { toast.error(error.message); return; }
    toast.success("Règlement intérieur signé. Merci !");
    refresh();
  }

  async function uploadIdFile(file: File, kind: "front" | "back"): Promise<string> {
    if (!token) throw new Error("Token manquant");
    const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
    const path = `${token}/${kind}-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("id-documents").upload(path, file, {
      upsert: true,
      contentType: file.type || "image/jpeg",
    });
    if (error) throw new Error(`Échec de l'envoi (${kind}) : ${error.message}`);
    return path;
  }

  async function submitId({ idNumber, frontFile, backFile }: { idNumber: string; frontFile: File | null; backFile: File | null }) {
    if (!token) return;
    let frontPath: string | null = data?.id_document?.front_path ?? null;
    let backPath: string | null = data?.id_document?.back_path ?? null;
    try {
      if (frontFile) frontPath = await uploadIdFile(frontFile, "front");
      if (backFile) backPath = await uploadIdFile(backFile, "back");
    } catch (e: any) {
      toast.error(e?.message ?? "Échec de l'envoi des photos.");
      return;
    }
    const { error } = await supabase.rpc("submit_client_id", {
      _token: token,
      _id_number: idNumber,
      _front_path: frontPath,
      _back_path: backPath,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Pièce d'identité transmise. Merci !");
    refresh();
  }

  async function submitReview(reviewData: ReviewData) {
    if (!token) return;
    const { error } = await supabase.rpc("submit_client_booking_review", {
      _token: token,
      _guest_name: reviewData.guest_name,
      _country: reviewData.country || null,
      _booking_ref: reviewData.booking_ref || null,
      _global_score: reviewData.global_score,
      _cleanliness: reviewData.cleanliness,
      _comfort: reviewData.comfort,
      _location: reviewData.location,
      _staff: reviewData.staff,
      _value: reviewData.value,
      _comment: reviewData.comment,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Merci ! Votre avis a bien été enregistré.");
    navigate("/avis/merci", {
      state: {
        guest_name: reviewData.guest_name,
        global_score: reviewData.global_score,
        cleanliness: reviewData.cleanliness,
        comfort: reviewData.comfort,
        location: reviewData.location,
        staff: reviewData.staff,
        value: reviewData.value,
        comment: reviewData.comment,
        booking_property_id: data?.settings?.booking_property_id ?? data?.property?.booking_property_id ?? null,
      },
    });
  }

  /* ─── Loading state ─── */
  if (loading) {
    return (
      <div className="client-theme min-h-screen flex flex-col items-center justify-center bg-background p-6">
        <div className="w-14 h-14 rounded-full gradient-gold flex items-center justify-center shadow-gold mb-4 animate-pulse-gold">
          <Crown className="w-7 h-7 text-noir" />
        </div>
        <div className="animate-shimmer h-4 w-32 rounded-full" />
      </div>
    );
  }

  /* ─── Invalid token ─── */
  if (!data || data.status === "invalid") {
    return (
      <div className="client-theme min-h-screen flex items-center justify-center bg-background p-6">
        <Card className="p-10 max-w-md text-center bg-card border-gold/30 shadow-elegant animate-scale-in">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-destructive/10 mb-5 mx-auto">
            <Crown className="w-7 h-7 text-destructive" />
          </div>
          <h1 className="font-display text-3xl text-gold-gradient mb-3">Lien invalide</h1>
          <p className="text-sm text-muted-foreground mb-6">
            Ce lien client est introuvable. Vérifiez l'adresse reçue ou contactez la conciergerie.
          </p>
          <Link to="/"><Button variant="outline" className="border-gold/40">Retour à l'accueil</Button></Link>
        </Card>
      </div>
    );
  }

  /* ─── Expired ─── */
  if (data.status === "expired") {
    return (
      <div className="client-theme min-h-screen flex items-center justify-center bg-background p-6">
        <Card className="p-10 max-w-lg text-center bg-card border-gold/30 shadow-elegant animate-scale-in">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full gradient-gold mb-5 mx-auto shadow-gold">
            <Crown className="w-7 h-7 text-noir" />
          </div>
          <h1 className="font-display text-3xl text-gold-gradient mb-3">Votre accès a expiré</h1>
          <p className="text-sm text-muted-foreground leading-relaxed mb-2">
            {data.client?.first_name ? `Cher(e) ${data.client.first_name},` : ""}
          </p>
          <p className="text-sm text-foreground leading-relaxed mb-6">
            Merci pour votre séjour chez <span className="text-gold">{data.property?.name ?? "LB Prestige Appart"}</span>.
            <br />À très bientôt.
          </p>
          <Link to="/"><Button variant="outline" className="border-gold/40">Retour à l'accueil</Button></Link>
        </Card>
      </div>
    );
  }

  /* ─── Main render ─── */
  const { reservation, client, property, settings } = data;
  const documents: any[] = Array.isArray(data.documents) ? data.documents : [];
  const unreadMessages = messages.filter((m) => m.sender === "admin" && !m.is_read).length;

  return (
    <div className="client-theme min-h-screen bg-background text-foreground">
      {/* Premium Banner */}
      <ClientBanner
        bannerUrl={property?.banner_url}
        bannerTitle={property?.banner_title}
        propertyName={property?.name}
        subtitle={property?.subtitle}
      />

      {/* Content */}
      <main className="max-w-3xl mx-auto px-4 -mt-10 relative z-10 pb-12">
        {/* Welcome Card */}
        <WelcomeCard
          firstName={client?.first_name}
          bannerMessage={property?.banner_message}
          checkIn={reservation.check_in}
          checkOut={reservation.check_out}
          suiteType={reservation.suite_type}
          guests={reservation.guests}
          code={reservation.code ?? reservation.reservation_code}
          status={reservation.status}
        />

        {/* Navigation */}
        <div className="mt-6">
          <ClientNavigation
            activeTab={tab}
            onTabChange={setTab}
            unreadMessages={unreadMessages}
          />
        </div>

        {/* Tab content */}
        <div className="mt-2">
          {tab === "home" && (
            <div className="grid gap-4 animate-fade-in">
              <AccessCodes
                doorCode={settings?.access_codes?.door}
                safeCode={settings?.access_codes?.safe}
                instructions={settings?.access_codes?.instructions}
              />
              <WifiCard
                ssid={settings?.wifi?.ssid}
                password={settings?.wifi?.password}
              />
            </div>
          )}

          {tab === "info" && (
            <InfoPratiques
              settings={settings}
              property={property}
              reservation={reservation}
              token={token!}
              idDocument={data.id_document}
              onRefresh={refresh}
              onSignRules={signRules}
              onSubmitId={submitId}
            />
          )}

          {tab === "messages" && (
            <ClientChat
              messages={messages}
              onSend={sendMessage}
            />
          )}

          {tab === "docs" && (
            <DocumentsList documents={documents} />
          )}

          {tab === "review" && (
            <ReviewForm
              clientFirstName={client?.first_name}
              clientLastName={client?.last_name}
              bookingReviewUrl={settings?.booking_review_url ? String(settings.booking_review_url) : undefined}
              onSubmit={submitReview}
            />
          )}

          {tab === "restaurants" && (
            <RestaurantsSection
              restaurants={restaurants}
              cart={cart}
              setCart={setCart}
            />
          )}
        </div>

        {/* Footer */}
        <footer className="text-center text-xs text-muted-foreground mt-10 py-6 border-t border-border/30">
          <div className="flex items-center justify-center gap-2 mb-2">
            <div className="w-5 h-5 rounded-full gradient-gold flex items-center justify-center">
              <Crown className="w-2.5 h-2.5 text-noir" />
            </div>
            <span className="font-display text-sm text-gold/80">{property?.name || "LB Prestige Appart"}</span>
          </div>
          © {new Date().getFullYear()} — Conciergerie d'Exception
        </footer>
      </main>

      {/* Floating WhatsApp CTA */}
      <WhatsappCta phone={property?.whatsapp ?? property?.whatsapp_number} />
    </div>
  );
}
