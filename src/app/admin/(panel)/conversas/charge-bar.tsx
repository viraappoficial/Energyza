"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { ChevronDown, ChevronUp, FileText, HandCoins, Link2, MessageSquareShare, Receipt } from "lucide-react";
import { addPayment, linkQuoteToChat, type DoneState } from "../../actions";
import { brl } from "@/lib/format";
import { business } from "@/lib/config";
import { pixPayload } from "@/lib/pix";
import { SubmitButton } from "@/components/submit-button";

export type Charge = { id: string; number: number; status: string; total: number; paid: number; due: string | null; manual: boolean };
export type OtherQuote = { id: string; number: number; customer_name: string; total: number };

const num = (n: number) => String(n).padStart(4, "0");
const dmy = (d: string) => d.slice(0, 10).split("-").reverse().join("/");
const cents = (n: number) => Math.round(n * 100) / 100;
const fill = (text: string) => window.dispatchEvent(new CustomEvent("wa-fill", { detail: text }));

// mensagem pronta de cobrança (o texto vai para o campo de mensagem e pode ser editado antes de enviar)
function chargeText(first: string, c: Charge, left: number, late: boolean, pix: string, pixName: string) {
  const oi = `Olá${first ? `, ${first}` : ""}!`;
  const resta = c.paid > 0 ? `Já recebi ${brl(c.paid)} e restam ${brl(left)}.` : `O valor é ${brl(left)}.`;
  const quando = c.due ? (late ? ` Venceu em ${dmy(c.due)}.` : ` Vence em ${dmy(c.due)}.`) : "";
  const fecho = late ? "Consegue regularizar hoje?" : "Qualquer dúvida, é só falar!";
  const copia = pix ? pixPayload({ key: pix, name: pixName || business.legalName, city: business.city, amount: left }) : "";
  const chave = pix ? `\nPix: ${pix}${pixName ? `\nTitular: ${pixName}` : ""}\nPix copia e cola (valor ${brl(left)}):\n${copia}\nSegue também o orçamento com os dados para pagamento.` : "";
  return `${oi} Passando para lembrar do orçamento nº ${num(c.number)}. ${resta}${quando}${chave}\n${fecho}`;
}

function ReceiveForm({ id, left, today, first }: { id: string; left: number; today: string; first: string }) {
  const [s, action] = useActionState(addPayment, {} as DoneState);
  const thanksText = () =>
    `Recebi seu pagamento de ${brl(s.amount ?? 0)}${first ? `, ${first}` : ""}. ${s.left ? `Ainda faltam ${brl(s.left)}.` : "Está tudo quitado. Obrigado! 🙏"}`;
  const thanks = () => fill(thanksText());
  const sendReceipt = () =>
    window.dispatchEvent(new CustomEvent("wa-receipt", { detail: { id: s.paymentId, label: `Recibo ${brl(s.amount ?? 0)}`, text: `${thanksText()}\nSegue o recibo.` } }));
  return (
    <form action={action} className="mt-2 grid grid-cols-2 gap-2 rounded-lg bg-[#111b21] p-2 text-sm">
      <input type="hidden" name="id" value={id} />
      <label className="col-span-2 text-xs text-[#8696a0]">Valor recebido (R$)
        <input key={left} name="amount" inputMode="decimal" defaultValue={left.toFixed(2).replace(".", ",")} className="mt-1 w-full rounded-lg bg-[#2a3942] px-3 py-2.5 text-base text-[#e9edef] outline-none" />
      </label>
      <label className="text-xs text-[#8696a0]">Forma
        <select name="method" defaultValue="pix" className="mt-1 w-full rounded-lg bg-[#2a3942] px-2 py-2.5 text-base text-[#e9edef] outline-none">
          <option value="pix">Pix</option><option value="dinheiro">Dinheiro</option><option value="cartao">Cartão</option><option value="transferencia">Transferência</option><option value="outro">Outro</option>
        </select>
      </label>
      <label className="min-w-0 text-xs text-[#8696a0]">Data
        <input name="date" type="date" defaultValue={today} className="input mt-1 !min-h-0 !bg-[#2a3942] !py-2.5 !text-[#e9edef]" />
      </label>
      <SubmitButton className="btn col-span-2 !bg-[#00a884] !py-2.5 !text-[#111b21]" pendingText="Registrando…">Registrar pagamento</SubmitButton>
      {s.error && <p role="alert" className="col-span-2 rounded-lg bg-red-500/15 p-2 text-red-300">{s.error}</p>}
      {s.ok && (
        <div role="status" className="col-span-2 rounded-lg bg-emerald-500/15 p-2 text-emerald-300">
          <p className="font-semibold">✓ {s.msg}</p>
          <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1">
            <button type="button" onClick={sendReceipt} className="font-semibold underline">Enviar recibo (PDF)</button>
            <button type="button" onClick={thanks} className="underline">Só avisar</button>
          </div>
        </div>
      )}
    </form>
  );
}

