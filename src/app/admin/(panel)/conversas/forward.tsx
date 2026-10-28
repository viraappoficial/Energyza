"use client";

import { useActionState, useEffect, useState } from "react";
import { Forward, Search, X } from "lucide-react";
import { forwardMessage, type DoneState } from "../../actions";
import { SubmitButton } from "@/components/submit-button";
import { fmtPhone, initials } from "@/lib/wa-format";

export type ForwardChat = { chat_id: string; name: string; phone: string };
const MAX = 5;

// botãozinho ao lado de cada mensagem (como o "encaminhar" do WhatsApp)
export function ForwardButton({ id, preview }: { id: string; preview: string }) {
  return (
    <button
      type="button"
      aria-label="Encaminhar mensagem"
      title="Encaminhar"
      onClick={() => window.dispatchEvent(new CustomEvent("wa-forward", { detail: { id, preview } }))}
      className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-black/30 text-[#aebac1] opacity-70 hover:opacity-100 active:scale-95"
    >
      <Forward className="h-4 w-4" />
    </button>
  );
}

// tela de escolher para quem encaminhar
export function ForwardSheet({ chats }: { chats: ForwardChat[] }) {
  const [open, setOpen] = useState<{ id: string; preview: string; seq: number } | null>(null);

  // abre quando um botão de encaminhar é tocado; `seq` faz o painel recomeçar do zero a cada abertura
  useEffect(() => {
    let seq = 0;
    const onOpen = (e: Event) => setOpen({ ...(e as CustomEvent<{ id: string; preview: string }>).detail, seq: ++seq });
    window.addEventListener("wa-forward", onOpen);
    return () => window.removeEventListener("wa-forward", onOpen);
  }, []);

  if (!open) return null;
  return <ForwardPanel key={open.seq} chats={chats} msg={open} onClose={() => setOpen(null)} />;
}

function ForwardPanel({ chats, msg, onClose }: { chats: ForwardChat[]; msg: { id: string; preview: string }; onClose: () => void }) {
  const [picked, setPicked] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [phones, setPhones] = useState("");
  const [state, action] = useActionState(forwardMessage, {} as DoneState);

  const term = search.trim().toLowerCase();
  const list = chats.filter((c) => !term || c.name.toLowerCase().includes(term) || c.phone.includes(term.replace(/\D/g, "") || "§"));
  const extra = phones.split(/[,;\n]/).filter((p) => p.replace(/\D/g, "").length >= 10).length;
  const total = picked.length + extra;
  const toggle = (id: string) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : p.length + extra >= MAX ? p : [...p, id]));
  const done = !!state.ok;

  return (
    <div className="wa-font fixed inset-0 z-[70] flex flex-col bg-[#0b141a]" role="dialog" aria-label="Encaminhar mensagem">
      <div className="flex shrink-0 items-center gap-2 bg-[#202c33] px-2 py-2">
        <button type="button" aria-label="Fechar" onClick={onClose} className="grid h-10 w-10 place-items-center rounded-full text-[#d1d7db] hover:bg-white/10"><X className="h-6 w-6" /></button>
        <p className="text-[1.05rem] text-[#e9edef]">Encaminhar para…</p>
      </div>

      <div className="shrink-0 space-y-2 p-3">
        <p className="truncate rounded-lg bg-[#202c33] px-3 py-2 text-sm text-[#8696a0]">“{msg.preview.slice(0, 120)}”</p>
        <div className="flex min-h-11 items-center gap-2 rounded-lg bg-[#202c33] px-3">
          <Search className="h-4 w-4 shrink-0 text-[#8696a0]" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar contato" aria-label="Buscar contato" className="min-w-0 flex-1 bg-transparent text-base text-[#e9edef] outline-none placeholder:text-[#8696a0]" />
        </div>
      </div>

      <ul className="min-h-0 flex-1 divide-y divide-white/5 overflow-y-auto overscroll-contain">
        {list.length === 0 && <li className="p-5 text-sm text-[#8696a0]">Nenhum contato encontrado. Use “Ou um número novo” abaixo.</li>}
        {list.map((c) => {
          const on = picked.includes(c.chat_id);
          const title = c.name || (c.phone ? fmtPhone(c.phone) : "Contato");
          return (
            <li key={c.chat_id}>
              <button type="button" onClick={() => toggle(c.chat_id)} aria-pressed={on} className="flex min-h-14 w-full items-center gap-3 px-4 py-2 text-left hover:bg-[#202c33]">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[#6a7175] font-medium text-white">{initials(title)}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[#e9edef]">{title}</span>
                  {c.name && c.phone && <span className="block truncate text-xs text-[#8696a0]">{fmtPhone(c.phone)}</span>}
                </span>
                <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-full border-2 text-sm font-bold ${on ? "border-[#00a884] bg-[#00a884] text-[#111b21]" : "border-[#667781] text-transparent"}`}>✓</span>
              </button>
            </li>
          );
        })}
      </ul>

      <form action={action} className="shrink-0 space-y-2 border-t border-white/10 bg-[#111b21] p-3">
        <input type="hidden" name="messageId" value={msg.id} />
        {picked.map((id) => <input key={id} type="hidden" name="to" value={id} />)}
        <label className="block text-xs text-[#8696a0]">Ou um número novo (com DDD; separe vários por vírgula)
          <input name="phones" value={phones} onChange={(e) => setPhones(e.target.value)} inputMode="tel" placeholder="(44) 99999-9999" className="mt-1 w-full rounded-lg bg-[#2a3942] px-3 py-2.5 text-base text-[#e9edef] outline-none placeholder:text-[#667781]" />
        </label>
        {state.error && <p role="alert" className="rounded-lg bg-red-500/15 p-2 text-sm text-red-300">{state.error}</p>}
        {done && <p role="status" className="rounded-lg bg-emerald-500/15 p-2 text-sm font-semibold text-emerald-300">✓ {state.msg}</p>}
        <div className="flex items-center gap-3">
          <p className="min-w-0 flex-1 text-sm text-[#8696a0]">{total === 0 ? "Escolha até 5 contatos" : `${total} de ${MAX} escolhido${total > 1 ? "s" : ""}`}</p>
          {done ? (
            <button type="button" onClick={onClose} className="btn btn-outline !py-2.5">Fechar</button>
          ) : (
            <SubmitButton className="btn !bg-[#00a884] !px-6 !py-2.5 !text-[#111b21] disabled:opacity-50" pendingText="Enviando…">Enviar</SubmitButton>
          )}
        </div>
      </form>
    </div>
  );
}
