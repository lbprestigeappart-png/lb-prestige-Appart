export function formatDate(d: string | Date | null | undefined, opts?: Intl.DateTimeFormatOptions): string {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleDateString("fr-FR", opts ?? { day: "2-digit", month: "long", year: "numeric" });
}

export function formatDateShort(d: string | Date | null | undefined): string {
  return formatDate(d, { day: "2-digit", month: "2-digit", year: "numeric" });
}

export function formatDateTime(d: string | Date | null | undefined): string {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" });
}

export function nightsBetween(checkIn: string | Date, checkOut: string | Date): number {
  const a = new Date(checkIn).getTime();
  const b = new Date(checkOut).getTime();
  return Math.max(0, Math.round((b - a) / 86400000));
}

export function buildClientLink(token: string): string {
  return `${window.location.origin}/client/${token}`;
}

export function renderTemplate(content: string, vars: Record<string, string>): string {
  return content.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? `{${k}}`);
}

export function formatPhone(p?: string | null): string {
  if (!p) return "—";
  return p.replace(/(\+\d{1,3})(\d{1,3})(\d{2,3})(\d{2,3})(\d{2,3})/, "$1 $2 $3 $4 $5");
}

export function formatFCFA(amount: number | string | null | undefined): string {
  const n = Number(amount ?? 0);
  if (Number.isNaN(n)) return "0 FCFA";
  return `${n.toLocaleString("fr-FR")} FCFA`;
}

export function normalizePhoneE164(phone?: string | null, defaultCountry: string = "237"): string {
  if (!phone) return "";
  let p = phone.trim().replace(/[\s().-]/g, "");
  if (p.startsWith("00")) p = "+" + p.slice(2);
  if (p.startsWith("+")) return p;
  p = p.replace(/^0+/, "");
  return `+${defaultCountry}${p}`;
}

export function statusLabel(s: string): string {
  const map: Record<string, string> = {
    pending: "En attente",
    confirmed: "Confirmée",
    in_progress: "En cours",
    completed: "Terminée",
    cancelled: "Annulée",
    sent: "Envoyé",
    delivered: "Livré",
    read: "Lu",
    failed: "Échec",
    error: "Erreur",
    fallback_wa: "Lien WhatsApp",
    manual_required: "À envoyer manuellement",
    paid: "Payé",
    partial: "Partiel",
    refunded: "Remboursé",
    unpaid: "Non payé",
    advance: "Avance versée",
    settled: "Soldé",
    unset: "Prix non défini",
    opened_wa: "Lien WhatsApp ouvert",
    manual_sent_pending_confirmation: "En attente de confirmation",
    sent_manually: "Envoyé manuellement",
    failed_manual: "Échec manuel",
  };
  return map[s] ?? s;
}

export function statusColor(s: string): string {
  const map: Record<string, string> = {
    sent: "text-blue-400",
    delivered: "text-green-400",
    read: "text-gold",
    failed: "text-red-400",
    failed_manual: "text-red-400",
    error: "text-red-400",
    pending: "text-orange-400",
    fallback_wa: "text-cyan-400",
    opened_wa: "text-cyan-400",
    manual_required: "text-yellow-400",
    manual_sent_pending_confirmation: "text-yellow-400",
    sent_manually: "text-green-400",
    unpaid: "text-red-400",
    advance: "text-orange-400",
    settled: "text-green-400",
  };
  return map[s] ?? "text-muted-foreground";
}
