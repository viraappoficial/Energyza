import { ExternalLink, File as FileIcon, FileSpreadsheet, FileText, Paperclip } from "lucide-react";

// Como cada anexo aparece dentro do chat: foto e vídeo já visíveis, PDF com a primeira página, o resto como cartão do tipo certo.
const url = (id: string) => `/admin/conversas/media/${id}`;

function kind(mime: string, name: string) {
  const ext = name.toLowerCase().split(".").pop() ?? "";
  if (/pdf/.test(mime) || ext === "pdf") return "pdf";
  if (/sheet|excel|csv/.test(mime) || ["xls", "xlsx", "csv"].includes(ext)) return "planilha";
  if (/word|document|text/.test(mime) || ["doc", "docx", "txt", "odt"].includes(ext)) return "documento";
  return "arquivo";
}
const LABEL: Record<string, string> = { pdf: "PDF", planilha: "Planilha", documento: "Documento", arquivo: "Arquivo" };

export function MediaPreview({ id, mime, name }: { id: string; mime: string; name: string }) {
  const src = url(id);
  if (mime.startsWith("image/")) {
    return (
      <a href={src} target="_blank" rel="noopener noreferrer">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt="Imagem" className="mb-1 max-h-72 w-full rounded-md object-cover" />
      </a>
    );
  }
  if (mime.startsWith("audio/")) return <audio controls src={src} className="mb-1 h-10 max-w-full" />;
  if (mime.startsWith("video/")) {
    // #t=0.1 faz o navegador mostrar o primeiro quadro como capa
    return <video controls playsInline preload="metadata" src={`${src}#t=0.1`} className="mb-1 max-h-80 w-full rounded-md bg-black" />;
  }

  const k = kind(mime, name);
  const Icon = k === "pdf" || k === "documento" ? FileText : k === "planilha" ? FileSpreadsheet : FileIcon;
  return (
    <div className="mb-1 overflow-hidden rounded-md bg-black/20">
      {k === "pdf" && (
        <div className="relative">
          <iframe src={`${src}#toolbar=0&navpanes=0&scrollbar=0&view=FitH`} title={name || "PDF"} loading="lazy" className="h-52 w-full border-0 bg-white" />
          {/* o toque na prévia abre o PDF inteiro (sem isso o iframe engole o toque) */}
          <a href={src} target="_blank" rel="noopener noreferrer" aria-label={`Abrir ${name || "PDF"}`} className="absolute inset-0" />
        </div>
      )}
      <a href={src} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 p-2.5">
        {k === "arquivo" ? <Paperclip className="h-5 w-5 shrink-0 text-[#8696a0]" /> : <Icon className="h-5 w-5 shrink-0 text-[#8696a0]" />}
        <span className="min-w-0 flex-1">
          <span className="block truncate">{name || LABEL[k]}</span>
          <span className="block text-xs text-[#8696a0]">{LABEL[k]} · toque para abrir</span>
        </span>
        <ExternalLink className="h-4 w-4 shrink-0 text-[#8696a0]" />
      </a>
    </div>
  );
}
