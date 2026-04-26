import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { Crown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export default function Auth() {
  const { user, isAdmin, signIn, signUp, loading } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && user && isAdmin) navigate("/admin");
  }, [user, isAdmin, loading, navigate]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    if (mode === "login") {
      const { error } = await signIn(email, password);
      if (error) toast.error(error);
    } else {
      const { error } = await signUp(email, password);
      if (error) toast.error(error);
      else toast.success("Compte créé. Vérifiez votre e-mail si la confirmation est demandée, sinon connectez-vous.");
    }
    setBusy(false);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-noir p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full gradient-gold shadow-gold mb-4">
            <Crown className="w-8 h-8 text-noir" />
          </div>
          <h1 className="font-display text-4xl text-gold-gradient">LB Prestige Appart</h1>
          <p className="text-xs tracking-[0.3em] text-muted-foreground uppercase mt-2">Admin Console</p>
        </div>
        <form onSubmit={onSubmit} className="bg-card border border-border rounded-xl p-8 space-y-5 shadow-elegant">
          <div className="flex gap-2 mb-2">
            <button type="button" onClick={() => setMode("login")}
              className={`flex-1 py-2 text-sm rounded-md transition ${mode === "login" ? "bg-gold/15 text-gold" : "text-muted-foreground"}`}>
              Connexion
            </button>
            <button type="button" onClick={() => setMode("signup")}
              className={`flex-1 py-2 text-sm rounded-md transition ${mode === "signup" ? "bg-gold/15 text-gold" : "text-muted-foreground"}`}>
              Créer compte
            </button>
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">E-mail</Label>
            <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="vous@lb-prestige.cm" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Mot de passe</Label>
            <Input id="password" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <Button type="submit" disabled={busy} className="w-full gradient-gold text-noir hover:opacity-90 font-medium">
            {busy ? "..." : mode === "login" ? "Se connecter" : "Créer mon compte"}
          </Button>
          {mode === "signup" && (
            <p className="text-xs text-muted-foreground text-center">
              Le premier compte créé devient propriétaire automatiquement.
            </p>
          )}
        </form>
      </div>
    </div>
  );
}
