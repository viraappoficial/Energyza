"use client";

import { useActionState, useState } from "react";
import { saveQuote } from "../../actions";
import { brl } from "@/lib/format";
import { QuotePreview } from "./quote-preview";

export type CatalogItem = { id: string; description: string; unit_price: number };
export type QuoteInitial = {
  id?: string;
  appointmentId?: string;
  number?: number;
  issuedAt?: string;
  name: string;
  phone: string;
  email: string;
  document: string;
  address: string;
  zip: string;
  neighborhood: string;
  city: string;
  state: string;
  discount: number;
  surcharge: number;
  validUntil: string;
  notes: string;
  items: { description: string; quantity: number; unit_price: number }[];
};

type Row = { key: number; desc: string; qty: string; price: string; cat: boolean };

const toNum = (s: string) => {
  const t = s.trim();
  if (!t) return 0;
  const n = t.includes(",") ? Number(t.replace(/\./g, "").replace(",", ".")) : Number(t);
  return Number.isFinite(n) && n > 0 ? n : 0;
};
const fmtInput = (n: number) => (n ? n.toFixed(2).replace(".", ",") : "");

let keySeq = 1;
const newRow = (r?: Partial<Row>): Row => ({ key: keySeq++, desc: "", qty: "1", price: "", cat: false, ...r });

