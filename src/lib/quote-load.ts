import { sql } from "@/lib/db";
import { buildQuotePdf } from "@/lib/quote-pdf";

export const quoteFileName = (number: number) => `orcamento-${String(number).padStart(4, "0")}-energyza.pdf`;

// Carrega o orçamento e gera o PDF (null se não existir)
export async function loadQuotePdf(id: string) {
  const [quote] = await sql`select * from quotes where id = ${id}`;
  if (!quote) return null;
  const items = await sql<{ description: string; quantity: number; unit_price: number }[]>`
    select description, quantity, unit_price from quote_items
    where quote_id = ${id} order by position`;
  const subtotal = items.reduce((n, i) => n + i.quantity * i.unit_price, 0);
  const total = Math.max(0, subtotal - Number(quote.discount) + Number(quote.surcharge));

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
  );
  return {
    bytes,
    number: quote.number as number,
    status: quote.status as string,
    customer: quote.customer_name as string,
    validUntil: quote.valid_until as string,
    total,
  };
}
