"use client";

import { deleteQuote } from "../../../actions";

// Excluir pede confirmação e avisa quando já há dinheiro recebido (os pagamentos e a previsão somem junto)
export function DeleteQuote({ id, number, paid, payments }: { id: string; number: number; paid: string; payments: number }) {
  const msg = payments > 0
    ? `O orçamento #${String(number).padStart(4, "0")} já tem ${paid} recebidos (${payments} ${payments === 1 ? "pagamento" : "pagamentos"}).\n\nSe excluir, os pagamentos, os recibos e a previsão dele saem do Caixa e isso não dá para desfazer.\n\nPara só tirar da frente, é melhor marcar como "recusado".\n\nExcluir mesmo assim?`
    : `Excluir o orçamento #${String(number).padStart(4, "0")}? Isso não dá para desfazer.`;
  return (
    <form action={deleteQuote} className="ml-auto" onSubmit={(e) => { if (!confirm(msg)) e.preventDefault(); }}>
      <input type="hidden" name="id" value={id} />
      <button className="px-3 py-2 text-sm text-red-300 hover:underline">Excluir</button>
    </form>
  );
}
