"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Plus, Tag, Trash2, X } from "lucide-react";
import { createLabel, deleteLabel, toggleChatLabel } from "../../actions";
import { LABEL_COLORS, type Label } from "@/lib/label-types";

// faixa de etiquetas da conversa + tela para marcar, criar e apagar etiquetas
export function LabelBar({ chatId, labels, assigned }: { chatId: string; labels: Label[]; assigned: string[] }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [color, setColor] = useState(LABEL_COLORS[0]);
  const [error, setError] = useState("");
  const [confirmDel, setConfirmDel] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();
  const mine = labels.filter((l) => assigned.includes(l.id));

  const run = (fn: () => Promise<{ error?: string }>, after?: () => void) =>
    start(async () => {
      const r = await fn();
      if (r.error) { setError(r.error); return; }
      setError("");
      after?.();
      router.refresh();
    });

  return (
    <>
      <div className="no-scrollbar flex shrink-0 items-center gap-1.5 overflow-x-auto bg-[#111b21] px-3 py-1.5">
        {mine.map((l) => (
          <span key={l.id} className="shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold text-[#111b21]" style={{ backgroundColor: l.color }}>{l.name}</span>
        ))}
        <button type="button" onClick={() => setOpen(true)} className="flex shrink-0 items-center gap-1 rounded-full border border-dashed border-[#3b4a54] px-2.5 py-0.5 text-xs text-[#8696a0]">
          <Tag className="h-3 w-3" /> {mine.length ? "Etiquetas" : "Adicionar etiqueta"}
        </button>
      </div>

      {open && (
        <div className="wa-font fixed inset-0 z-[70] flex items-end justify-center bg-black/60 sm:items-center" role="dialog" aria-label="Etiquetas da conversa" onClick={() => setOpen(false)}>
          <div className="max-h-[85dvh] w-full max-w-sm overflow-y-auto rounded-t-2xl bg-[#233138] p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-xl sm:rounded-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-2 flex items-center justify-between">
              <p className="text-lg text-[#e9edef]">Etiquetas</p>
              <button type="button" aria-label="Fechar" onClick={() => setOpen(false)} className="grid h-9 w-9 place-items-center text-[#8696a0]"><X className="h-5 w-5" /></button>
            </div>

            <ul>
              {labels.map((l) => {
                const on = assigned.includes(l.id);
                return (
                  <li key={l.id} className="flex items-center gap-1">
                    <button type="button" disabled={pending} onClick={() => run(() => toggleChatLabel(chatId, l.id, !on))} className="flex min-h-12 flex-1 items-center gap-3 rounded-lg px-2 text-left text-[#e9edef] hover:bg-white/5">
                      <span className="h-3.5 w-3.5 shrink-0 rounded-full" style={{ backgroundColor: l.color }} />
                      <span className="min-w-0 flex-1 truncate">{l.name}</span>
                      <span className={`grid h-6 w-6 place-items-center rounded-md border ${on ? "border-[#00a884] bg-[#00a884] text-[#111b21]" : "border-[#3b4a54]"}`}>{on && <Check className="h-4 w-4" />}</span>
                    </button>
                    {confirmDel === l.id ? (
                      <button type="button" disabled={pending} onClick={() => run(() => deleteLabel(l.id), () => setConfirmDel(null))} className="rounded-lg bg-red-500 px-2.5 py-2 text-xs font-semibold text-white">Apagar</button>
                    ) : (
                      <button type="button" aria-label={`Apagar a etiqueta ${l.name}`} onClick={() => setConfirmDel(l.id)} className="grid h-9 w-9 place-items-center text-[#8696a0] hover:text-red-300"><Trash2 className="h-4 w-4" /></button>
                    )}
                  </li>
                );
              })}
            </ul>
            {confirmDel && <p className="px-2 text-xs text-red-200">Apagar a etiqueta tira ela de todas as conversas. Toque em Apagar para confirmar.</p>}

            <div className="mt-3 rounded-lg bg-[#111b21] p-2.5">
              <p className="mb-1.5 text-xs text-[#8696a0]">Nova etiqueta</p>
              <div className="flex gap-2">
                <input value={name} maxLength={30} onChange={(e) => setName(e.target.value)} placeholder="Ex.: Retorno" aria-label="Nome da nova etiqueta" className="min-h-10 min-w-0 flex-1 rounded-lg bg-[#2a3942] px-3 text-base text-[#e9edef] outline-none" />
                <button type="button" disabled={pending || !name.trim()} onClick={() => run(() => createLabel(name, color), () => setName(""))} className="flex min-h-10 items-center gap-1 rounded-lg bg-[#00a884] px-3 font-semibold text-[#111b21] disabled:opacity-50"><Plus className="h-4 w-4" /> Criar</button>
              </div>
              <div className="mt-2 flex gap-2">
                {LABEL_COLORS.map((c) => (
                  <button key={c} type="button" aria-label={`Cor ${c}`} aria-pressed={color === c} onClick={() => setColor(c)} className={`h-7 w-7 rounded-full ${color === c ? "ring-2 ring-white ring-offset-2 ring-offset-[#111b21]" : ""}`} style={{ backgroundColor: c }} />
                ))}
              </div>
            </div>
            {error && <p role="alert" className="mt-2 rounded-lg bg-red-500/15 p-2 text-sm text-red-300">{error}</p>}
          </div>
        </div>
      )}
    </>
  );
}
