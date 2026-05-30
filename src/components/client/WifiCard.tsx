import { Wifi, Copy, Check } from "lucide-react";
import { Card } from "@/components/ui/card";
import { useState } from "react";
import { toast } from "sonner";

interface WifiCardProps {
  ssid?: string;
  password?: string;
}

export default function WifiCard({ ssid, password }: WifiCardProps) {
  const [copied, setCopied] = useState(false);

  if (!ssid && !password) return null;

  const copyPassword = async () => {
    if (!password) return;
    try {
      await navigator.clipboard.writeText(password);
      setCopied(true);
      toast.success("Mot de passe Wi-Fi copié !");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Impossible de copier");
    }
  };

  return (
    <Card className="p-5 bg-card border-border hover:border-gold/30 transition-all animate-slide-up stagger-1">
      <div className="flex items-center gap-2.5 mb-4">
        <div className="w-9 h-9 rounded-lg gradient-gold flex items-center justify-center shadow-gold">
          <Wifi className="w-4.5 h-4.5 text-noir" />
        </div>
        <h3 className="font-display text-xl text-foreground">Wi-Fi</h3>
      </div>

      <div className="space-y-3">
        {ssid && (
          <div className="p-3.5 bg-secondary/40 rounded-lg border border-border/50">
            <div className="text-[10px] uppercase text-muted-foreground tracking-wider mb-0.5">Réseau</div>
            <div className="font-mono text-sm text-foreground font-medium">{ssid}</div>
          </div>
        )}

        {password && (
          <div className="flex items-center justify-between p-3.5 bg-secondary/40 rounded-lg border border-border/50 hover:border-gold/30 transition-all group">
            <div>
              <div className="text-[10px] uppercase text-muted-foreground tracking-wider mb-0.5">Mot de passe</div>
              <div className="font-mono text-sm text-foreground font-medium tracking-wider">{password}</div>
            </div>
            <button
              onClick={copyPassword}
              className="p-2 rounded-md hover:bg-gold/10 transition-colors"
              title="Copier le mot de passe"
            >
              {copied ? (
                <Check className="w-4 h-4 text-green-400 copy-flash" />
              ) : (
                <Copy className="w-4 h-4 text-muted-foreground group-hover:text-gold transition-colors" />
              )}
            </button>
          </div>
        )}
      </div>
    </Card>
  );
}
