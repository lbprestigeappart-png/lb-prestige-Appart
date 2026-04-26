import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import PageHeader from "@/components/admin/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Bell, Check } from "lucide-react";
import { formatDateTime } from "@/lib/format";
import { Link } from "react-router-dom";

export default function NotificationsPage() {
  const [notifs, setNotifs] = useState<any[]>([]);

  async function load() {
    const { data } = await supabase.from("notifications").select("*").order("created_at", { ascending: false }).limit(100);
    setNotifs(data ?? []);
  }
  useEffect(() => {
    load();
    const ch = supabase.channel("notifs").on("postgres_changes", { event: "*", schema: "public", table: "notifications" }, load).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  async function markAll() {
    await supabase.from("notifications").update({ is_read: true }).eq("is_read", false);
    load();
  }

  return (
    <div className="p-8 max-w-4xl">
      <PageHeader title="Notifications" subtitle={`${notifs.filter((n) => !n.is_read).length} non lue(s)`}
        actions={<Button variant="outline" onClick={markAll}><Check className="w-4 h-4 mr-2" /> Tout marquer comme lu</Button>} />
      <div className="space-y-2">
        {notifs.length === 0 && <Card className="p-8 text-center text-sm text-muted-foreground">Aucune notification.</Card>}
        {notifs.map((n) => (
          <Card key={n.id} className={`p-4 bg-card border-border ${!n.is_read ? "border-l-2 border-l-gold" : ""}`}>
            <div className="flex items-start gap-3">
              <Bell className={`w-4 h-4 mt-1 ${n.is_read ? "text-muted-foreground" : "text-gold"}`} />
              <div className="flex-1">
                <div className="font-medium text-sm">{n.title}</div>
                {n.body && <p className="text-xs text-muted-foreground mt-0.5">{n.body}</p>}
                <div className="text-[10px] text-muted-foreground mt-1">{formatDateTime(n.created_at)}</div>
              </div>
              {n.link && <Link to={n.link}><Button size="sm" variant="ghost">Voir</Button></Link>}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
