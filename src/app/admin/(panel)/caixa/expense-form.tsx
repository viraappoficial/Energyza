"use client";

import { useActionState, useRef } from "react";
import { addExpense } from "../../actions";

export function ExpenseForm({ today }: { today: string }) {
  const ref = useRef<HTMLFormElement>(null);
  const [state, action, pending] = useActionState(async (prev: { error?: string; ok?: boolean }, fd: FormData) => {
    const r = await addExpense(prev, fd);
    if (r.ok) ref.current?.reset();
    return r;
  }, {} as { error?: string; ok?: boolean });
  return (
    <form ref={ref} action={action} className="grid gap-3 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <label className="label" htmlFor="ex-desc">O que foi</label>
        <input id="ex-desc" name="description" required maxLength={160} className="input" placeholder="Ex.: Cabos e disjuntores" />
      </div>
      <div>
        <label className="label" htmlFor="ex-cat">Tipo</label>
        <select id="ex-cat" name="category" defaultValue="material" className="input">
          <option value="material">Material</option><option value="combustivel">Combustível</option><option value="ferramenta">Ferramenta</option>
          <option value="imposto">Imposto</option><option value="ajudante">Ajudante</option><option value="outros">Outros</option>
        </select>
      </div>
      <div>
        <label className="label" htmlFor="ex-amount">Valor (R$)</label>
        <input id="ex-amount" name="amount" required inputMode="decimal" className="input" placeholder="Ex.: 180,00" />
      </div>
      <div>
        <label className="label" htmlFor="ex-day">Dia</label>
        <input id="ex-day" name="day" type="date" defaultValue={today} className="input" />
      </div>
      <div className="flex items-end">
        <button className="btn btn-gold w-full" disabled={pending}>{pending ? "Salvando…" : "Lançar despesa"}</button>
      </div>
      {state.error && <p className="rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-300 sm:col-span-2">{state.error}</p>}
      {state.ok && <p className="text-sm text-emerald-300 sm:col-span-2">Despesa lançada ✓</p>}
    </form>
  );
}
