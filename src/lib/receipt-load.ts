import { sql } from "@/lib/db";
import { buildReceiptPdf } from "@/lib/receipt-pdf";

export const receiptFileName = (number: string) => `recibo-${number}-energyza.pdf`;

// Carrega o pagamento e gera o recibo em PDF (null se não existir)
export async function loadReceiptPdf(paymentId: string) {
  const [r] = await sql<
    {
      amount: number; paid_at: string; method: string; number: number; customer_name: string; customer_document: string;
      due: string | null; total: number; seq: number; paid_until: number; quote_id: string;
    }[]
  >`
    select p.amount::float8 as amount, p.paid_at, p.method, q.number, q.customer_name, q.customer_document, q.due_date as due, q.id as quote_id,
      greatest(0, coalesce((select sum(quantity * unit_price) from quote_items where quote_id = q.id), 0) - q.discount + q.surcharge)::float8 as total,
      (select count(*) from quote_payments x where x.quote_id = q.id and (x.paid_at, x.created_at) <= (p.paid_at, p.created_at))::int as seq,
      (select coalesce(sum(x.amount), 0) from quote_payments x where x.quote_id = q.id and (x.paid_at, x.created_at) <= (p.paid_at, p.created_at))::float8 as paid_until
    from quote_payments p join quotes q on q.id = p.quote_id where p.id = ${paymentId}`;
  if (!r) return null;
  const items = await sql<{ description: string }[]>`select description from quote_items where quote_id = ${r.quote_id} order by position limit 3`;
  const description = items.map((i) => i.description).join("; ");
  const number = `${String(r.number).padStart(4, "0")}-${String(r.seq).padStart(2, "0")}`;
  const bytes = await buildReceiptPdf({
    number,
    paidAt: String(r.paid_at).slice(0, 10),
    amount: r.amount,
    method: r.method,
    quoteNumber: r.number,
    customerName: r.customer_name,
    customerDocument: r.customer_document,
    description: description.length > 140 ? `${description.slice(0, 137)}...` : description,
    total: r.total,
    paidUntil: r.paid_until,
    due: r.due ? String(r.due).slice(0, 10) : null,
  });
  return { bytes, number, amount: r.amount, left: Math.max(0, Math.round((r.total - r.paid_until) * 100) / 100), customer: r.customer_name, quoteId: r.quote_id };
}
