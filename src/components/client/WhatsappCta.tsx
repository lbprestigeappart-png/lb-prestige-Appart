import { MessageSquare, ExternalLink } from "lucide-react";

interface WhatsappCtaProps {
  phone?: string;
}

export default function WhatsappCta({ phone }: WhatsappCtaProps) {
  if (!phone) return null;
  const waNum = phone.replace(/\D/g, "");
  if (!waNum) return null;

  return (
    <a
      href={`https://wa.me/${waNum}`}
      target="_blank"
      rel="noreferrer"
      className="fixed bottom-24 md:bottom-8 right-6 z-30 group"
    >
      <div className="relative">
        {/* Pulse ring */}
        <div className="absolute inset-0 rounded-full animate-pulse-gold" />

        {/* Button */}
        <div className="relative flex items-center gap-3 gradient-gold text-noir rounded-full px-5 py-3.5 shadow-gold hover:scale-105 transition-transform duration-200 active:scale-95">
          <MessageSquare className="w-5 h-5" />
          <span className="font-semibold text-sm hidden sm:inline">Contacter la conciergerie</span>
          <span className="font-semibold text-sm sm:hidden">WhatsApp</span>
          <ExternalLink className="w-3.5 h-3.5 opacity-60" />
        </div>
      </div>
    </a>
  );
}
