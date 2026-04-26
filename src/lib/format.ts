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
  };
  return map[s] ?? s;
}

export function statusColor(s: string): string {
  const map: Record<string, string> = {
    sent: "text-blue-400",
    delivered: "text-green-400",
    read: "text-gold",
    failed: "text-red-400",
    error: "text-red-400",
    pending: "text-orange-400",
    fallback_wa: "text-cyan-400",
    manual_required: "text-yellow-400",
  };
  return map[s] ?? "text-muted-foreground";
}
