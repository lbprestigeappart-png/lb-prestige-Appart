import { Tv, ChefHat, Car, BookOpen, Phone, MapPin, FileSignature, CheckCircle2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { toast } from "sonner";
import { formatDateTime } from "@/lib/format";
import IdUpload from "./IdUpload";

interface InfoPratiquesProps {
  settings: any;
  property: any;
  reservation: any;
  token: string;
  idDocument: any;
  onRefresh: () => void;
  onSignRules: (name: string) => Promise<void>;
  onSubmitId: (data: { idNumber: string; frontFile: File | null; backFile: File | null }) => Promise<void>;
}

function SectionCard({
  icon: Icon,
  title,
  children,
  delay = 0,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  children: React.ReactNode;
  delay?: number;
}) {
  return (
    <Card
      className="p-5 bg-card border-border hover:border-gold/30 transition-all animate-slide-up"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-center gap-2.5 mb-4">
        <div className="w-9 h-9 rounded-lg gradient-gold flex items-center justify-center shadow-gold shrink-0">
          <Icon className="w-4.5 h-4.5 text-noir" />
        </div>
        <h3 className="font-display text-xl text-foreground">{title}</h3>
      </div>
      {children}
    </Card>
  );
}

function KeyValue({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  return (
    <div className="py-2 border-b border-border/30 last:border-0">
      <div className="text-[10px] uppercase text-muted-foreground tracking-wider">{label}</div>
      <div className="font-mono text-sm text-foreground mt-0.5">{value}</div>
    </div>
  );
}

export default function InfoPratiques({
  settings,
  property,
  reservation,
  token,
  idDocument,
  onRefresh,
  onSignRules,
  onSubmitId,
}: InfoPratiquesProps) {
  const [signName, setSignName] = useState("");
  const [signing, setSigning] = useState(false);

  const handleSign = async () => {
    if (!signName.trim()) return toast.error("Veuillez entrer votre nom complet.");
    setSigning(true);
    try {
      await onSignRules(signName.trim());
      setSignName("");
    } finally {
      setSigning(false);
    }
  };

  return (
    <div className="grid gap-4 animate-fade-in">
      {/* Netflix */}
      {(settings?.netflix?.username || settings?.netflix?.password) && (
        <SectionCard icon={Tv} title="Netflix" delay={0}>
          <KeyValue label="Identifiant" value={settings.netflix.username} />
          <KeyValue label="Mot de passe" value={settings.netflix.password} />
          {settings.netflix.instructions && (
            <p className="text-sm text-muted-foreground mt-3 italic">{settings.netflix.instructions}</p>
          )}
        </SectionCard>
      )}

      {/* Kitchen */}
      {settings?.kitchen?.text && (
        <SectionCard icon={ChefHat} title="Cuisine" delay={50}>
          <p className="text-sm text-muted-foreground whitespace-pre-line leading-relaxed">
            {settings.kitchen.text}
          </p>
        </SectionCard>
      )}

      {/* Parking */}
      {settings?.parking?.text && (
        <SectionCard icon={Car} title="Parking" delay={100}>
          <p className="text-sm text-muted-foreground whitespace-pre-line leading-relaxed">
            {settings.parking.text}
          </p>
        </SectionCard>
      )}

      {/* House rules */}
      <SectionCard icon={BookOpen} title="Règlement intérieur" delay={150}>
        {settings?.house_rules?.text && (
          <p className="text-sm text-muted-foreground whitespace-pre-line mb-4 leading-relaxed max-h-60 overflow-y-auto">
            {settings.house_rules.text}
          </p>
        )}
        {reservation.rules_signed_at ? (
          <div className="flex items-center gap-3 p-3.5 rounded-lg bg-gold/10 border border-gold/30">
            <CheckCircle2 className="w-5 h-5 text-gold shrink-0" />
            <div>
              <div className="text-sm font-medium text-foreground">Règlement signé</div>
              <div className="text-xs text-muted-foreground">
                par {reservation.rules_signed_name} • {formatDateTime(reservation.rules_signed_at)}
              </div>
            </div>
          </div>
        ) : (
          <div className="p-4 rounded-lg bg-secondary/40 border border-border space-y-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
              <FileSignature className="w-4 h-4 text-gold" />
              Signature électronique requise
            </div>
            <Input
              placeholder="Votre nom et prénom complets"
              value={signName}
              onChange={(e) => setSignName(e.target.value)}
            />
            <Button
              onClick={handleSign}
              disabled={signing}
              className="w-full gradient-gold text-noir text-xs font-medium"
            >
              {signing ? "Signature…" : "Je certifie avoir lu et accepté le règlement"}
            </Button>
          </div>
        )}
      </SectionCard>

      {/* ID Upload */}
      <IdUpload idDocument={idDocument} onSubmit={onSubmitId} />

      {/* Useful contacts */}
      {(settings?.useful_contacts?.phone || settings?.useful_contacts?.email) && (
        <SectionCard icon={Phone} title="Contacts utiles" delay={200}>
          <KeyValue label="Téléphone" value={settings.useful_contacts.phone} />
          <KeyValue label="E-mail" value={settings.useful_contacts.email} />
          <KeyValue label="Horaires" value={settings.useful_contacts.hours} />
        </SectionCard>
      )}

      {/* Location */}
      {property?.location && (
        <SectionCard icon={MapPin} title="Localisation" delay={250}>
          <p className="text-sm text-foreground mb-3">{property.location}</p>
          {property.address && (
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(property.address)}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 text-xs text-gold hover:underline"
            >
              <MapPin className="w-3.5 h-3.5" />
              Voir sur Google Maps →
            </a>
          )}
        </SectionCard>
      )}
    </div>
  );
}
