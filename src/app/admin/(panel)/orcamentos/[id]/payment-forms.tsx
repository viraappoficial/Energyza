"use client";

import { useActionState } from "react";
import { addPayment, setQuoteDue, type DoneState } from "../../../actions";
import { SubmitButton } from "@/components/submit-button";

const Feedback = ({ s }: { s: DoneState }) =>
  s.error ? (
    <p role="alert" className="rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-300 sm:col-span-full">{s.error}</p>
  ) : s.ok ? (
    <p role="status" className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 p-3 text-sm font-semibold text-emerald-300 sm:col-span-full">✓ {s.msg}</p>
  ) : null;

// Registrar pagamento (o campo do valor recomeça com o novo "falta"; a confirmação fica na tela)
export function PaymentForm({ id, remaining, today, done }: { id: string; remaining: string; today: string; done: boolean }) {
  const [state, action] = useActionState(addPayment, {} as DoneState);
  // quitou: some o formulário, mas a confirmação do último pagamento continua na tela
  if (done) return state.ok ? <div className="mt-4 grid border-t border-border pt-4"><Feedback s={state} /></div> : null;
  return (
    <form action={action} className="mt-4 grid gap-3 border-t border-border pt-4 sm:grid-cols-[1fr_1fr_1fr_auto] sm:items-end">
      <input type="hidden" name="id" value={id} />
      <div><label className="label" htmlFor="p-amount">Valor recebido (R$)</label><input key={remaining} id="p-amount" name="amount" inputMode="decimal" defaultValue={remaining} className="input" /></div>
      <div>
        <label className="label" htmlFor="p-method">Forma</label>
        <select id="p-method" name="method" defaultValue="pix" className="input">
          <option value="pix">Pix</option><option value="dinheiro">Dinheiro</option><option value="cartao">Cartão</option>
          <option value="transferencia">Transferência</option><option value="outro">Outro</option>
        </select>
      </div>
      <div><label className="label" htmlFor="p-date">Data do pagamento</label><input id="p-date" name="date" type="date" defaultValue={today} className="input" /></div>
      <SubmitButton pendingText="Registrando…">Registrar pagamento</SubmitButton>
      <Feedback s={state} />
    </form>
  );
}

// Previsão de quando o cliente vai pagar o que falta
export function DueForm({ id, due, late }: { id: string; due: string; late: string }) {
  const [state, action] = useActionState(setQuoteDue, {} as DoneState);
  return (
    <form action={action} className="mt-4 grid gap-3 border-t border-border pt-4 sm:grid-cols-[1fr_auto] sm:items-end">
      <input type="hidden" name="id" value={id} />
      <div>
        <label className="label" htmlFor="p-due">Quando o cliente vai pagar o que falta? (previsão)</label>
        <input key={due} id="p-due" name="due" type="date" defaultValue={due} className="input" />
        <p className="mt-1 text-xs text-muted">Toque no campo para escolher a data.</p>
        {late && <p className="mt-1 text-sm text-red-300">Atrasado desde {late}</p>}
      </div>
      <SubmitButton className="btn btn-outline" pendingText="Salvando…">Salvar previsão</SubmitButton>
      <Feedback s={state} />
    </form>
  );
}
