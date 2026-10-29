"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, Copy, Forward, Reply, Trash2, X } from "lucide-react";
import { deleteForEveryone, reactTo } from "../../actions";

const EMOJIS = ["👍", "❤️", "😂", "😮", "😢", "🙏"];

// setinha em cada mensagem (como o menu do WhatsApp): responder, reagir, copiar, encaminhar e apagar para todos
export function MessageMenu({ id, fromMe, who, preview, text, myReaction, canForward }: {
  id: string; fromMe: boolean; who: string; preview: string; text: string; myReaction: string; canForward: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [pending, start] = useTransition();
  const router = useRouter();

  const close = () => { setOpen(false); setConfirm(false); setError(""); setCopied(false); };
  const run = (fn: () => Promise<{ error?: string }>) =>
    start(async () => {
      const r = await fn();
      if (r.error) { setError(r.error); return; }
      close();
      router.refresh();
    });

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(close, 700);
    } catch {
      setError("Não consegui copiar. Segure o texto e copie.");
    }
  }

  return (
    <>
      <button
        type="button"
        aria-label="Opções da mensagem"
        onClick={() => setOpen(true)}
        className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-black/30 text-[#aebac1] opacity-60 hover:opacity-100 active:scale-95"
      >
        <ChevronDown className="h-4 w-4" />
      </button>
      {open && (
        <div className="wa-font fixed inset-0 z-[70] flex items-end justify-center bg-black/60 sm:items-center" role="dialog" aria-label="Opções da mensagem" onClick={close}>
          <div className="w-full max-w-sm rounded-t-2xl bg-[#233138] p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-xl sm:rounded-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-2 flex items-center justify-between gap-2">
              <p className="min-w-0 truncate text-sm text-[#8696a0]">{preview}</p>
              <button type="button" aria-label="Fechar" onClick={close} className="grid h-8 w-8 shrink-0 place-items-center text-[#8696a0]"><X className="h-5 w-5" /></button>
            </div>

            <div className="mb-2 flex justify-between rounded-full bg-[#111b21] px-2 py-1.5">
              {EMOJIS.map((e) => (
                <button key={e} type="button" disabled={pending} onClick={() => run(() => reactTo(id, e))} aria-label={`Reagir ${e}`}
                  className={`grid h-10 w-10 place-items-center rounded-full text-2xl active:scale-90 ${myReaction === e ? "bg-white/15" : ""}`}>{e}</button>
              ))}
            </div>

            {[
              { label: "Responder", icon: <Reply className="h-5 w-5" />, on: () => { window.dispatchEvent(new CustomEvent("wa-reply", { detail: { id, who, preview } })); close(); } },
              ...(text ? [{ label: copied ? "Copiado ✓" : "Copiar", icon: <Copy className="h-5 w-5" />, on: copy }] : []),
              ...(canForward ? [{ label: "Encaminhar", icon: <Forward className="h-5 w-5" />, on: () => { window.dispatchEvent(new CustomEvent("wa-forward", { detail: { id, preview } })); close(); } }] : []),
            ].map((a) => (
              <button key={a.label} type="button" onClick={a.on} className="flex min-h-12 w-full items-center gap-3 rounded-lg px-3 text-left text-[#e9edef] hover:bg-white/5">
                <span className="text-[#aebac1]">{a.icon}</span> {a.label}
              </button>
            ))}

            {fromMe && !confirm && (
              <button type="button" onClick={() => setConfirm(true)} className="flex min-h-12 w-full items-center gap-3 rounded-lg px-3 text-left text-red-300 hover:bg-white/5">
                <Trash2 className="h-5 w-5" /> Apagar para todos
              </button>
            )}
            {fromMe && confirm && (
              <div className="mt-1 rounded-lg bg-red-500/10 p-3 text-sm text-red-200">
                <p>Apagar essa mensagem para todos? O cliente verá &ldquo;Esta mensagem foi apagada&rdquo;.</p>
                <div className="mt-2 flex gap-2">
                  <button type="button" disabled={pending} onClick={() => run(() => deleteForEveryone(id))} className="flex-1 rounded-lg bg-red-500 py-2.5 font-semibold text-white disabled:opacity-60">{pending ? "Apagando…" : "Apagar"}</button>
                  <button type="button" onClick={() => setConfirm(false)} className="flex-1 rounded-lg bg-white/10 py-2.5 text-[#e9edef]">Cancelar</button>
                </div>
              </div>
            )}
            {error && <p role="alert" className="mt-2 rounded-lg bg-red-500/15 p-2 text-sm text-red-300">{error}</p>}
          </div>
        </div>
      )}
    </>
  );
}
