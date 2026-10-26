"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

// Caixa com texto para copiar (script, modelo de rastreamento…)
export function CopyBox({ text, label, rows = 6 }: { text: string; label: string; rows?: number }) {
  const [done, setDone] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setDone(true);
      setTimeout(() => setDone(false), 2000);
    } catch {
      // sem permissão de área de transferência: o texto continua selecionável
    }
  }
  return (
    <div>
      <div className="mb-1 flex items-center justify-between gap-3">
        <span className="text-sm font-semibold">{label}</span>
        <button type="button" onClick={copy} className="btn btn-outline !min-h-10 !px-3 !py-1.5 text-sm">
          {done ? <><Check className="h-4 w-4 text-gold" /> Copiado</> : <><Copy className="h-4 w-4" /> Copiar</>}
        </button>
      </div>
      <textarea readOnly rows={rows} value={text} onFocus={(e) => e.currentTarget.select()} className="input !font-mono !text-xs leading-relaxed" spellCheck={false} />
    </div>
  );
}