export function QuoteForm({
  initial,
  catalog,
  today,
}: {
  initial: QuoteInitial;
  catalog: CatalogItem[];
  today: string; // YYYY-MM-DD (Brasília)
}) {
  const [state, action, pending] = useActionState(saveQuote, {} as { error?: string });
  const [v, setV] = useState({
    name: initial.name,
    phone: initial.phone,
    email: initial.email,
    document: initial.document,
    address: initial.address,
    zip: initial.zip,
    neighborhood: initial.neighborhood,
    city: initial.city,
    state: initial.state,
    discount: fmtInput(initial.discount),
    surcharge: fmtInput(initial.surcharge),
    validUntil: initial.validUntil,
    notes: initial.notes,
  });
  const [rows, setRows] = useState<Row[]>(() => {
    const base = initial.items.map((it) =>
      newRow({ desc: it.description, qty: String(it.quantity).replace(".", ","), price: fmtInput(it.unit_price) }),
    );
    // orçamento novo: sempre pelo menos 3 linhas à mão
    while (!initial.id && base.length < 3) base.push(newRow());
    return base.length > 0 ? base : [newRow()];
  });
  const set = (k: keyof typeof v) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setV((s) => ({ ...s, [k]: e.target.value }));
  const setRow = (key: number, patch: Partial<Row>) =>
    setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)));

  const items = rows
    .filter((r) => r.desc.trim())
    .map((r) => ({ description: r.desc.trim(), quantity: toNum(r.qty) || 1, unit_price: toNum(r.price) }));
  const subtotal = items.reduce((s, it) => s + it.quantity * it.unit_price, 0);
  const total = Math.max(0, subtotal - toNum(v.discount) + toNum(v.surcharge));

  const defaultValid = new Date(Date.parse(`${today}T12:00:00Z`) + 15 * 86_400_000).toISOString().slice(0, 10);

  function onDesc(key: number, value: string) {
    const hit = catalog.find((c) => c.description === value);
    const row = rows.find((r) => r.key === key);
    setRow(key, {
      desc: value,
      ...(hit && row && !row.price.trim() ? { price: fmtInput(hit.unit_price) } : {}),
    });
  }

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <form action={action} className="min-w-0 space-y-5">
        {initial.id && <input type="hidden" name="id" value={initial.id} />}
        {initial.appointmentId && <input type="hidden" name="appointment_id" value={initial.appointmentId} />}

        <section className="edge-card space-y-3 p-4">
          <h2 className="font-display text-2xl font-bold uppercase">Cliente</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2"><label className="label">Nome *</label><input name="name" required value={v.name} onChange={set("name")} className="input" /></div>
            <div><label className="label">WhatsApp / telefone</label><input name="phone" type="tel" value={v.phone} onChange={set("phone")} className="input" placeholder="(44) 99999-9999" /></div>
            <div><label className="label">E-mail</label><input name="email" type="email" value={v.email} onChange={set("email")} className="input" /></div>
            <div><label className="label">CPF/CNPJ</label><input name="document" value={v.document} onChange={set("document")} className="input" /></div>
            <div><label className="label">CEP</label><input name="zip" value={v.zip} onChange={set("zip")} className="input" /></div>
            <div className="sm:col-span-2"><label className="label">Endereço</label><input name="address" value={v.address} onChange={set("address")} className="input" /></div>
            <div><label className="label">Bairro</label><input name="neighborhood" value={v.neighborhood} onChange={set("neighborhood")} className="input" /></div>
            <div className="grid grid-cols-[1fr_4.5rem] gap-3">
              <div><label className="label">Cidade</label><input name="city" value={v.city} onChange={set("city")} className="input" /></div>
              <div><label className="label">UF</label><input name="state" maxLength={2} value={v.state} onChange={set("state")} className="input uppercase" /></div>
            </div>
          </div>
        </section>

        <section className="edge-card space-y-3 p-4">
          <h2 className="font-display text-2xl font-bold uppercase">Itens</h2>
          <datalist id="catalog">
            {catalog.map((c) => (
              <option key={c.id} value={c.description}>{brl(c.unit_price)}</option>
            ))}
          </datalist>
          {rows.map((r, i) => (
            <div key={r.key} className="rounded-lg border border-border p-2">
              <div className="grid grid-cols-[1fr_auto] items-start gap-2">
                <input
                  name="desc"
                  list="catalog"
                  value={r.desc}
                  onChange={(e) => onDesc(r.key, e.target.value)}
                  placeholder={`Item ${i + 1} — descrição`}
                  className="input"
                />
                <button type="button" onClick={() => setRows((rs) => (rs.length > 1 ? rs.filter((x) => x.key !== r.key) : rs))} className="flex h-11 w-11 items-center justify-center text-red-300" aria-label="Remover item">✕</button>
              </div>
              <div className="mt-2 grid grid-cols-[4.5rem_1fr_auto] items-center gap-2">
                <input name="qty" value={r.qty} onChange={(e) => setRow(r.key, { qty: e.target.value })} inputMode="decimal" className="input" aria-label="Quantidade" />
                <input name="price" value={r.price} onChange={(e) => setRow(r.key, { price: e.target.value })} inputMode="decimal" placeholder="Valor (R$)" className="input" aria-label="Valor unitário" />
                <label className="flex min-h-11 items-center gap-1.5 px-1 text-xs text-muted" title="Guarda este item e o valor para usar nos próximos orçamentos">
                  <input type="checkbox" checked={r.cat} onChange={(e) => setRow(r.key, { cat: e.target.checked })} /> catálogo
                </label>
                <input type="hidden" name="cat" value={r.cat ? "1" : "0"} />
              </div>
            </div>
          ))}
          <button type="button" onClick={() => setRows((rs) => [...rs, newRow()])} className="btn btn-outline !py-1.5 text-sm">+ Adicionar item</button>
        </section>

        <section className="edge-card grid gap-3 p-4 sm:grid-cols-3">
          <div><label className="label">Desconto (R$)</label><input name="discount" value={v.discount} onChange={set("discount")} inputMode="decimal" className="input" /></div>
          <div><label className="label">Acréscimo (R$)</label><input name="surcharge" value={v.surcharge} onChange={set("surcharge")} inputMode="decimal" className="input" /></div>
          <div><label className="label">Válido até</label><input name="valid_until" type="date" value={v.validUntil || defaultValid} onChange={set("validUntil")} className="input" /></div>
          <div className="sm:col-span-3">
            <label className="label">Observações e condições (pagamento, prazo, garantia…)</label>
            <textarea name="notes" rows={3} value={v.notes} onChange={set("notes")} className="input" placeholder="Ex.: 50% na entrada e 50% na conclusão. Garantia de 90 dias no serviço." />
          </div>
        </section>

        {state.error && <p className="rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-300">{state.error}</p>}
        <div className="sticky bottom-0 z-10 -mx-4 flex items-center justify-between gap-3 border-t border-border bg-black/95 px-4 py-3 backdrop-blur lg:static lg:mx-0 lg:justify-start lg:gap-5 lg:border-0 lg:bg-transparent lg:p-0">
          <span className="text-lg">Total: <strong className="text-gold">{brl(total)}</strong></span>
          <button className="btn btn-gold" disabled={pending}>
            {pending ? "Salvando…" : initial.id ? "Salvar alterações" : "Gerar orçamento"}
          </button>
        </div>
      </form>

      <aside className="min-w-0 lg:sticky lg:top-4 lg:self-start">
        <h2 className="font-display mb-2 text-2xl font-bold uppercase">Como <span className="gold-text">vai sair</span></h2>
        <QuotePreview
          data={{
            number: initial.number,
            issuedAt: initial.issuedAt ?? today,
            validUntil: v.validUntil || defaultValid,
            name: v.name,
            phone: v.phone,
            email: v.email,
            document: v.document,
            address: v.address,
            zip: v.zip,
            neighborhood: v.neighborhood,
            city: v.city,
            state: v.state,
            items,
            discount: toNum(v.discount),
            surcharge: toNum(v.surcharge),
            notes: v.notes,
          }}
        />
        <p className="mt-2 text-xs text-muted">Prévia ao vivo. O PDF final sai igual a este modelo.</p>
      </aside>
    </div>
  );
}
