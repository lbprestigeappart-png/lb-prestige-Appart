import { FileText, ExternalLink } from "lucide-react";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";

interface Document {
  id: string;
  title: string;
  file_type: string;
  file_size?: string | null;
  external_url?: string | null;
  storage_path?: string | null;
}

interface DocumentsListProps {
  documents: Document[];
}

const typeIcons: Record<string, string> = {
  pdf: "📄",
  image: "🖼️",
  video: "🎬",
  default: "📎",
};

function getTypeEmoji(fileType: string): string {
  const lower = fileType.toLowerCase();
  if (lower.includes("pdf")) return typeIcons.pdf;
  if (lower.includes("image") || lower.includes("jpg") || lower.includes("png")) return typeIcons.image;
  if (lower.includes("video")) return typeIcons.video;
  return typeIcons.default;
}

export default function DocumentsList({ documents }: DocumentsListProps) {
  return (
    <div className="grid gap-3 animate-fade-in">
      {documents.length === 0 && (
        <Card className="p-10 text-center border-dashed">
          <div className="w-14 h-14 rounded-full bg-secondary/50 flex items-center justify-center mx-auto mb-4">
            <FileText className="w-6 h-6 text-muted-foreground" />
          </div>
          <p className="text-sm text-muted-foreground">Aucun document pour le moment.</p>
        </Card>
      )}

      {documents.map((doc, idx) => {
        const href = doc.external_url && doc.external_url !== "#"
          ? doc.external_url
          : doc.storage_path
            ? supabase.storage.from("documents").getPublicUrl(doc.storage_path).data.publicUrl
            : null;

        const Wrapper: any = href ? "a" : "div";
        const wrapperProps = href ? { href, target: "_blank", rel: "noreferrer" } : {};

        return (
          <Wrapper
            key={doc.id}
            {...wrapperProps}
            className="block animate-slide-up"
            style={{ animationDelay: `${idx * 60}ms` }}
          >
            <Card className={`p-4 bg-card border-border transition-all flex items-center gap-4 ${href ? "hover:border-gold/40 hover:-translate-y-0.5 hover:shadow-gold/10 cursor-pointer" : "opacity-60"}`}>
              <div className="w-12 h-12 rounded-lg gradient-gold flex items-center justify-center shadow-gold shrink-0 text-lg">
                {getTypeEmoji(doc.file_type)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm text-foreground truncate">{doc.title}</div>
                <div className="text-xs text-muted-foreground">
                  {doc.file_type}
                  {doc.file_size && ` • ${doc.file_size}`}
                </div>
              </div>
              {href && <ExternalLink className="w-4 h-4 text-muted-foreground shrink-0" />}
            </Card>
          </Wrapper>
        );
      })}
    </div>
  );
}
