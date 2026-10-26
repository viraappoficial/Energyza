"use client";

import { useActionState } from "react";
import { MessageCirclePlus } from "lucide-react";
import { startChat } from "../../actions";

export function NewChat() {
  const [state, action, pending] = useActionState(startChat, {} as { error?: string });
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
