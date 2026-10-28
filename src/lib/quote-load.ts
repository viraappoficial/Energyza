import { sql } from "@/lib/db";
import { buildQuotePdf, type ChargeBlock } from "@/lib/quote-pdf";
import { normalizePixKey, pixPayload } from "@/lib/pix";
import { business } from "@/lib/config";

export const quoteFileName = (number: number) => `orcamento-${String(number).padStart(4, "0")}-energyza.pdf`;
export const chargeFileName = (number: number) => `cobranca-${String(number).padStart(4, "0")}-energyza.pdf`;

// rótulo da chave: CNPJ, CPF, e-mail…
const keyLabel = (k: string) => (/^\d{14}$/.test(k) ? "Chave Pix (CNPJ)" : /^\d{11}$/.test(k) ? "Chave Pix (CPF)" : k.includes("@") ? "Chave Pix (e-mail)" : "Chave Pix");

// Carrega o orçamento e gera o PDF (null se não existir)
export async function loadQuotePdf(id: string, opts: { charge?: boolean } = {}) {
  const [quote] = await sql`select * from quotes where id = ${id}`;
  if (!quote) return null;
  const items = await sql<{ description: string; quantity: number; unit_price: number }[]>`
    select description, quantity, unit_price from quote_items
    where quote_id = ${id} order by position`;
  const subtotal = items.reduce((n, i) => n + i.quantity * i.unit_price, 0);
  const total = Math.max(0, subtotal - Number(quote.discount) + Number(quote.surcharge));

  // cobrança: PDF com o bloco de Pix, valor que falta e vencimento (se houver chave Pix configurada)
  let charge: ChargeBlock | undefined;
  const pixKey = process.env.PIX_KEY ?? "";
  if (opts.charge && pixKey) {
    const [pay] = await sql<{ paid: number }[]>`select coalesce(sum(amount), 0)::float8 as paid from quote_payments where quote_id = ${id}`;
    const paid = Math.round((pay?.paid ?? 0) * 100) / 100;
    const left = Math.max(0, Math.round((total - paid) * 100) / 100);
    if (left > 0) {
      const key = normalizePixKey(pixKey);
      const holder = process.env.PIX_NAME ?? "";
      charge = {
        amount: left, total, paid, key: pixKey.trim(), keyLabel: keyLabel(key), holder, bank: process.env.PIX_BANK ?? "",
        due: quote.due_date ? String(quote.due_date).slice(0, 10) : null,
        copia: pixPayload({ key, name: holder || business.legalName, city: business.city, amount: left }),
      };
    }
  }

  const bytes = await buildQuotePdf(
    {
      number: quote.number,
      issued_at: quote.issued_at,
      valid_until: quote.valid_until,
      customer_name: quote.customer_name,
      customer_phone: quote.customer_phone,
      customer_email: quote.customer_email,
      customer_document: quote.customer_document,
      address: quote.address,
      zip: quote.zip,
      neighborhood: quote.neighborhood,
      city: quote.city,
      state: quote.state,
      discount: quote.discount,
      surcharge: quote.surcharge,
      notes: quote.notes,
    },
    items,
    charge,
  );
  return {
    bytes,
    number: quote.number as number,
    status: quote.status as string,
    customer: quote.customer_name as string,
    validUntil: quote.valid_until as string,
    total,
    charged: !!charge,
    // chave e copia e cola puros, para irem cada um numa mensagem (fácil de copiar no WhatsApp)
    pix: charge ? { key: normalizePixKey(charge.key), copia: charge.copia } : null,
  };
}
