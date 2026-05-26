import { useEffect } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import {
  LayoutDashboard, Users, CalendarRange, MessageSquare, Star, CreditCard,
  Settings, FileText, Send, Megaphone, KeyRound, Wifi, BookOpen, Bell,
  LogOut, Crown, Image, Phone, ChefHat, Car, UtensilsCrossed
} from "lucide-react";
import { Button } from "@/components/ui/button";

const nav = [
  { to: "/admin", icon: LayoutDashboard, label: "Tableau de bord", end: true },
  { to: "/admin/clients", icon: Users, label: "Clients" },
  { to: "/admin/reservations", icon: CalendarRange, label: "Réservations" },
  { to: "/admin/messages", icon: MessageSquare, label: "Messagerie" },
  { to: "/admin/whatsapp", icon: Send, label: "WhatsApp" },
  { to: "/admin/templates", icon: FileText, label: "Modèles WhatsApp" },
  { to: "/admin/automations", icon: Megaphone, label: "Automatisations" },
  { to: "/admin/reviews", icon: Star, label: "Avis clients" },
  { to: "/admin/payments", icon: CreditCard, label: "Paiements" },
  { to: "/admin/access", icon: KeyRound, label: "Codes & accès" },
  { to: "/admin/wifi", icon: Wifi, label: "Wi-Fi & Netflix" },
  { to: "/admin/kitchen", icon: ChefHat, label: "Cuisine" },
  { to: "/admin/parking", icon: Car, label: "Parking" },
  { to: "/admin/rules", icon: BookOpen, label: "Règlement" },
  { to: "/admin/contacts", icon: Phone, label: "Contacts utiles" },
  { to: "/admin/documents", icon: FileText, label: "Documents" },
  { to: "/admin/banner", icon: Image, label: "Bannière" },
  { to: "/admin/notifications", icon: Bell, label: "Notifications" },
  { to: "/admin/settings", icon: Settings, label: "Paramètres" },
  { to: "/admin/restaurants", icon: UtensilsCrossed, label: "Restaurants" },
];

export default function AdminLayout() {
  const { user, isAdmin, loading, signOut } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    document.documentElement.classList.add("admin-theme");
    return () => document.documentElement.classList.remove("admin-theme");
  }, []);

  useEffect(() => {
    if (!loading && (!user || !isAdmin)) navigate("/auth");
  }, [user, isAdmin, loading, navigate]);

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-background text-foreground">Chargement…</div>;
  if (!user || !isAdmin) return null;

  return (
    <div className="min-h-screen flex bg-background text-foreground">
      <aside className="w-72 shrink-0 border-r border-border bg-noir flex flex-col">
        <div className="p-6 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full gradient-gold flex items-center justify-center shadow-gold">
              <Crown className="w-5 h-5 text-noir" />
            </div>
            <div>
              <div className="font-display text-xl text-gold-gradient leading-none">LB Prestige</div>
              <div className="text-[10px] tracking-[0.2em] text-muted-foreground uppercase mt-1">Admin Console</div>
            </div>
          </div>
        </div>
        <nav className="flex-1 overflow-y-auto p-3 space-y-0.5">
          {nav.map(({ to, icon: Icon, label, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-all ${
                  isActive
                    ? "bg-gold/15 text-gold border-l-2 border-gold"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground"
                }`
              }
            >
              <Icon className="w-4 h-4" />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="p-4 border-t border-border">
          <div className="text-xs text-muted-foreground mb-2 truncate">{user.email}</div>
          <Button variant="outline" size="sm" className="w-full" onClick={async () => { await signOut(); navigate("/auth"); }}>
            <LogOut className="w-4 h-4 mr-2" /> Déconnexion
          </Button>
        </div>
      </aside>
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}
