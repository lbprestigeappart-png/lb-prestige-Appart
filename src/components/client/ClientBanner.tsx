import { Crown, Sparkles } from "lucide-react";
import { useEffect, useRef, useState } from "react";

interface ClientBannerProps {
  bannerUrl?: string | null;
  bannerTitle?: string | null;
  propertyName?: string | null;
  subtitle?: string | null;
}

export default function ClientBanner({
  bannerUrl,
  bannerTitle,
  propertyName,
  subtitle,
}: ClientBannerProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [offset, setOffset] = useState(0);

  // Parallax on scroll
  useEffect(() => {
    function onScroll() {
      if (!ref.current) return;
      const rect = ref.current.getBoundingClientRect();
      if (rect.bottom > 0) setOffset(window.scrollY * 0.35);
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const title = bannerTitle || propertyName || "LB Prestige Appart";

  return (
    <header ref={ref} className="relative overflow-hidden h-72 md:h-96">
      {/* Background image with parallax */}
      {bannerUrl ? (
        <img
          key={bannerUrl}
          src={`${bannerUrl}${bannerUrl.includes("?") ? "&" : "?"}t=${Date.now()}`}
          alt={title}
          className="absolute inset-0 w-full h-full object-cover transition-transform duration-100"
          style={{ transform: `translateY(${offset}px) scale(1.1)` }}
          loading="eager"
        />
      ) : (
        <div className="absolute inset-0 bg-noir">
          <div
            className="absolute inset-0 opacity-20 animate-gradient"
            style={{ background: "var(--gradient-gold)", backgroundSize: "200% 200%" }}
          />
        </div>
      )}

      {/* Gradient overlays */}
      <div className="absolute inset-0 bg-gradient-to-t from-noir via-noir/50 to-noir/10" />
      <div className="absolute inset-0 bg-gradient-to-r from-noir/40 via-transparent to-noir/40" />

      {/* Decorative gold particles */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {[...Array(5)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 rounded-full bg-gold/40 animate-float"
            style={{
              left: `${15 + i * 18}%`,
              top: `${20 + (i % 3) * 25}%`,
              animationDelay: `${i * 0.6}s`,
              animationDuration: `${3 + i * 0.5}s`,
            }}
          />
        ))}
      </div>

      {/* Content */}
      <div className="absolute inset-0 flex flex-col items-center justify-end pb-10 px-6 text-center">
        {/* Logo */}
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-full gradient-gold mb-4 shadow-gold animate-scale-in ring-gold-glow">
          <Crown className="w-7 h-7 text-noir" />
        </div>

        {/* Sparkle badge */}
        <div className="inline-flex items-center gap-2 text-[10px] tracking-[0.35em] uppercase text-gold/80 mb-3 animate-fade-in stagger-1">
          <Sparkles className="w-3 h-3" />
          <span>Conciergerie d'Exception</span>
          <Sparkles className="w-3 h-3" />
        </div>

        {/* Title */}
        <h1 className="font-display text-4xl md:text-6xl text-gold-gradient leading-tight mb-2 animate-slide-up stagger-2">
          {title}
        </h1>

        {/* Subtitle */}
        {subtitle && (
          <p className="text-sm tracking-[0.2em] text-ivory/70 uppercase animate-fade-in stagger-3">
            {subtitle}
          </p>
        )}

        {/* Bottom gold line */}
        <div className="w-16 h-px gradient-gold mt-5 animate-fade-in stagger-4" />
      </div>
    </header>
  );
}
