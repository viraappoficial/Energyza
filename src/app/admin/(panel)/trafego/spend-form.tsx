"use client";

import { useActionState } from "react";
import { addManualSpend } from "../../actions";

export function SpendForm({ today }: { today: string }) {
  const [state, action, pending] = useActionState(addManualSpend, {} as { error?: string; ok?: boolean });
  return (
    <form action={action} className="grid gap-3 sm:grid-cols-2">
      <div>
        <label className="label" htmlFor="sp-day">Dia</label>
        <input id="sp-day" name="day" type="date" required defaultValue={today} className="input" />
      </div>
      <div>
        <label className="label" htmlFor="sp-channel">Canal</label>
        <select id="sp-channel" name="channel" className="input" defaultValue="google">
          <option value="google">Google Ads</option>
          <option value="meta">Meta Ads (Instagram/Facebook)</option>
          <option value="outro">Outros</option>
        </select>
      </div>
      <div>
        <label className="label" htmlFor="sp-campaign">Campanha (opcional)</label>
        <input id="sp-campaign" name="campaign" className="input" placeholder="Ex.: Pesquisa Maringá" />
      </div>
      <div>
        <label className="label" htmlFor="sp-amount">Valor gasto (R$)</label>
        <input id="sp-amount" name="amount" inputMode="decimal" required className="input" placeholder="Ex.: 35,00" />
      </div>
      {state.error && <p className="rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-300 sm:col-span-2">{state.error}</p>}
      {state.ok && <p className="text-sm text-emerald-300 sm:col-span-2">Gasto lançado ✓</p>}
      <button className="btn btn-gold sm:col-span-2" disabled={pending}>{pending ? "Salvando…" : "Lançar gasto"}</button>
    </form>
  );
}
