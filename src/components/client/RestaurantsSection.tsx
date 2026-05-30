import { useState } from "react";
import {
  UtensilsCrossed, Wine, Phone, ArrowLeft, ShoppingBag,
  Plus, Minus, X, Send, Sparkles,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

export type CartItem = {
  id: string;
  kind: "dish" | "drink";
  name: string;
  price: number;
  qty: number;
  restaurantId: string;
};

function dishImageUrl(path?: string | null) {
  if (!path) return null;
  const { data } = supabase.storage.from("dish-images").getPublicUrl(path);
  return data.publicUrl;
}

/* ─── Restaurant List ─── */
export function RestaurantsList({
  restaurants,
  onSelect,
}: {
  restaurants: any[];
  onSelect: (id: string) => void;
}) {
  if (restaurants.length === 0) {
    return (
      <Card className="p-10 text-center text-sm text-muted-foreground border-dashed animate-fade-in">
        <UtensilsCrossed className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
        Aucun restaurant partenaire pour le moment.
      </Card>
    );
  }

  return (
    <div className="grid sm:grid-cols-2 gap-4">
      {restaurants.map((r, idx) => {
        const cover = dishImageUrl(r.dishes?.[0]?.image_path) || dishImageUrl(r.drinks?.[0]?.image_path);
        return (
          <button
            key={r.id}
            onClick={() => onSelect(r.id)}
            className="group text-left rounded-xl overflow-hidden border border-border bg-card hover:border-gold/60 transition-all hover:-translate-y-1 hover:shadow-gold animate-slide-up"
            style={{ animationDelay: `${idx * 80}ms` }}
          >
            <div className="aspect-[16/9] bg-secondary relative overflow-hidden">
              {cover ? (
                <img src={cover} alt={r.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                  <UtensilsCrossed className="w-10 h-10" />
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-noir via-noir/30 to-transparent" />
              <div className="absolute top-3 right-3">
                <span className="px-2 py-1 rounded-full bg-gold/90 text-noir text-[10px] font-semibold uppercase tracking-wider">
                  Partenaire
                </span>
              </div>
              <div className="absolute bottom-3 left-4 right-4">
                <h3 className="font-display text-xl text-foreground drop-shadow">{r.name}</h3>
                <div className="flex items-center gap-3 text-[11px] text-muted-foreground mt-1">
                  <span className="flex items-center gap-1"><UtensilsCrossed className="w-3 h-3" /> {r.dishes?.length ?? 0} plats</span>
                  <span className="flex items-center gap-1"><Wine className="w-3 h-3" /> {r.drinks?.length ?? 0} boissons</span>
                </div>
              </div>
            </div>
            <div className="px-4 py-3 flex items-center justify-between border-t border-border">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Phone className="w-3 h-3" /><span className="font-mono">{r.phone}</span>
              </div>
              <span className="text-[10px] uppercase tracking-wider text-gold group-hover:translate-x-1 transition-transform">
                Voir le menu →
              </span>
            </div>
          </button>
        );
      })}
    </div>
  );
}

/* ─── Menu Section ─── */
function MenuSection({
  title, icon: Icon, items, kind, cart, addToCart, updateQty,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  items: any[];
  kind: "dish" | "drink";
  cart: Record<string, CartItem>;
  addToCart: (item: any) => void;
  updateQty: (key: string, delta: number) => void;
}) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-3 pb-2 border-b border-gold/20">
        <Icon className="w-4 h-4 text-gold" />
        <h3 className="font-display text-xl text-gold-gradient">{title}</h3>
        <div className="ml-auto text-[10px] uppercase tracking-wider text-muted-foreground">{items.length} article(s)</div>
      </div>
      {items.length === 0 ? (
        <p className="text-xs italic text-muted-foreground py-4">Bientôt disponible.</p>
      ) : (
        <div className="grid sm:grid-cols-2 gap-3">
          {items.map((d: any) => {
            const key = `${kind}:${d.id}`;
            const qty = cart[key]?.qty ?? 0;
            const img = dishImageUrl(d.image_path);
            return (
              <div key={d.id} className="rounded-lg border border-border bg-card overflow-hidden flex hover:border-gold/40 transition-colors group">
                <div className="w-28 h-28 shrink-0 bg-secondary relative overflow-hidden">
                  {img ? (
                    <img src={img} alt={d.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" loading="lazy" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                      <Icon className="w-6 h-6" />
                    </div>
                  )}
                </div>
                <div className="flex-1 p-3 flex flex-col min-w-0">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-foreground truncate">{d.name}</div>
                    {kind === "drink" && (
                      <div className="text-[10px] uppercase tracking-wider text-muted-foreground mt-0.5">
                        {d.drink_type === "alcoholic" ? "Alcoolisé" : "Soft"}
                      </div>
                    )}
                    {d.description && (
                      <div className="text-[11px] text-muted-foreground leading-snug line-clamp-2 mt-1">{d.description}</div>
                    )}
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <div className="font-mono text-sm text-gold-gradient font-semibold">
                      {Number(d.price_fcfa).toLocaleString("fr-FR")} F
                    </div>
                    {qty === 0 ? (
                      <button
                        onClick={() => addToCart(d)}
                        className="gradient-gold text-noir rounded-full w-8 h-8 flex items-center justify-center hover:scale-110 transition-transform active:scale-95"
                        aria-label="Ajouter au panier"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        <button onClick={() => updateQty(key, -1)} className="w-7 h-7 rounded-full border border-gold/40 text-gold hover:bg-gold/10 flex items-center justify-center"><Minus className="w-3 h-3" /></button>
                        <span className="w-5 text-center text-sm font-mono">{qty}</span>
                        <button onClick={() => updateQty(key, 1)} className="w-7 h-7 rounded-full gradient-gold text-noir flex items-center justify-center"><Plus className="w-3 h-3" /></button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ─── Restaurant Detail ─── */
export function RestaurantDetail({
  restaurant, onBack, cart, addToCart, updateQty,
}: {
  restaurant: any;
  onBack: () => void;
  cart: Record<string, CartItem>;
  addToCart: (kind: "dish" | "drink", item: any, restaurantId: string) => void;
  updateQty: (key: string, delta: number) => void;
}) {
  return (
    <div className="space-y-6 animate-slide-up">
      <div className="flex items-center justify-between">
        <button onClick={onBack} className="text-xs text-muted-foreground hover:text-gold flex items-center gap-1.5 transition-colors">
          <ArrowLeft className="w-3.5 h-3.5" /> Tous les restaurants
        </button>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Phone className="w-3 h-3" /><span className="font-mono">{restaurant.phone}</span>
        </div>
      </div>
      <Card className="p-6 bg-card border-gold/20">
        <div className="text-[10px] tracking-[0.3em] uppercase text-gold mb-2">Restaurant partenaire</div>
        <h2 className="font-display text-3xl text-foreground">{restaurant.name}</h2>
      </Card>
      <MenuSection title="Plats Signatures" icon={UtensilsCrossed} items={restaurant.dishes ?? []}
        kind="dish" cart={cart} addToCart={(i) => addToCart("dish", i, restaurant.id)} updateQty={updateQty} />
      <MenuSection title="Carte des Boissons" icon={Wine} items={restaurant.drinks ?? []}
        kind="drink" cart={cart} addToCart={(i) => addToCart("drink", i, restaurant.id)} updateQty={updateQty} />
    </div>
  );
}

/* ─── Restaurants Section (orchestrator) ─── */
export default function RestaurantsSection({
  restaurants, cart, setCart,
}: {
  restaurants: any[];
  cart: Record<string, CartItem>;
  setCart: (c: Record<string, CartItem>) => void;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [cartOpen, setCartOpen] = useState(false);
  const selected = restaurants.find((r) => r.id === selectedId);
  const cartCount = Object.values(cart).reduce((s, i) => s + i.qty, 0);
  const cartTotal = Object.values(cart).reduce((s, i) => s + i.qty * i.price, 0);

  function addToCart(kind: "dish" | "drink", item: any, restaurantId: string) {
    const key = `${kind}:${item.id}`;
    const existing = cart[key];
    setCart({
      ...cart,
      [key]: existing
        ? { ...existing, qty: existing.qty + 1 }
        : { id: item.id, kind, name: item.name, price: Number(item.price_fcfa) || 0, qty: 1, restaurantId },
    });
  }

  function updateQty(key: string, delta: number) {
    const item = cart[key];
    if (!item) return;
    const nextQty = item.qty + delta;
    const next = { ...cart };
    if (nextQty <= 0) delete next[key];
    else next[key] = { ...item, qty: nextQty };
    setCart(next);
  }

  function removeItem(key: string) {
    const next = { ...cart }; delete next[key]; setCart(next);
  }

  function buildWhatsappLink() {
    if (!selected) return "#";
    const waNum = (selected.phone || "").replace(/\D/g, "");
    const items = Object.values(cart).filter((i) => i.restaurantId === selected.id);
    if (items.length === 0) return "#";
    const lines = items.map((i) => `- ${i.qty}x ${i.name} (${(i.price * i.qty).toLocaleString("fr-FR")} FCFA)`);
    const total = items.reduce((s, i) => s + i.qty * i.price, 0);
    const text =
      `Bonjour, je séjourne actuellement à l'appartement meublé LB Prestige Appart. Je souhaite passer une commande minute pour la sélection suivante :\n\n` +
      `${lines.join("\n")}\n\nTotal de la commande : ${total.toLocaleString("fr-FR")} FCFA. Merci de me confirmer la livraison à l'appartement.`;
    return `https://wa.me/${waNum}?text=${encodeURIComponent(text)}`;
  }

  return (
    <div className="grid gap-5 relative">
      {/* Header */}
      <Card className="p-6 bg-gradient-to-br from-card via-card to-noir border-gold/30 shadow-gold relative overflow-hidden">
        <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: "radial-gradient(circle at 80% 20%, hsl(var(--gold)) 0%, transparent 60%)" }} />
        <div className="relative">
          <div className="flex items-center gap-2 text-[10px] tracking-[0.3em] uppercase text-gold mb-2">
            <Sparkles className="w-3 h-3" /> Room Service & Restauration de luxe
          </div>
          <h2 className="font-display text-3xl text-gold-gradient leading-tight">La table à votre porte</h2>
          <p className="text-sm text-muted-foreground mt-2 max-w-xl">
            Une sélection de restaurants partenaires. Composez votre commande et envoyez-la directement par WhatsApp.
          </p>
        </div>
      </Card>

      {/* Floating cart badge */}
      {cartCount > 0 && (
        <button
          onClick={() => setCartOpen(true)}
          className="fixed bottom-24 md:bottom-8 left-6 z-30 gradient-gold text-noir rounded-full shadow-gold flex items-center gap-2 px-5 py-3 hover:scale-105 transition-transform active:scale-95"
        >
          <ShoppingBag className="w-5 h-5" />
          <span className="font-semibold text-sm">{cartCount}</span>
          <span className="font-mono text-xs">{cartTotal.toLocaleString("fr-FR")} FCFA</span>
        </button>
      )}

      {/* List / Detail */}
      {!selected ? (
        <RestaurantsList restaurants={restaurants} onSelect={setSelectedId} />
      ) : (
        <RestaurantDetail
          restaurant={selected}
          onBack={() => setSelectedId(null)}
          cart={cart}
          addToCart={addToCart}
          updateQty={updateQty}
        />
      )}

      {/* Cart drawer */}
      {cartOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-noir/80 backdrop-blur-sm" onClick={() => setCartOpen(false)}>
          <div className="w-full sm:max-w-md bg-card border border-gold/30 rounded-t-2xl sm:rounded-2xl shadow-gold max-h-[85vh] overflow-hidden flex flex-col animate-slide-up" onClick={(e) => e.stopPropagation()} style={{ animationDuration: "0.25s" }}>
            <div className="flex items-center justify-between p-5 border-b border-border">
              <div className="flex items-center gap-2">
                <ShoppingBag className="w-4 h-4 text-gold" />
                <h3 className="font-display text-lg text-gold-gradient">Votre commande</h3>
              </div>
              <button onClick={() => setCartOpen(false)} className="text-muted-foreground hover:text-foreground p-1"><X className="w-4 h-4" /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {Object.entries(cart).length === 0 && <p className="text-center text-sm text-muted-foreground py-8">Votre panier est vide.</p>}
              {Object.entries(cart).map(([key, item]) => (
                <div key={key} className="flex items-center justify-between gap-3 p-3 rounded-lg border border-border bg-secondary/30 animate-fade-in">
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium truncate">{item.name}</div>
                    <div className="text-[11px] font-mono text-gold">{item.price.toLocaleString("fr-FR")} FCFA</div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button onClick={() => updateQty(key, -1)} className="w-7 h-7 rounded-full border border-border hover:border-gold flex items-center justify-center"><Minus className="w-3 h-3" /></button>
                    <span className="w-6 text-center text-sm font-mono">{item.qty}</span>
                    <button onClick={() => updateQty(key, 1)} className="w-7 h-7 rounded-full border border-border hover:border-gold flex items-center justify-center"><Plus className="w-3 h-3" /></button>
                    <button onClick={() => removeItem(key)} className="ml-2 text-muted-foreground hover:text-destructive"><X className="w-3.5 h-3.5" /></button>
                  </div>
                </div>
              ))}
            </div>
            {Object.keys(cart).length > 0 && (
              <div className="p-4 border-t border-border space-y-3 bg-noir/50">
                <div className="flex items-center justify-between">
                  <span className="text-xs uppercase tracking-wider text-muted-foreground">Total</span>
                  <span className="font-display text-2xl text-gold-gradient">{cartTotal.toLocaleString("fr-FR")} FCFA</span>
                </div>
                {selected ? (
                  <a href={buildWhatsappLink()} target="_blank" rel="noreferrer">
                    <Button className="w-full gradient-gold text-noir gap-2 hover:scale-[1.02] transition-transform">
                      <Send className="w-4 h-4" /> Commander via WhatsApp
                    </Button>
                  </a>
                ) : (
                  <p className="text-[11px] text-center text-muted-foreground">
                    Ouvrez un restaurant pour finaliser la commande.
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
