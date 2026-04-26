import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import PageHeader from "@/components/admin/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send } from "lucide-react";
import { toast } from "sonner";
import { formatDateTime } from "@/lib/format";

export default function MessagesPage() {
  const [reservations, setReservations] = useState<any[]>([]);
  const [active, setActive] = useState<any | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [content, setContent] = useState("");

  async function loadList() {
    const { data } = await supabase
      .from("reservations")
      .select("*, clients(first_name,last_name,phone)")
      .order("check_in", { ascending: false });
    setReservations(data ?? []);
  }

  async function loadMessages(reservationId: string) {
    const { data } = await supabase.from("messages").select("*").eq("reservation_id", reservationId).order("created_at");
    setMessages(data ?? []);
    await supabase.from("messages").update({ is_read: true }).eq("reservation_id", reservationId).eq("sender", "client");
  }

  useEffect(() => { loadList(); }, []);

  useEffect(() => {
    if (!active) return;
    loadMessages(active.id);
    const channel = supabase.channel(`msgs-${active.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `reservation_id=eq.${active.id}` },
        (payload) => setMessages((m) => [...m, payload.new]))
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [active]);

  async function send() {
    if (!content.trim() || !active) return;
    const { error } = await supabase.from("messages").insert({ reservation_id: active.id, sender: "admin", content: content.trim() });
    if (error) return toast.error(error.message);
    setContent("");
  }

  return (
    <div className="p-8 max-w-7xl">
      <PageHeader title="Messagerie" subtitle="Conversations admin ↔ clients" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-[calc(100vh-220px)]">
        <Card className="p-3 bg-card border-border overflow-y-auto md:col-span-1">
          {reservations.map((r) => (
            <button key={r.id} onClick={() => setActive(r)}
              className={`w-full text-left p-3 rounded-md mb-1 transition ${active?.id === r.id ? "bg-gold/15 text-gold" : "hover:bg-accent"}`}>
              <div className="font-medium text-sm">{r.clients?.first_name} {r.clients?.last_name}</div>
              <div className="text-xs text-muted-foreground">{r.reservation_code}</div>
            </button>
          ))}
        </Card>

        <Card className="md:col-span-2 bg-card border-border flex flex-col">
          {!active ? (
            <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground">Sélectionnez une conversation</div>
          ) : (
            <>
              <div className="p-4 border-b border-border">
                <div className="font-display text-xl text-foreground">{active.clients?.first_name} {active.clients?.last_name}</div>
                <div className="text-xs text-muted-foreground">{active.clients?.phone}</div>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {messages.length === 0 && <p className="text-center text-xs text-muted-foreground">Aucun message.</p>}
                {messages.map((m) => (
                  <div key={m.id} className={`flex ${m.sender === "admin" ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[70%] px-4 py-2 rounded-2xl ${m.sender === "admin" ? "bg-gold/20 text-foreground" : "bg-secondary text-foreground"}`}>
                      <div className="text-sm whitespace-pre-wrap">{m.content}</div>
                      <div className="text-[10px] opacity-60 mt-1">{formatDateTime(m.created_at)}</div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="p-3 border-t border-border flex gap-2">
                <Textarea rows={2} value={content} onChange={(e) => setContent(e.target.value)} placeholder="Votre message…"
                  onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) send(); }} />
                <Button onClick={send} className="gradient-gold text-noir self-end"><Send className="w-4 h-4" /></Button>
              </div>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
