import type { ReactNode } from "react";

// Texto da mensagem como no WhatsApp: links clicáveis, *negrito*, _itálico_ e ~riscado~
const URL_RE = /(https?:\/\/[^\s<]+|www\.[^\s<]+)/gi;
const FMT_RE = /(\*[^*\n]+\*|_[^_\n]+_|~[^~\n]+~)/g;

function formatted(text: string, key: string): ReactNode[] {
  return text.split(FMT_RE).map((part, i) => {
    const k = `${key}-${i}`;
    if (part.length > 2) {
      const inner = part.slice(1, -1);
      if (part.startsWith("*") && part.endsWith("*")) return <strong key={k}>{inner}</strong>;
      if (part.startsWith("_") && part.endsWith("_")) return <em key={k}>{inner}</em>;
      if (part.startsWith("~") && part.endsWith("~")) return <s key={k}>{inner}</s>;
    }
    return part;
  });
}

export function WaText({ text }: { text: string }) {
  return (
    <>
      {text.split(URL_RE).map((part, i) => {
        if (i % 2 === 1) {
          // pontuação no fim da frase não faz parte do link
          const trail = /[.,;:!?)\]]+$/.exec(part)?.[0] ?? "";
          const url = trail ? part.slice(0, -trail.length) : part;
          const href = /^https?:\/\//i.test(url) ? url : `https://${url}`;
          return (
            <span key={i}>
              <a href={href} target="_blank" rel="noopener noreferrer nofollow" className="break-all text-[#53bdeb] underline">{url}</a>
              {trail}
            </span>
          );
        }
        return <span key={i}>{formatted(part, String(i))}</span>;
      })}
    </>
  );
}
