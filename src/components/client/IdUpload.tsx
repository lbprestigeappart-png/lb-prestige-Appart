import { useState, useRef } from "react";
import { IdCard, Upload, CheckCircle2, Clock, Hash, Image as ImageIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { formatDateTime } from "@/lib/format";

interface IdUploadProps {
  idDocument: {
    id_number?: string | null;
    front_path?: string | null;
    back_path?: string | null;
    submitted_at?: string | null;
  } | null;
  onSubmit: (data: { idNumber: string; frontFile: File | null; backFile: File | null }) => Promise<void>;
}

function FileDropZone({
  label,
  file,
  onFileChange,
  existingPath,
}: {
  label: string;
  file: File | null;
  onFileChange: (f: File | null) => void;
  existingPath?: string | null;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);

  const handleFile = (f: File | null) => {
    onFileChange(f);
    if (f) {
      const reader = new FileReader();
      reader.onload = (e) => setPreview(e.target?.result as string);
      reader.readAsDataURL(f);
    } else {
      setPreview(null);
    }
  };

  return (
    <div
      className="relative border-2 border-dashed border-border/60 rounded-lg p-4 text-center hover:border-gold/40 transition-colors cursor-pointer group"
      onClick={() => inputRef.current?.click()}
      onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add("border-gold/60"); }}
      onDragLeave={(e) => { e.currentTarget.classList.remove("border-gold/60"); }}
      onDrop={(e) => {
        e.preventDefault();
        e.currentTarget.classList.remove("border-gold/60");
        const f = e.dataTransfer.files[0];
        if (f && f.type.startsWith("image/")) handleFile(f);
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
      />

      {preview ? (
        <div className="relative">
          <img src={preview} alt={label} className="w-full h-24 object-cover rounded-md" />
          <div className="absolute inset-0 bg-noir/40 flex items-center justify-center rounded-md opacity-0 group-hover:opacity-100 transition-opacity">
            <span className="text-xs text-foreground font-medium">Changer</span>
          </div>
        </div>
      ) : (
        <>
          <Upload className="w-6 h-6 text-muted-foreground mx-auto mb-2 group-hover:text-gold transition-colors" />
          <div className="text-xs text-muted-foreground mb-1">{label}</div>
          <div className="text-[10px] text-muted-foreground/60">
            {existingPath ? "✓ Déjà envoyé — cliquez pour remplacer" : "Glissez ou cliquez"}
          </div>
        </>
      )}

      {file && (
        <div className="text-[10px] text-gold mt-2 truncate">{file.name}</div>
      )}
    </div>
  );
}

export default function IdUpload({ idDocument, onSubmit }: IdUploadProps) {
  const [idNumber, setIdNumber] = useState(idDocument?.id_number ?? "");
  const [frontFile, setFrontFile] = useState<File | null>(null);
  const [backFile, setBackFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  // Progress tracker
  const items = [
    { key: "number", label: "Numéro de CNI", icon: Hash, done: !!idDocument?.id_number },
    { key: "front", label: "Photo recto", icon: ImageIcon, done: !!idDocument?.front_path },
    { key: "back", label: "Photo verso", icon: ImageIcon, done: !!idDocument?.back_path },
  ];
  const completed = items.filter((i) => i.done).length;
  const allDone = completed === items.length;

  const handleSubmit = async () => {
    if (idNumber.trim().length < 3) return;
    setUploading(true);
    try {
      await onSubmit({ idNumber: idNumber.trim(), frontFile, backFile });
      setFrontFile(null);
      setBackFile(null);
    } finally {
      setUploading(false);
    }
  };

  return (
    <Card className="p-5 bg-card border-border hover:border-gold/30 transition-all animate-slide-up">
      <div className="flex items-center gap-2.5 mb-4">
        <div className="w-9 h-9 rounded-lg gradient-gold flex items-center justify-center shadow-gold shrink-0">
          <IdCard className="w-4.5 h-4.5 text-noir" />
        </div>
        <h3 className="font-display text-xl text-foreground">Pièce d'identité</h3>
      </div>

      {/* Progress */}
      <div className={`p-3.5 rounded-lg border mb-4 ${allDone ? "bg-gold/10 border-gold/30" : "bg-secondary/40 border-border"}`}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            {allDone ? (
              <CheckCircle2 className="w-4 h-4 text-gold" />
            ) : (
              <Clock className="w-4 h-4 text-muted-foreground" />
            )}
            <span className="text-xs font-medium">
              {allDone ? "Envoi complet" : completed === 0 ? "Aucun élément envoyé" : "Envoi en cours"}
            </span>
          </div>
          <span className="text-[11px] font-mono text-muted-foreground">{completed}/{items.length}</span>
        </div>
        <div className="h-1.5 rounded-full bg-background/50 overflow-hidden">
          <div
            className="h-full gradient-gold transition-all duration-500 rounded-full"
            style={{ width: `${(completed / items.length) * 100}%` }}
          />
        </div>
        {idDocument?.submitted_at && (
          <div className="text-[10px] text-muted-foreground mt-2">
            Dernière mise à jour : {formatDateTime(idDocument.submitted_at)}
          </div>
        )}
      </div>

      {/* Status items */}
      <ul className="space-y-1.5 mb-4">
        {items.map((it) => {
          const Icon = it.icon;
          return (
            <li
              key={it.key}
              className={`flex items-center justify-between gap-3 px-3 py-2 rounded-md border text-xs ${
                it.done ? "bg-gold/5 border-gold/30" : "bg-secondary/30 border-border"
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <Icon className={`w-3.5 h-3.5 shrink-0 ${it.done ? "text-gold" : "text-muted-foreground"}`} />
                <span className="font-medium">{it.label}</span>
              </div>
              {it.done ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-gold shrink-0" />
              ) : (
                <Clock className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              )}
            </li>
          );
        })}
      </ul>

      {/* Upload form */}
      {!allDone && (
        <div className="space-y-3 p-4 rounded-lg bg-secondary/30 border border-border">
          <Input
            placeholder="Numéro de la CNI"
            value={idNumber}
            onChange={(e) => setIdNumber(e.target.value)}
          />
          <div className="grid grid-cols-2 gap-3">
            <FileDropZone
              label="📷 Photo Recto"
              file={frontFile}
              onFileChange={setFrontFile}
              existingPath={idDocument?.front_path}
            />
            <FileDropZone
              label="📷 Photo Verso"
              file={backFile}
              onFileChange={setBackFile}
              existingPath={idDocument?.back_path}
            />
          </div>
          <Button
            onClick={handleSubmit}
            disabled={uploading || idNumber.trim().length < 3}
            className="w-full gradient-gold text-noir text-xs font-medium"
          >
            {uploading ? (
              <span className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 border-2 border-noir/30 border-t-noir rounded-full animate-spin" />
                Envoi en cours…
              </span>
            ) : (
              "Envoyer ma pièce d'identité"
            )}
          </Button>
        </div>
      )}

      {/* If all done but want to update */}
      {allDone && (
        <details className="group">
          <summary className="text-[11px] text-muted-foreground italic cursor-pointer hover:text-foreground transition-colors">
            Renvoyer ou compléter une photo
          </summary>
          <div className="mt-3 space-y-3 p-4 rounded-lg bg-secondary/30 border border-border">
            <Input
              placeholder="Numéro de la CNI"
              value={idNumber}
              onChange={(e) => setIdNumber(e.target.value)}
            />
            <div className="grid grid-cols-2 gap-3">
              <FileDropZone
                label="📷 Photo Recto"
                file={frontFile}
                onFileChange={setFrontFile}
                existingPath={idDocument?.front_path}
              />
              <FileDropZone
                label="📷 Photo Verso"
                file={backFile}
                onFileChange={setBackFile}
                existingPath={idDocument?.back_path}
              />
            </div>
            <Button
              onClick={handleSubmit}
              disabled={uploading || idNumber.trim().length < 3}
              className="w-full gradient-gold text-noir text-xs font-medium"
            >
              {uploading ? "Envoi…" : "Mettre à jour"}
            </Button>
          </div>
        </details>
      )}
    </Card>
  );
}
