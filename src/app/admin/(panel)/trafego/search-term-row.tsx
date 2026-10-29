"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Ban, Check, Undo2 } from "lucide-react";
import { negateTerm, undoNegative } from "../../actions";
import { brl } from "@/lib/format";

export type TermItem = { campaign_id: string; campaign: string; term: string; imp: number; clicks: number; cost: number; conv: number; neg_id: string | null };

// uma linha da lista de termos de pesquisa, com botão de negativar (frase ou exata) e desfazer
export function SearchTermRow({ t }: { t: TermItem }) {
  const [choosing, setChoosing] = useState(false);
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const router = useRouter();
  const waste = t.cost > 0 && t.conv === 0;

  const run = (fn: () => Promise<{ error?: string }>) =>
    start(async () => {
      const r = await fn();
      if (r.error) { setError(r.error); return; }
      setError("");
      setChoosing(false);
      router.refresh();
    });

  return (
    <li className="py-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="break-words font-semibold">{t.term}</p>
          <p className="mt-0.5 text-xs text-muted">
            {t.clicks} {t.clicks === 1 ? "clique" : "cliques"} · {brl(t.cost)} · {t.conv > 0 ? <span className="text-emerald-300">{t.conv.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} conv.</span> : "sem conversão"} · {t.imp} exib.
          </p>
          <p className="truncate text-xs text-muted">{t.campaign}</p>
        </div>
        <div className="shrink-0 text-right">
          {t.neg_id ? (
            <>
              <p className="flex items-center justify-end gap-1 text-xs text-emerald-300"><Check className="h-3.5 w-3.5" /> negativada</p>
              <button type="button" disabled={pending} onClick={() => run(() => undoNegative(t.neg_id!))} className="mt-1 flex min-h-9 items-center gap-1 text-xs text-muted underline"><Undo2 className="h-3.5 w-3.5" /> {pending ? "Desfazendo…" : "Desfazer"}</button>
            </>
          ) : (
            <button type="button" onClick={() => setChoosing((v) => !v)} aria-expanded={choosing} className={`flex min-h-9 items-center gap-1 rounded-lg border px-2.5 text-xs font-semibold ${waste ? "border-yellow-500/60 text-yellow-300" : "border-border text-muted"}`}>
              <Ban className="h-3.5 w-3.5" /> Negativar
            </button>
          )}
        </div>
      </div>
      {choosing && !t.neg_id && (
        <div className="mt-2 rounded-lg border border-border bg-black/30 p-3 text-sm">
          <p className="text-muted">Parar de aparecer para quem digitar isso. Como?</p>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            <button type="button" disabled={pending} onClick={() => run(() => negateTerm(t.campaign_id, t.term, "EXACT"))} className="rounded-lg bg-white/10 p-2.5 text-left">
              <span className="font-semibold">Só essa busca</span>
              <span className="block text-xs text-muted">Exata: bloqueia &ldquo;{t.term}&rdquo; e pouco mais.</span>
            </button>
            <button type="button" disabled={pending} onClick={() => run(() => negateTerm(t.campaign_id, t.term, "PHRASE"))} className="rounded-lg bg-white/10 p-2.5 text-left">
              <span className="font-semibold">Qualquer busca com isso</span>
              <span className="block text-xs text-muted">Frase: bloqueia tudo que contenha &ldquo;{t.term}&rdquo;.</span>
            </button>
          </div>
          {pending && <p className="mt-2 text-xs text-muted">Enviando ao Google…</p>}
        </div>
      )}
      {error && <p role="alert" className="mt-2 rounded-lg bg-red-500/15 p-2 text-sm text-red-300">{error}</p>}
    </li>
  );
}
