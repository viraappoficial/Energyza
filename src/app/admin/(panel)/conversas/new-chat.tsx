"use client";

import { useActionState } from "react";
import { MessageCirclePlus } from "lucide-react";
import { startChat } from "../../actions";

export function NewChat({ compact = false }: { compact?: boolean }) {
  const [state, action, pending] = useActionState(startChat, {} as { error?: string });
  if (compact) {
    return (
      <form action={action}>
        <div className="flex gap-2">
          <input name="phone" type="tel" inputMode="tel" placeholder="Nova conversa: (44) 99999-9999" aria-label="Telefone da nova conversa" className="min-h-10 min-w-0 flex-1 rounded-lg bg-[#202c33] px-3 text-sm text-[#e9edef] outline-none placeholder:text-[#8696a0]" autoComplete="off" />
          <button disabled={pending} aria-label="Abrir conversa" className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-[#00a884] text-[#111b21]"><MessageCirclePlus className="h-5 w-5" /></button>
        </div>
        {state.error && <p className="mt-2 text-xs text-red-300">{state.error}</p>}
      </form>
    );
  }
  return (
    <form action={action} className="edge-card p-4">
      <label className="label" htmlFor="phone">Nova conversa</label>
      <div className="flex gap-2">
        <input id="phone" name="phone" type="tel" inputMode="tel" placeholder="(44) 99999-9999" className="input flex-1" autoComplete="off" />
        <button disabled={pending} className="btn btn-gold shrink-0"><MessageCirclePlus className="h-5 w-5" /> Abrir</button>
      </div>
      {state.error && <p className="mt-2 text-sm text-red-300">{state.error}</p>}
    </form>
  );
}
