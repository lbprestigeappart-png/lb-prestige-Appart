import { Link } from "react-router-dom";
import { Crown, ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Index() {
  return (
    <div className="min-h-screen bg-noir text-foreground flex flex-col">
      <header className="px-6 py-6 flex items-center justify-between max-w-7xl mx-auto w-full">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full gradient-gold flex items-center justify-center">
            <Crown className="w-5 h-5 text-noir" />
          </div>
          <div>
            <div className="font-display text-xl text-gold-gradient leading-none">LB Prestige Appart</div>
            <div className="text-[10px] tracking-[0.2em] text-muted-foreground uppercase mt-1">Conciergerie d'Exception</div>
          </div>
        </div>
        <Link to="/auth"><Button variant="outline" size="sm">Espace admin</Button></Link>
      </header>

      <main className="flex-1 flex items-center justify-center px-6">
        <div className="max-w-3xl w-full text-center py-20">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-gold/30 text-gold text-xs tracking-[0.3em] uppercase mb-8">
            <Sparkles className="w-3 h-3" /> Kotto • Carrefour des Roses • Douala
          </div>
          <h1 className="font-display text-6xl md:text-7xl text-gold-gradient leading-tight mb-6">
            Une adresse d'exception<br />pour un séjour raffiné
          </h1>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto mb-10">
            Conciergerie privée, accueil personnalisé, services haut de gamme. Votre séjour à Douala mérite une signature.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link to="/auth">
              <Button size="lg" className="gradient-gold text-noir hover:opacity-90 font-medium px-8">
                Accéder à l'admin <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </div>
        </div>
      </main>

      <footer className="px-6 py-6 text-center text-xs text-muted-foreground border-t border-border">
        © {new Date().getFullYear()} LB Prestige Appart — Conciergerie d'Exception
      </footer>
    </div>
  );
}
