import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import PageHeader from "@/components/admin/PageHeader";
import { Card } from "@/components/ui/card";
import { CalendarRange, Users, MessageSquare, Star, Crown, TrendingUp } from "lucide-react";
import { Link } from "react-router-dom";
import { formatDate, nightsBetween } from "@/lib/format";

type Stats = {
  totalReservations: number;
  activeStays: number;
  totalClients: number;
  unreadMessages: number;
  pendingReviews: number;
  upcoming: any[];
};

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    (async () => {
      const today = new Date().toISOString().slice(0, 10);
      const [resAll, resActive, clients, msgs, reviews, upcoming] = await Promise.all([
        supabase.from("reservations").select("id", { count: "exact", head: true }),
        supabase.from("reservations").select("id", { count: "exact", head: true }).eq("status", "in_progress"),
        supabase.from("clients").select("id", { count: "exact", head: true }),
        supabase.from("messages").select("id", { count: "exact", head: true }).eq("sender", "client").eq("is_read", false),
        supabase.from("reviews").select("id", { count: "exact", head: true }).eq("is_published", false),
        supabase.from("reservations").select("*, clients(first_name,last_name,phone)").gte("check_in", today).order("check_in").limit(5),
      ]);
      setStats({
        totalReservations: resAll.count ?? 0,
        activeStays: resActive.count ?? 0,
        totalClients: clients.count ?? 0,
        unreadMessages: msgs.count ?? 0,
        pendingReviews: reviews.count ?? 0,
        upcoming: upcoming.data ?? [],
      });
    })();
  }, []);

  const cards = [
    { label: "Séjours en cours", value: stats?.activeStays ?? "—", icon: Crown, color: "text-gold" },
    { label: "Réservations totales", value: stats?.totalReservations ?? "—", icon: CalendarRange, color: "text-gold-light" },
    { label: "Clients", value: stats?.totalClients ?? "—", icon: Users, color: "text-gold" },
    { label: "Messages non lus", value: stats?.unreadMessages ?? "—", icon: MessageSquare, color: "text-gold-light" },
    { label: "Avis à valider", value: stats?.pendingReviews ?? "—", icon: Star, color: "text-gold" },
    { label: "Performance", value: "★★★★★", icon: TrendingUp, color: "text-gold-light" },
  ];

  return (
    <div className="p-8 max-w-7xl">
      <PageHeader title="Tableau de bord" subtitle="Vue d'ensemble de votre conciergerie d'exception" />

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-10">
        {cards.map((c) => (
          <Card key={c.label} className="p-6 bg-card border-border hover:border-gold/40 transition">
            <div className="flex items-start justify-between mb-3">
              <span className="text-xs uppercase tracking-wider text-muted-foreground">{c.label}</span>
              <c.icon className={`w-5 h-5 ${c.color}`} />
            </div>
            <div className="font-display text-3xl text-foreground">{c.value}</div>
          </Card>
        ))}
      </div>

      <Card className="p-6 bg-card border-border">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-2xl text-gold-gradient">Arrivées à venir</h2>
          <Link to="/admin/reservations" className="text-xs text-gold hover:underline">Tout voir →</Link>
        </div>
        {stats?.upcoming.length === 0 && (
          <p className="text-sm text-muted-foreground py-8 text-center">Aucune arrivée planifiée.</p>
        )}
        <div className="divide-y divide-border">
          {stats?.upcoming.map((r) => (
            <Link key={r.id} to={`/admin/reservations/${r.id}`} className="flex items-center justify-between py-3 hover:bg-accent/40 px-2 rounded transition">
              <div>
                <div className="font-medium text-foreground">
                  {r.clients?.first_name} {r.clients?.last_name}
                </div>
                <div className="text-xs text-muted-foreground">
                  {formatDate(r.check_in)} — {formatDate(r.check_out)} • {nightsBetween(r.check_in, r.check_out)} nuits • {r.guests} pers.
                </div>
              </div>
              <span className="text-xs px-2 py-1 rounded-full bg-gold/10 text-gold border border-gold/30">{r.reservation_code}</span>
            </Link>
          ))}
        </div>
      </Card>
    </div>
  );
}