export function ChargeBar({
  chatId, first, pix, pixName, today, charges, others, receiptCount,
}: { chatId: string; first: string; pix: string; pixName: string; today: string; charges: Charge[]; others: OtherQuote[]; receiptCount: number }) {
  const [open, setOpen] = useState(true);
  const [receiving, setReceiving] = useState<string | null>(null);
  const [linking, setLinking] = useState(false);

  const rows = charges.map((c) => {
    const left = Math.max(0, cents(c.total - c.paid));
    return { c, left, late: left > 0 && !!c.due && c.due < today };
  });
  // cobrança: falta pagar e o serviço já está combinado (aprovado/concluído), ou já houve pagamento parcial, ou tem data prevista
  const cards = rows.filter((r) => r.left > 0 && (["aprovado", "concluido"].includes(r.c.status) || r.c.paid > 0 || r.c.due));
  const chips = rows.filter((r) => !cards.includes(r));
  const totalLeft = cents(cards.reduce((s, r) => s + r.left, 0));
  const anyLate = cards.some((r) => r.late);

  if (rows.length === 0 && others.length === 0 && receiptCount === 0) return null;

  return (
    <div className="max-h-[55dvh] shrink-0 overflow-y-auto overscroll-contain bg-[#111b21] px-3 py-2 text-xs">
      {cards.length > 0 && (
        <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open} className="flex w-full items-center justify-between gap-2 py-1 text-left">
          <span className="flex items-center gap-2 font-semibold text-[#e9edef]"><HandCoins className="h-4 w-4 text-[#00a884]" /> Cobrança
            <span className={`rounded-full px-2 py-0.5 ${anyLate ? "bg-red-500/20 text-red-300" : "bg-sky-500/20 text-sky-300"}`}>{anyLate ? "atrasado · " : "falta "}{brl(totalLeft)}</span>
          </span>
          {open ? <ChevronUp className="h-4 w-4 text-[#8696a0]" /> : <ChevronDown className="h-4 w-4 text-[#8696a0]" />}
        </button>
      )}

      {open && cards.map(({ c, left, late }) => (
        <div key={c.id} className="mt-1.5 rounded-xl bg-[#202c33] p-3">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <Link href={`/admin/orcamentos/${c.id}`} className="font-semibold text-[#e9edef] underline-offset-2 hover:underline">#{num(c.number)}</Link>
              <p className="text-[#8696a0]">Total {brl(c.total)}{c.paid > 0 ? ` · pago ${brl(c.paid)}` : ""}</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-semibold text-sky-300">Falta {brl(left)}</p>
              <p className={late ? "text-red-300" : "text-[#8696a0]"}>{c.due ? (late ? `atrasado desde ${dmy(c.due)}` : `vence ${dmy(c.due)}`) : "sem data prevista"}</p>
            </div>
          </div>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <button type="button" onClick={() => window.dispatchEvent(new CustomEvent("wa-charge", { detail: { id: c.id, number: c.number, total: c.total, status: c.status, text: chargeText(first, c, left, late, pix, pixName) } }))} className="flex min-h-10 items-center justify-center gap-1.5 rounded-lg bg-[#00a884] px-3 text-sm font-semibold text-[#111b21] active:opacity-80">
              <MessageSquareShare className="h-4 w-4" /> Cobrar
            </button>
            <button type="button" onClick={() => setReceiving(receiving === c.id ? null : c.id)} aria-expanded={receiving === c.id} className="flex min-h-10 items-center justify-center gap-1.5 rounded-lg bg-[#2a3942] px-3 text-sm font-semibold text-[#e9edef] active:opacity-80">
              <HandCoins className="h-4 w-4" /> Recebi
            </button>
          </div>
          {receiving === c.id && <ReceiveForm id={c.id} left={left} today={today} first={first} />}
          {c.manual && (
            <form action={linkQuoteToChat} className="mt-1.5 text-right">
              <input type="hidden" name="quote_id" value={c.id} /><input type="hidden" name="chat_id" value="" />
              <button className="text-[#8696a0] underline">desvincular desta conversa</button>
            </form>
          )}
        </div>
      ))}
      {!pix && open && cards.length > 0 && <p className="mt-1.5 text-[#8696a0]">Dica: configure a chave Pix (PIX_KEY) para ela ir junto na mensagem de cobrança.</p>}

      {(chips.length > 0 || others.length > 0 || receiptCount > 0) && (
        <div className="no-scrollbar mt-1.5 flex items-center gap-2 overflow-x-auto">
          {chips.map(({ c, left }) => (
            <Link key={c.id} href={`/admin/orcamentos/${c.id}`} className="flex shrink-0 items-center gap-1.5 rounded-full bg-[#202c33] px-3 py-1.5 text-[#d1d7db]">
              <FileText className="h-3.5 w-3.5 text-[#00a884]" /> #{num(c.number)} · {brl(c.total)} · {left === 0 && c.paid > 0 ? "pago ✓" : c.status}
            </Link>
          ))}
          {receiptCount > 0 && (
            <button type="button" onClick={() => window.dispatchEvent(new CustomEvent("wa-open-receipts"))} className="flex shrink-0 items-center gap-1.5 rounded-full bg-[#202c33] px-3 py-1.5 font-semibold text-[#00a884]">
              <Receipt className="h-3.5 w-3.5" /> Enviar recibo
            </button>
          )}
          {others.length > 0 && (
            <button type="button" onClick={() => setLinking((v) => !v)} className="flex shrink-0 items-center gap-1.5 rounded-full border border-dashed border-[#3b4a54] px-3 py-1.5 text-[#8696a0]">
              <Link2 className="h-3.5 w-3.5" /> Vincular orçamento
            </button>
          )}
        </div>
      )}

      {linking && (
        <form action={linkQuoteToChat} className="mt-2 flex gap-2">
          <input type="hidden" name="chat_id" value={chatId} />
          <select name="quote_id" required defaultValue="" aria-label="Orçamento para vincular" className="min-w-0 flex-1 rounded-lg bg-[#2a3942] px-2 py-2.5 text-base text-[#e9edef] outline-none">
            <option value="" disabled>Escolha o orçamento…</option>
            {others.map((o) => <option key={o.id} value={o.id}>#{num(o.number)} · {o.customer_name} · {brl(o.total)}</option>)}
          </select>
          <SubmitButton className="btn !bg-[#00a884] !px-4 !py-2 !text-[#111b21]" pendingText="Vinculando…">Vincular</SubmitButton>
        </form>
      )}
    </div>
  );
}
