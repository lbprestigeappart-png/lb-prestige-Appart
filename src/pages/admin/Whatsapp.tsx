import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import PageHeader from "@/components/admin/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Send, Eye, ExternalLink, CheckCircle2, XCircle, RefreshCw, Copy, Phone } from "lucide-react";
import { toast } from "sonner";
import { formatDateTime, statusLabel, statusColor, buildClientLink, normalizePhoneE164 } from "@/lib/format";
import { sendWhatsapp, renderTemplate, buildWaMeLink, copyToClipboard, updateLogStatus } from "@/lib/whatsapp";

export default function WhatsappPage() {
  const [reservations, setReservations] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [cfg, setCfg] = useState<any>(null);
  const [resId, setResId] = useState("");
  const [tplKey, setTplKey] = useState("");
  const [customPhone, setCustomPhone] = useState("");
  const [customContent, setCustomContent] = useState("");
  const [busy, setBusy] = useState(false);

  async function load() {
    const [r, t, l, s] = await Promise.all([
      supabase.from("reservations").select("id, reservation_code, client_token, check_in, check_out, suite_type, clients(first_name,last_name,phone)").order("check_in", { ascending: false }).limit(100),
      supabase.from("whatsapp_templates").select("*").eq("is_active", true).order("name"),
      supabase.from("whatsapp_logs").select("*").order("created_at", { ascending: false }).limit(80),
      supabase.from("settings").select("value").eq("key", "whatsapp_config").maybeSingle(),
    ]);
    setReservations(r.data ?? []);
    setTemplates(t.data ?? []);
    setLogs(l.data ?? []);
    setCfg(s.data?.value ?? null);
  }
  useEffect(() => { load(); }, []);

  const selectedRes = reservations.find((r) => r.id === resId);
  const selectedTpl = templates.find((t) => t.key === tplKey);
  const previewContent = selectedTpl
    ? renderTemplate(selectedTpl.content, {
        prenom: selectedRes?.clients?.first_name ?? "{prenom}",
        nom: selectedRes?.clients?.last_name ?? "{nom}",
        lien: selectedRes ? buildClientLink(selectedRes.client_token) : "{lien}",
        code: selectedRes?.reservation_code ?? "{code}",
        arrivee: selectedRes ? new Date(selectedRes.check_in).toLocaleDateString("fr-FR") : "{arrivee}",
        depart: selectedRes ? new Date(selectedRes.check_out).toLocaleDateString("fr-FR") : "{depart}",
        suite: selectedRes?.suite_type ?? "{suite}",
      })
    : "";

  const previewPhone = normalizePhoneE164(selectedRes?.clients?.phone);

  async function sendTemplate() {
    if (!resId || !tplKey) return toast.error("Réservation et modèle requis");
    setBusy(true);
    await sendWhatsapp({ reservation_id: resId, template_key: tplKey });
    setBusy(false);
    load();
  }

  async function sendCustom() {
    if (!customPhone || !customContent) return toast.error("Téléphone et message requis");
    setBusy(true);
    const res = await sendWhatsapp({ phone: customPhone, content: customContent });
    setBusy(false);
    if (res.success) setCustomContent("");
    load();
  }

  async function retryLog(log: any) {
    setBusy(true);
    if (log.reservation_id && log.template_key) {
      await sendWhatsapp({ reservation_id: log.reservation_id, template_key: log.template_key });
    } else {
      await sendWhatsapp({ phone: log.recipient_phone, content: log.content });
    }
    setBusy(false);
    load();
  }

  async function markSent(log: any) {
    if (await updateLogStatus(log.id, "sent_manually")) {
      toast.success("Marqué comme envoyé manuellement");
      load();
    }
  }

  async function markFailed(log: any) {
    if (await updateLogStatus(log.id, "failed_manual")) {
      toast.success("Marqué comme échec");
      load();
    }
  }

  const mode = cfg?.mode ?? "manual_wa_me";
  const enabled = cfg?.enabled !== false;

  const modeLabel: Record<string, string> = {
    manual_wa_me: "Manuel via wa.me (mode actif)",
    sandbox: "Sandbox Twilio",
    production: "Production WhatsApp Business",
  };

  return (
    <div className="p-8 max-w-7xl">
      <PageHeader title="WhatsApp" subtitle="Envoi manuel via wa.me, modèles, historique" />

      {/* Mode banner */}
      <Card className="p-4 bg-card border-border mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className={`w-2 h-2 rounded-full ${enabled ? "bg-green-400" : "bg-red-400"} animate-pulse`} />
          <div>
            <div className="text-sm font-medium">
              Mode actif : <span className="text-gold">{modeLabel[mode] ?? mode}</span>
            </div>
            <div className="text-xs text-muted-foreground">
              {mode === "manual_wa_me"
                ? "Cliquer sur WhatsApp ouvre l'application/web wa.me avec message prérempli — vous validez l'envoi manuellement."
                : "Twilio actif — vérifiez la configuration dans Réglages."}
            </div>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={() => window.location.assign("/admin/settings")}>
          Configurer
        </Button>
      </Card>

      <div className="grid lg:grid-cols-2 gap-4 mb-8">
        {/* Template send + preview */}
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
                      {r.clients?.first_name} {r.clients?.last_name} — {r.reservation_code} {!r.clients?.phone && "⚠"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedRes && !selectedRes.clients?.phone && (
                <p className="text-xs text-yellow-400 mt-1">⚠ Ce client n'a pas de numéro</p>
              )}
              {selectedRes && previewPhone && (
                <p className="text-xs text-muted-foreground mt-1">Numéro formaté : <code className="text-gold">{previewPhone}</code></p>
              )}
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

            {previewContent && (
              <div className="p-3 rounded-md bg-secondary/50 border border-border">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <Eye className="w-3 h-3 text-gold" />
                    <span className="text-xs font-medium text-muted-foreground">Aperçu</span>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => copyToClipboard(previewContent, "Message copié")} className="h-6 text-[11px]">
                    <Copy className="w-3 h-3 mr-1" /> Copier
                  </Button>
                </div>
                <pre className="text-xs whitespace-pre-wrap font-sans text-foreground">{previewContent}</pre>
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              <Button onClick={sendTemplate} disabled={busy || !resId || !tplKey} className="flex-1 gradient-gold text-noir">
                <Send className="w-4 h-4 mr-2" /> Ouvrir WhatsApp
              </Button>
              {previewPhone && previewContent && (
                <Button variant="outline" onClick={() => window.open(buildWaMeLink(previewPhone, previewContent), "_blank")}>
                  <ExternalLink className="w-4 h-4" />
                </Button>
              )}
              {previewPhone && (
                <Button variant="outline" onClick={() => copyToClipboard(previewPhone, "Numéro copié")} title="Copier numéro">
                  <Phone className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>
        </Card>

        {/* Custom send */}
        <Card className="p-5 bg-card border-border">
          <h2 className="font-display text-xl text-gold-gradient mb-4">Message libre</h2>
          <div className="space-y-3">
            <div>
              <Label>Téléphone (international ou local)</Label>
              <Input value={customPhone} onChange={(e) => setCustomPhone(e.target.value)} placeholder="+237 6XX XX XX XX" />
              {customPhone && (
                <p className="text-xs text-muted-foreground mt-1">Sera envoyé au format : <code className="text-gold">{normalizePhoneE164(customPhone)}</code></p>
              )}
            </div>
            <div>
              <Label>Message</Label>
              <Textarea rows={5} value={customContent} onChange={(e) => setCustomContent(e.target.value)} />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button onClick={sendCustom} disabled={busy || !customPhone || !customContent} className="flex-1 gradient-gold text-noir">
                <Send className="w-4 h-4 mr-2" /> Ouvrir WhatsApp
              </Button>
              {customPhone && customContent && (
                <Button variant="outline" onClick={() => window.open(buildWaMeLink(customPhone, customContent), "_blank")}>
                  <ExternalLink className="w-4 h-4" />
                </Button>
              )}
              {customContent && (
                <Button variant="outline" onClick={() => copyToClipboard(customContent, "Message copié")}>
                  <Copy className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>
        </Card>
      </div>

      {/* Logs */}
      <Card className="p-5 bg-card border-border">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-xl text-gold-gradient">Historique (80 derniers)</h2>
          <Button variant="ghost" size="sm" onClick={load}><RefreshCw className="w-3 h-3 mr-1" /> Actualiser</Button>
        </div>
        <div className="space-y-2">
          {logs.length === 0 && <p className="text-sm text-muted-foreground py-6 text-center">Aucun envoi pour le moment.</p>}
          {logs.map((l) => (
            <div key={l.id} className="flex items-start justify-between gap-4 py-3 border-b border-border last:border-0">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="font-medium text-sm">{l.recipient_name ?? l.recipient_phone}</span>
                  <span className="text-xs text-muted-foreground">{l.recipient_phone}</span>
                  {l.template_key && <Badge variant="outline" className="text-[10px] border-gold/30 text-gold">{l.template_key}</Badge>}
                  {l.mode && <Badge variant="outline" className="text-[10px]">{l.mode}</Badge>}
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2">{l.content}</p>
                {l.error_message && <p className="text-xs text-red-400 mt-1">{l.error_message}</p>}
                <div className="flex flex-wrap gap-2 mt-1">
                  {l.wa_link && (
                    <a href={l.wa_link} target="_blank" rel="noopener noreferrer" className="text-xs text-cyan-400 hover:underline inline-flex items-center gap-1">
                      <ExternalLink className="w-3 h-3" /> Rouvrir wa.me
                    </a>
                  )}
                  <button onClick={() => copyToClipboard(l.content, "Message copié")} className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
                    <Copy className="w-3 h-3" /> Copier message
                  </button>
                  <button onClick={() => copyToClipboard(l.recipient_phone, "Numéro copié")} className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
                    <Phone className="w-3 h-3" /> Copier numéro
                  </button>
                </div>
              </div>
              <div className="text-right shrink-0 flex flex-col items-end gap-1">
                <div className={`text-xs font-medium ${statusColor(l.status)}`}>{statusLabel(l.status)}</div>
                <div className="text-[10px] text-muted-foreground">{formatDateTime(l.created_at)}</div>
                {(l.status === "opened_wa" || l.status === "manual_required" || l.status === "manual_sent_pending_confirmation") && (
                  <div className="flex gap-1">
                    <Button size="sm" variant="ghost" className="h-6 text-[10px] text-green-400" onClick={() => markSent(l)}>
                      <CheckCircle2 className="w-3 h-3 mr-1" /> Envoyé
                    </Button>
                    <Button size="sm" variant="ghost" className="h-6 text-[10px] text-red-400" onClick={() => markFailed(l)}>
                      <XCircle className="w-3 h-3 mr-1" /> Échec
                    </Button>
                  </div>
                )}
                {(l.status === "error" || l.status === "failed" || l.status === "failed_manual") && (
                  <Button size="sm" variant="ghost" className="h-6 text-[10px]" onClick={() => retryLog(l)}>
                    <RefreshCw className="w-3 h-3 mr-1" /> Réessayer
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
