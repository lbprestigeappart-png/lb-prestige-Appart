import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import PageHeader from "@/components/admin/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Send } from "lucide-react";
import { toast } from "sonner";
import { formatDateTime, statusLabel } from "@/lib/format";

export default function WhatsappPage() {
  const [reservations, setReservations] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [resId, setResId] = useState("");
  const [tplKey, setTplKey] = useState("");
  const [customPhone, setCustomPhone] = useState("");
  const [customContent, setCustomContent] = useState("");
  const [busy, setBusy] = useState(false);

  async function load() {
    const [r, t, l] = await Promise.all([
      supabase.from("reservations").select("id, reservation_code, client_token, clients(first_name,last_name,phone)").order("check_in", { ascending: false }),
      supabase.from("whatsapp_templates").select("*").eq("is_active", true).order("name"),
      supabase.from("whatsapp_logs").select("*").order("created_at", { ascending: false }).limit(50),
    ]);
    setReservations(r.data ?? []);
    setTemplates(t.data ?? []);
    setLogs(l.data ?? []);
  }
  useEffect(() => { load(); }, []);

  async function sendTemplate() {
    if (!resId || !tplKey) return toast.error("Réservation et modèle requis");
    setBusy(true);
    const { error } = await supabase.functions.invoke("send-whatsapp", {
      body: { reservation_id: resId, template_key: tplKey },
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Envoi déclenché");
    load();
  }

  async function sendCustom() {
    if (!customPhone || !customContent) return toast.error("Téléphone et message requis");
    setBusy(true);
    const { error } = await supabase.functions.invoke("send-whatsapp", {
      body: { phone: customPhone, content: customContent },
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Envoi déclenché");
    setCustomContent("");
    load();
  }

  const statusColor: Record<string, string> = {
    sent: "text-blue-400", delivered: "text-green-400", read: "text-gold", failed: "text-red-400", pending: "text-orange-400",
  };

  return (
    <div className="p-8 max-w-7xl">
      <PageHeader title="WhatsApp" subtitle="Envoi manuel & historique des messages" />

      <div className="grid md:grid-cols-2 gap-4 mb-8">
        <Card className="p-5 bg-card border-border">
          <h2 className="font-display text-xl text-gold-gradient mb-4">Envoi par modèle</h2>
          <div className="space-y-3">
            <div>
              <Label>Réservation</Label>
              <Select value={resId} onValueChange={setResId}>
                <SelectTrigger><SelectValue placeholder="Sélectionner…" /></SelectTrigger>
                <SelectContent>
                  {reservations.map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.clients?.first_name} {r.clients?.last_name} — {r.reservation_code}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Modèle</Label>
              <Select value={tplKey} onValueChange={setTplKey}>
                <SelectTrigger><SelectValue placeholder="Sélectionner…" /></SelectTrigger>
                <SelectContent>
                  {templates.map((t) => <SelectItem key={t.key} value={t.key}>{t.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={sendTemplate} disabled={busy} className="w-full gradient-gold text-noir">
              <Send className="w-4 h-4 mr-2" /> {busy ? "Envoi…" : "Envoyer"}
            </Button>
          </div>
        </Card>

        <Card className="p-5 bg-card border-border">
          <h2 className="font-display text-xl text-gold-gradient mb-4">Message libre</h2>
          <div className="space-y-3">
            <div>
              <Label>Téléphone (format international)</Label>
              <Input value={customPhone} onChange={(e) => setCustomPhone(e.target.value)} placeholder="+237..." />
            </div>
            <div>
              <Label>Message</Label>
              <Textarea rows={4} value={customContent} onChange={(e) => setCustomContent(e.target.value)} />
            </div>
            <Button onClick={sendCustom} disabled={busy} className="w-full gradient-gold text-noir">
              <Send className="w-4 h-4 mr-2" /> Envoyer
            </Button>
          </div>
        </Card>
      </div>

      <Card className="p-5 bg-card border-border">
        <h2 className="font-display text-xl text-gold-gradient mb-4">Historique (50 derniers)</h2>
        <div className="space-y-2">
          {logs.length === 0 && <p className="text-sm text-muted-foreground py-6 text-center">Aucun envoi pour le moment.</p>}
          {logs.map((l) => (
            <div key={l.id} className="flex items-start justify-between gap-4 py-2 border-b border-border last:border-0">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-sm">{l.recipient_name ?? l.recipient_phone}</span>
                  <span className="text-xs text-muted-foreground">{l.recipient_phone}</span>
                  {l.template_key && <span className="text-[10px] px-2 py-0.5 rounded-full bg-gold/10 text-gold border border-gold/30">{l.template_key}</span>}
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2">{l.content}</p>
                {l.error_message && <p className="text-xs text-red-400 mt-1">{l.error_message}</p>}
              </div>
              <div className="text-right shrink-0">
                <div className={`text-xs font-medium ${statusColor[l.status]}`}>{statusLabel(l.status)}</div>
                <div className="text-[10px] text-muted-foreground">{formatDateTime(l.created_at)}</div>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
