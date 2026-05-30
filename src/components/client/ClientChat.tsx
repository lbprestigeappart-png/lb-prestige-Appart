import { useEffect, useRef, useState } from "react";
import { Send } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

interface Message {
  id: string;
  content: string;
  sender: "client" | "admin";
  created_at: string;
  is_read?: boolean;
}

interface ClientChatProps {
  messages: Message[];
  onSend: (content: string) => Promise<void>;
}

function formatRelative(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffH = Math.floor(diffMs / 3600000);

  if (diffMin < 1) return "À l'instant";
  if (diffMin < 60) return `Il y a ${diffMin} min`;
  if (diffH < 24) return `Il y a ${diffH}h`;
  return date.toLocaleDateString("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

function getDateLabel(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 86400000);
  const msgDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  if (msgDay.getTime() === today.getTime()) return "Aujourd'hui";
  if (msgDay.getTime() === yesterday.getTime()) return "Hier";
  return date.toLocaleDateString("fr-FR", { day: "2-digit", month: "long" });
}

export default function ClientChat({ messages, onSend }: ClientChatProps) {
  const [msg, setMsg] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
    }
  }, [messages.length]);

  const handleSend = async () => {
    const text = msg.trim();
    if (!text || sending) return;
    setSending(true);
    setMsg("");
    try {
      await onSend(text);
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Group messages by date
  let lastDate = "";

  return (
    <Card className="bg-card border-border flex flex-col h-[65vh] md:h-[60vh] overflow-hidden animate-slide-up">
      {/* Header */}
      <div className="px-5 py-4 border-b border-border/60 flex items-center gap-3">
        <div className="w-8 h-8 rounded-full gradient-gold flex items-center justify-center shadow-gold">
          <Send className="w-3.5 h-3.5 text-noir" />
        </div>
        <div>
          <div className="font-display text-lg text-foreground">Messagerie</div>
          <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Conciergerie LB Prestige</div>
        </div>
        <div className="ml-auto flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          <span className="text-[10px] text-green-400">En ligne</span>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-1">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center py-12">
            <div className="w-14 h-14 rounded-full bg-secondary/50 flex items-center justify-center mb-4">
              <Send className="w-6 h-6 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground mb-1">Aucun message pour l'instant</p>
            <p className="text-xs text-muted-foreground/60">Écrivez à votre conciergerie ici</p>
          </div>
        )}

        {messages.map((m, idx) => {
          const dateLabel = getDateLabel(m.created_at);
          let showDate = false;
          if (dateLabel !== lastDate) {
            lastDate = dateLabel;
            showDate = true;
          }

          const isClient = m.sender === "client";

          return (
            <div key={m.id}>
              {showDate && (
                <div className="flex items-center justify-center my-4">
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground/60 bg-secondary/50 px-3 py-1 rounded-full">
                    {dateLabel}
                  </span>
                </div>
              )}
              <div
                className={`flex ${isClient ? "justify-end" : "justify-start"} mb-2 animate-slide-up`}
                style={{ animationDuration: "0.2s" }}
              >
                <div
                  className={`
                    max-w-[80%] px-4 py-2.5 text-sm leading-relaxed
                    ${isClient
                      ? "bg-gold text-noir rounded-2xl rounded-br-md shadow-gold/20"
                      : "bg-secondary/60 text-foreground rounded-2xl rounded-bl-md border border-border/30"
                    }
                  `}
                >
                  <div className="whitespace-pre-wrap break-words">{m.content}</div>
                  <div className={`text-[10px] mt-1 ${isClient ? "text-noir/50 text-right" : "text-muted-foreground/60"}`}>
                    {formatRelative(m.created_at)}
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {/* Typing indicator placeholder */}
        {sending && (
          <div className="flex justify-start mb-2">
            <div className="bg-secondary/60 rounded-2xl rounded-bl-md px-4 py-3 border border-border/30 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-muted-foreground typing-dot" />
              <span className="w-2 h-2 rounded-full bg-muted-foreground typing-dot" />
              <span className="w-2 h-2 rounded-full bg-muted-foreground typing-dot" />
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="p-3 border-t border-border/60 flex gap-2 items-end bg-noir/30">
        <Textarea
          ref={inputRef}
          rows={1}
          value={msg}
          onChange={(e) => setMsg(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Votre message à la conciergerie…"
          className="resize-none min-h-[40px] max-h-24 bg-secondary/30 border-border/40 focus:border-gold/50 text-sm"
        />
        <Button
          onClick={handleSend}
          disabled={!msg.trim() || sending}
          className="gradient-gold text-noir shrink-0 h-10 w-10 p-0 rounded-lg hover:scale-105 transition-transform disabled:opacity-40"
        >
          <Send className="w-4 h-4" />
        </Button>
      </div>
    </Card>
  );
}
