import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { MessageSquare, ShieldCheck, FlaskConical, Loader2, Hand } from "lucide-react";

type Mode = "manual_wa_me" | "sandbox" | "production";
type WaCfg = {
  mode: Mode;
  from_sandbox: string;
  from_production: string;
  sandbox_join_code: string;
  enabled: boolean;
};

const DEFAULTS: WaCfg = {
  mode: "manual_wa_me",
  from_sandbox: "whatsapp:+14155238886",
  from_production: "",
  sandbox_join_code: "",
  enabled: true,
};

export default function WhatsappConfig() {
  const [cfg, setCfg] = useState<WaCfg>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testPhone, setTestPhone] = useState("");

  async function load() {
    setLoading(true);
    const { data } = await supabase
      .from("settings").select("value").eq("key", "whatsapp_config").maybeSingle();
    if (data?.value) setCfg({ ...DEFAULTS, ...(data.value as any) });
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  function update<K extends keyof WaCfg>(k: K, v: WaCfg[K]) {
    setCfg((c) => ({ ...c, [k]: v }));
  }

  function normalize(num: string) {
    if (!num) return "";
    const trimmed = num.trim();
    if (!trimmed) return "";
    return trimmed.startsWith("whatsapp:") ? trimmed : `whatsapp:${trimmed}`;
  }

  async function save() {
    if (cfg.mode === "production" && !cfg.from_production.trim()) {
      return toast.error("Renseignez votre numéro WhatsApp Business pour passer en production.");
    }
    setSaving(true);
    const payload: WaCfg = {
      ...cfg,
      from_sandbox: normalize(cfg.from_sandbox) || DEFAULTS.from_sandbox,
      from_production: normalize(cfg.from_production),
    };
    const { error } = await supabase
      .from("settings")
      .upsert({ key: "whatsapp_config", value: payload as any, is_public: false }, { onConflict: "key" });
    setSaving(false);
    if (error) return toast.error(error.message);
    setCfg(payload);
    toast.success(`Configuration enregistrée (mode ${payload.mode}).`);
  }

  async function sendTest() {
    if (!testPhone.trim()) return toast.error("Entrez un numéro de test (format E.164, ex: +237...)");
    setTesting(true);
    const content =
      cfg.mode === "sandbox"
        ? "✅ Test sandbox LB Prestige Appart — votre intégration WhatsApp fonctionne."
        : "✅ Test production LB Prestige Appart — votre intégration WhatsApp Business est opérationnelle.";
    const { data, error } = await supabase.functions.invoke("send-whatsapp", {
      body: { phone: testPhone.trim(), content },
    });
    setTesting(false);
    if (error || (data && (data as any).success === false)) {
      return toast.error((data as any)?.error ?? error?.message ?? "Échec de l'envoi");
    }
    toast.success("Message de test envoyé.");
  }

  if (loading) {
    return (
      <Card className="p-6 bg-card border-border">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" /> Chargement…
        </div>
      </Card>
    );
  }

  const isProd = cfg.mode === "production";
  const isManual = cfg.mode === "manual_wa_me";

  return (
    <Card className="p-6 bg-card border-border">
      <div className="flex items-start justify-between gap-4 mb-5">
        <div className="flex items-center gap-3">
          <MessageSquare className="w-5 h-5 text-gold" />
          <div>
            <h2 className="font-display text-xl text-gold-gradient">Intégration WhatsApp</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Mode actif, bascule manuel ↔ Twilio</p>
          </div>
        </div>
        <Badge variant="outline" className={
          isProd ? "border-green-500/40 text-green-400" :
          isManual ? "border-gold/40 text-gold" :
          "border-orange-500/40 text-orange-400"
        }>
          {isProd ? <ShieldCheck className="w-3 h-3 mr-1" /> : isManual ? <Hand className="w-3 h-3 mr-1" /> : <FlaskConical className="w-3 h-3 mr-1" />}
          {isProd ? "Production" : isManual ? "Manuel wa.me" : "Sandbox"}
        </Badge>
      </div>

      {/* Enable / Disable */}
      <div className="flex items-center justify-between p-3 rounded-md bg-secondary/40 border border-border mb-4">
        <div>
          <Label className="text-sm">Envoi WhatsApp activé</Label>
          <p className="text-xs text-muted-foreground">Désactivez pour suspendre tous les envois automatiques et manuels.</p>
        </div>
        <Switch checked={cfg.enabled} onCheckedChange={(v) => update("enabled", v)} />
      </div>

      {/* Mode selector */}
      <div className="p-3 rounded-md bg-secondary/40 border border-border mb-4 space-y-2">
        <Label className="text-sm">Mode d'envoi actif</Label>
        <div className="grid grid-cols-3 gap-2">
          {(["manual_wa_me", "sandbox", "production"] as Mode[]).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => update("mode", m)}
              className={`p-2 rounded-md border text-xs transition ${cfg.mode === m ? "border-gold bg-gold/10 text-gold" : "border-border hover:border-gold/40"}`}
            >
              {m === "manual_wa_me" ? "Manuel wa.me" : m === "sandbox" ? "Sandbox Twilio" : "Production"}
            </button>
          ))}
        </div>
        <p className="text-[11px] text-muted-foreground">
          <strong className="text-gold">Manuel wa.me</strong> (recommandé) : ouvre l'app WhatsApp avec message prérempli, vous validez l'envoi. Aucune dépendance Twilio.
        </p>
      </div>

      {/* Sandbox fields */}
      <div className={`space-y-3 p-4 rounded-md border mb-4 ${!isProd ? "border-gold/30 bg-gold/5" : "border-border opacity-60"}`}>
        <div className="flex items-center gap-2">
          <FlaskConical className="w-4 h-4 text-orange-400" />
          <h3 className="font-medium text-sm">Sandbox Twilio</h3>
        </div>
        <div>
          <Label className="text-xs">Numéro émetteur sandbox</Label>
          <Input
            value={cfg.from_sandbox}
            onChange={(e) => update("from_sandbox", e.target.value)}
            placeholder="whatsapp:+14155238886"
            className="font-mono text-xs"
          />
        </div>
        <div>
          <Label className="text-xs">Code de jonction sandbox (info)</Label>
          <Input
            value={cfg.sandbox_join_code}
            onChange={(e) => update("sandbox_join_code", e.target.value)}
            placeholder="join example-word"
          />
          <p className="text-[11px] text-muted-foreground mt-1">
            Vos testeurs doivent envoyer ce message au numéro sandbox depuis WhatsApp avant de recevoir des messages.
          </p>
        </div>
      </div>

      {/* Production fields */}
      <div className={`space-y-3 p-4 rounded-md border mb-4 ${isProd ? "border-gold/30 bg-gold/5" : "border-border opacity-60"}`}>
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-green-400" />
          <h3 className="font-medium text-sm">Production WhatsApp Business</h3>
        </div>
        <div>
          <Label className="text-xs">Numéro WhatsApp Business approuvé</Label>
          <Input
            value={cfg.from_production}
            onChange={(e) => update("from_production", e.target.value)}
            placeholder="whatsapp:+237..."
            className="font-mono text-xs"
          />
          <p className="text-[11px] text-muted-foreground mt-1">
            Format E.164 avec préfixe <code>whatsapp:</code>. Le numéro doit être enregistré et approuvé dans votre compte Twilio.
          </p>
        </div>
        <div className="text-[11px] text-muted-foreground p-2 rounded bg-background/50">
          <strong className="text-gold">Sécurité :</strong> Activez <em>SMS Pumping Protection</em> et configurez les <em>Geo Permissions</em> dans la console Twilio avant la mise en production.
        </div>
      </div>

      <div className="flex gap-2 mb-6">
        <Button onClick={save} disabled={saving} className="gradient-gold text-noir">
          {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
          Enregistrer la configuration
        </Button>
        <Button variant="outline" onClick={load} disabled={saving}>
          Annuler
        </Button>
      </div>

      {/* Test send */}
      <div className="border-t border-border pt-4">
        <h3 className="font-medium text-sm mb-2">Tester l'envoi</h3>
        <div className="flex gap-2">
          <Input
            value={testPhone}
            onChange={(e) => setTestPhone(e.target.value)}
            placeholder="+237..."
            className="font-mono text-xs"
          />
          <Button onClick={sendTest} disabled={testing} variant="outline">
            {testing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
            Envoyer test
          </Button>
        </div>
        <p className="text-[11px] text-muted-foreground mt-2">
          {isProd
            ? "Mode production : le message partira de votre numéro WhatsApp Business."
            : "Mode sandbox : le destinataire doit avoir rejoint la sandbox Twilio (envoyer le code de jonction au numéro sandbox)."}
        </p>
      </div>

      <div className="mt-5 p-3 rounded-md bg-secondary text-[11px] text-muted-foreground">
        <strong className="text-gold">Override serveur (optionnel) :</strong> définissez les secrets <code>TWILIO_WHATSAPP_FROM_PRODUCTION</code> ou <code>TWILIO_WHATSAPP_FROM_SANDBOX</code> pour forcer un numéro côté serveur, indépendamment de cette configuration.
      </div>
    </Card>
  );
}
