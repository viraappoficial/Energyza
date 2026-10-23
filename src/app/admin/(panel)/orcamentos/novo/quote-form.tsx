"use client";

import { useActionState, useState } from "react";
import { createQuote } from "../../../actions";
import { brl } from "@/lib/format";

type Row = { desc: string; qty: string; price: string };
const empty = (): Row => ({ desc: "", qty: "1", price: "" });
const toNum = (s: string) => Number(s.replace(",", ".")) || 0;

export function QuoteForm() {
  const [state, action, pending] = useActionState(createQuote, {} as { error?: string });
  const [rows, setRows] = useState<Row[]>([empty(), empty(), empty()]);
  const [discount, setDiscount] = useState("");
  const [surcharge, setSurcharge] = useState("");

  const subtotal = rows.reduce((s, r) => s + toNum(r.qty) * toNum(r.price), 0);
  const total = Math.max(0, subtotal - toNum(discount) + toNum(surcharge));
  const set = (i: number, patch: Partial<Row>) =>
    setRows((rs) => rs.map((r, k) => (k === i ? { ...r, ...patch } : r)));

  return (
    <form action={action} className="space-y-6">
      <section className="card space-y-4 p-5">
        <h2 className="font-semibold text-gold">Cliente</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div><label className="label">Nome *</label><input name="name" required className="input" /></div>
          <div><label className="label">Telefone (WhatsApp)</label><input name="phone" type="tel" className="input" /></div>
          <div><label className="label">E-mail</label><input name="email" type="email" className="input" /></div>
          <div><label className="label">CPF/CNPJ</label><input name="document" className="input" /></div>
          <div className="sm:col-span-2"><label className="label">Endereço</label><input name="address" className="input" /></div>
          <div><label className="label">CEP</label><input name="zip" className="input" /></div>
          <div><label className="label">Bairro</label><input name="neighborhood" className="input" /></div>
          <div><label className="label">Cidade</label><input name="city" defaultValue="Maringá" className="input" /></div>
          <div><label className="label">Estado</label><input name="state" defaultValue="PR" maxLength={2} className="input" /></div>
        </div>
      </section>

      <section className="card space-y-3 p-5">
        <h2 className="font-semibold text-gold">Itens</h2>
        {rows.map((r, i) => (
          <div key={i} className="grid grid-cols-[1fr_4.5rem_6.5rem_auto] items-center gap-2">
            <input name="desc" value={r.desc} onChange={(e) => set(i, { desc: e.target.value })} placeholder={`Item ${i + 1}`} className="input" />
            <input name="qty" value={r.qty} onChange={(e) => set(i, { qty: e.target.value })} inputMode="decimal" className="input" aria-label="Quantidade" />
            <input name="price" value={r.price} onChange={(e) => set(i, { price: e.target.value })} inputMode="decimal" placeholder="Valor unit." className="input" aria-label="Valor unitário" />
            <button type="button" onClick={() => setRows((rs) => (rs.length > 1 ? rs.filter((_, k) => k !== i) : rs))} className="px-2 text-red-300" aria-label="Remover item">✕</button>
          </div>
        ))}
        <button type="button" onClick={() => setRows((rs) => [...rs, empty()])} className="btn btn-outline !py-1.5 text-sm">+ Adicionar item</button>
      </section>

      <section className="card grid gap-4 p-5 sm:grid-cols-3">
        <div><label className="label">Desconto (R$)</label><input name="discount" value={discount} onChange={(e) => setDiscount(e.target.value)} inputMode="decimal" className="input" /></div>
        <div><label className="label">Acréscimo (R$)</label><input name="surcharge" value={surcharge} onChange={(e) => setSurcharge(e.target.value)} inputMode="decimal" className="input" /></div>
        <div><label className="label">Válido até</label><input name="valid_until" type="date" className="input" /></div>
        <div className="sm:col-span-3"><label className="label">Observações (condições de pagamento, garantia…)</label><textarea name="notes" rows={3} className="input" /></div>
        <p className="text-lg sm:col-span-3">Total: <strong className="text-gold">{brl(total)}</strong></p>
      </section>

      {state.error && <p className="text-sm text-red-300">{state.error}</p>}
      <button className="btn btn-gold" disabled={pending}>{pending ? "Salvando…" : "Salvar orçamento"}</button>
    </form>
  );
}
