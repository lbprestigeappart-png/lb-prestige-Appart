import { KeyRound, Copy, Check, Lock } from "lucide-react";
import { Card } from "@/components/ui/card";
import { useState } from "react";
import { toast } from "sonner";

interface AccessCodesProps {
  doorCode?: string;
  safeCode?: string;
  instructions?: string;
}

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      toast.success("Copié !");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Impossible de copier");
    }
  };

  return (
    <button
      onClick={copy}
      className="p-1.5 rounded-md hover:bg-gold/10 transition-colors group"
      title="Copier"
    >
      {copied ? (
        <Check className="w-3.5 h-3.5 text-green-400 copy-flash" />
      ) : (
        <Copy className="w-3.5 h-3.5 text-muted-foreground group-hover:text-gold transition-colors" />
      )}
    </button>
  );
}

function CodeDisplay({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  return (
    <div className="flex items-center justify-between p-3.5 bg-secondary/40 rounded-lg border border-border/50 hover:border-gold/30 transition-all group">
      <div>
        <div className="text-[10px] uppercase text-muted-foreground tracking-wider mb-0.5">{label}</div>
        <div className="font-mono text-lg text-foreground tracking-widest font-semibold">{value}</div>
      </div>
      <CopyButton value={value} />
    </div>
  );
}

export default function AccessCodes({ doorCode, safeCode, instructions }: AccessCodesProps) {
  if (!doorCode && !safeCode) return null;

  return (
    <Card className="p-5 bg-card border-border hover:border-gold/30 transition-all animate-slide-up">
      <div className="flex items-center gap-2.5 mb-4">
        <div className="w-9 h-9 rounded-lg gradient-gold flex items-center justify-center shadow-gold">
          <KeyRound className="w-4.5 h-4.5 text-noir" />
        </div>
        <h3 className="font-display text-xl text-foreground">Codes d'accès</h3>
        <Lock className="w-3.5 h-3.5 text-gold/50 ml-auto" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <CodeDisplay label="Code porte" value={doorCode} />
        <CodeDisplay label="Code coffre" value={safeCode} />
      </div>

      {instructions && (
        <p className="text-sm text-muted-foreground mt-4 italic border-t border-border/50 pt-3">
          {instructions}
        </p>
      )}
    </Card>
  );
}
