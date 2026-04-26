import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Crown, Wifi, KeyRound, Tv, ChefHat, Car, BookOpen, Phone, Mail,
  MessageSquare, FileText, Star, MapPin, CalendarDays, Send, ExternalLink, Sparkles
} from "lucide-react";
import { toast } from "sonner";
import { formatDate, nightsBetween, formatDateTime } from "@/lib/format";

export default function ClientSpace() {
  const { token } = useParams<{ token: string }>();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"home" | "info" | "messages" | "docs" | "review">("home");
  const [messages, setMessages] = useState<any[]>([]);
  const [msg, setMsg] = useState("");
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");

  useEffect(() => {
    (async () => {
      if (!token) return;
      const { data: res } = await supabase.rpc("get_client_space", { _token: token });
      setData(res);
      setLoading(false);
      const { data: msgs } = await supabase.rpc("get_client_messages", { _token: token });
      setMessages((msgs as any) ?? []);
    })();
  }, [token]);

  useEffect(() => {
    if (!data?.reservation?.id) return;
    const ch = supabase.channel(`client-${data.reservation.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `reservation_id=eq.${data.reservation.id}` },
        (p) => setMessages((m) => [...m, p.new]))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [data?.reservation?.id]);

  async function sendMessage() {
    if (!msg.trim() || !token) return;
    const { error } = await supabase.rpc("send_client_message", { _token: token, _content: msg.trim() });
    if (error) return toast.error(error.message);
    setMsg("");
  }

  async function submitReview() {
    if (!token) return;
    const { error } = await supabase.rpc("submit_client_review", { _token: token, _rating: rating, _comment: comment });
    if (error) return toast.error(error.message);
    toast.success("Merci pour votre avis !");
    setComment("");
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center">Chargement…</div>;

  if (!data) return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <Card className="p-8 max-w-md text-center">
        <h1 className="font-display text-2xl mb-2">Lien invalide</h1>
        <p className="text-sm text-muted-foreground mb-4">Ce lien client n'existe pas ou a expiré.</p>
        <Link to="/"><Button variant="outline">Retour à l'accueil</Button></Link>
      </Card>
    </div>
  );

  const { reservation, client, property, settings, documents } = data;
  const wa = (property?.whatsapp ?? "").replace(/\D/g, "");

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Banner */}
      <header className="relative overflow-hidden">
        {property?.banner_url ? (
          <img src={property.banner_url} alt="" className="w-full h-64 md:h-80 object-cover" />
        ) : (
          <div className="w-full h-64 md:h-80 bg-noir relative">
            <div className="absolute inset-0 opacity-20" style={{ background: "var(--gradient-gold)" }} />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-noir via-noir/40 to-transparent flex flex-col items-center justify-end pb-8 px-6 text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full gradient-gold mb-3 shadow-gold">
            <Crown className="w-6 h-6 text-noir" />
          </div>
          <h1 className="font-display text-4xl md:text-5xl text-gold-gradient mb-1">{property?.name ?? "LB Prestige Appart"}</h1>
          <p className="text-xs tracking-[0.3em] text-ivory/80 uppercase">{property?.subtitle}</p>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 -mt-8 relative z-10 pb-12">
        {/* Welcome card */}
        <Card className="p-6 bg-card shadow-elegant border-gold/20 mb-6">
          <div className="flex items-center gap-2 text-xs text-gold uppercase tracking-wider mb-2">
            <Sparkles className="w-3 h-3" /> Bienvenue
          </div>
          <h2 className="font-display text-3xl text-foreground mb-1">Cher(e) {client?.first_name},</h2>
          <p className="text-sm text-muted-foreground mb-4">
            {property?.banner_message ?? "Votre séjour d'exception commence ici."}
          </p>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="flex items-center gap-2 p-3 bg-muted rounded-md">
              <CalendarDays className="w-4 h-4 text-gold shrink-0" />
              <div>
                <div className="text-[10px] uppercase text-muted-foreground tracking-wider">Arrivée</div>
                <div className="font-medium">{formatDate(reservation.check_in)}</div>
              </div>
            </div>
            <div className="flex items-center gap-2 p-3 bg-muted rounded-md">
              <CalendarDays className="w-4 h-4 text-gold shrink-0" />
              <div>
                <div className="text-[10px] uppercase text-muted-foreground tracking-wider">Départ</div>
                <div className="font-medium">{formatDate(reservation.check_out)}</div>
              </div>
            </div>
            <div className="col-span-2 p-3 bg-muted rounded-md text-center">
              <span className="text-xs text-muted-foreground">{reservation.suite_type} • {nightsBetween(reservation.check_in, reservation.check_out)} nuits • {reservation.guests} voyageur(s)</span>
              <div className="font-mono text-xs text-gold mt-1">Code séjour : {reservation.code}</div>
            </div>
          </div>
        </Card>

        {/* Tabs */}
        <div className="flex gap-1 mb-4 overflow-x-auto pb-1">
          {[
            { k: "home", label: "Accueil" },
            { k: "info", label: "Infos pratiques" },
            { k: "messages", label: "Messages" },
            { k: "docs", label: "Documents" },
            { k: "review", label: "Laisser un avis" },
          ].map((t) => (
            <button key={t.k} onClick={() => setTab(t.k as any)}
              className={`whitespace-nowrap px-4 py-2 rounded-md text-sm transition ${tab === t.k ? "bg-gold text-noir font-medium" : "bg-card border border-border hover:border-gold/40"}`}>
              {t.label}
            </button>
          ))}
        </div>

        {tab === "home" && (
          <div className="grid gap-4">
            <InfoCard icon={KeyRound} title="Codes d'accès">
              <div className="grid grid-cols-2 gap-3">
                <KeyValue label="Code porte" value={settings?.access_codes?.door} />
                <KeyValue label="Code coffre" value={settings?.access_codes?.safe} />
              </div>
              {settings?.access_codes?.instructions && <p className="text-sm text-muted-foreground mt-3 italic">{settings.access_codes.instructions}</p>}
            </InfoCard>

            <InfoCard icon={Wifi} title="Wi-Fi">
              <KeyValue label="Réseau" value={settings?.wifi?.ssid} />
              <KeyValue label="Mot de passe" value={settings?.wifi?.password} />
            </InfoCard>

            {wa && (
              <a href={`https://wa.me/${wa}`} target="_blank" rel="noreferrer">
                <Card className="p-5 bg-card border-gold/30 hover:border-gold transition cursor-pointer">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full gradient-gold flex items-center justify-center"><MessageSquare className="w-5 h-5 text-noir" /></div>
                    <div>
                      <div className="font-medium">Contacter la conciergerie sur WhatsApp</div>
                      <div className="text-xs text-muted-foreground">{property?.whatsapp}</div>
                    </div>
                    <ExternalLink className="w-4 h-4 ml-auto text-muted-foreground" />
                  </div>
                </Card>
              </a>
            )}
          </div>
        )}

        {tab === "info" && (
          <div className="grid gap-4">
            <InfoCard icon={Tv} title="Netflix">
              <KeyValue label="Identifiant" value={settings?.netflix?.username} />
              <KeyValue label="Mot de passe" value={settings?.netflix?.password} />
              {settings?.netflix?.instructions && <p className="text-sm text-muted-foreground mt-3">{settings.netflix.instructions}</p>}
            </InfoCard>
            <InfoCard icon={ChefHat} title="Cuisine">
              <p className="text-sm text-muted-foreground whitespace-pre-line">{settings?.kitchen?.text}</p>
            </InfoCard>
            <InfoCard icon={Car} title="Parking">
              <p className="text-sm text-muted-foreground whitespace-pre-line">{settings?.parking?.text}</p>
            </InfoCard>
            <InfoCard icon={BookOpen} title="Règlement intérieur">
              <p className="text-sm text-muted-foreground whitespace-pre-line">{settings?.house_rules?.text}</p>
            </InfoCard>
            <InfoCard icon={Phone} title="Contacts utiles">
              {settings?.useful_contacts?.phone && <KeyValue label="Téléphone" value={settings.useful_contacts.phone} />}
              {settings?.useful_contacts?.email && <KeyValue label="E-mail" value={settings.useful_contacts.email} />}
              {settings?.useful_contacts?.hours && <KeyValue label="Horaires" value={settings.useful_contacts.hours} />}
            </InfoCard>
            <InfoCard icon={MapPin} title="Localisation">
              <p className="text-sm">{property?.location}</p>
            </InfoCard>
          </div>
        )}

        {tab === "messages" && (
          <Card className="bg-card border-border flex flex-col h-[60vh]">
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.length === 0 && <p className="text-center text-xs text-muted-foreground py-8">Démarrez la conversation avec votre conciergerie.</p>}
              {messages.map((m) => (
                <div key={m.id} className={`flex ${m.sender === "client" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[80%] px-4 py-2 rounded-2xl ${m.sender === "client" ? "bg-gold text-noir" : "bg-muted"}`}>
                    <div className="text-sm whitespace-pre-wrap">{m.content}</div>
                    <div className="text-[10px] opacity-60 mt-1">{formatDateTime(m.created_at)}</div>
                  </div>
                </div>
              ))}
            </div>
            <div className="p-3 border-t border-border flex gap-2">
              <Textarea rows={2} value={msg} onChange={(e) => setMsg(e.target.value)} placeholder="Votre message à la conciergerie…" />
              <Button onClick={sendMessage} className="gradient-gold text-noir self-end"><Send className="w-4 h-4" /></Button>
            </div>
          </Card>
        )}

        {tab === "docs" && (
          <div className="grid gap-3">
            {documents.length === 0 && <Card className="p-8 text-center text-sm text-muted-foreground">Aucun document.</Card>}
            {documents.map((d: any) => (
              <a key={d.id} href={d.external_url ?? "#"} target="_blank" rel="noreferrer">
                <Card className="p-4 bg-card border-border hover:border-gold/40 transition flex items-center gap-3">
                  <div className="w-10 h-10 rounded-md gradient-gold flex items-center justify-center"><FileText className="w-5 h-5 text-noir" /></div>
                  <div className="flex-1">
                    <div className="font-medium text-sm">{d.title}</div>
                    <div className="text-xs text-muted-foreground">{d.file_type} {d.file_size && `• ${d.file_size}`}</div>
                  </div>
                  <ExternalLink className="w-4 h-4 text-muted-foreground" />
                </Card>
              </a>
            ))}
          </div>
        )}

        {tab === "review" && (
          <Card className="p-6 bg-card border-border">
            <h2 className="font-display text-2xl text-gold-gradient mb-2">Votre avis nous est précieux</h2>
            <p className="text-sm text-muted-foreground mb-5">Notez votre séjour et partagez votre expérience.</p>
            <div className="flex gap-2 mb-5 justify-center">
              {[1, 2, 3, 4, 5].map((n) => (
                <button key={n} onClick={() => setRating(n)} className="transition hover:scale-110">
                  <Star className={`w-9 h-9 ${n <= rating ? "fill-gold text-gold" : "text-muted-foreground"}`} />
                </button>
              ))}
            </div>
            <div className="space-y-3">
              <div>
                <Label>Commentaire (optionnel)</Label>
                <Textarea rows={5} value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Partagez votre expérience…" />
              </div>
              <Button onClick={submitReview} className="w-full gradient-gold text-noir">Envoyer mon avis</Button>
            </div>
          </Card>
        )}

        <footer className="text-center text-xs text-muted-foreground mt-10 py-6">
          © {new Date().getFullYear()} {property?.name} • Conciergerie d'Exception
        </footer>
      </main>
    </div>
  );
}

function InfoCard({ icon: Icon, title, children }: any) {
  return (
    <Card className="p-5 bg-card border-border">
      <div className="flex items-center gap-2 mb-3">
        <Icon className="w-5 h-5 text-gold" />
        <h3 className="font-display text-xl">{title}</h3>
      </div>
      {children}
    </Card>
  );
}

function KeyValue({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  return (
    <div className="py-1.5 border-b border-border last:border-0">
      <div className="text-[10px] uppercase text-muted-foreground tracking-wider">{label}</div>
      <div className="font-mono text-sm text-foreground">{value}</div>
    </div>
  );
}
