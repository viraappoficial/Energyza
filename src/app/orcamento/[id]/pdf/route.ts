import { sql } from "@/lib/db";
import { buildQuotePdf } from "@/lib/quote-pdf";

export const dynamic = "force-dynamic";

// Link "secreto" (UUID não adivinhável) que o cliente recebe pelo WhatsApp.
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return new Response("Não encontrado", { status: 404 });

  const [quote] = await sql`select * from quotes where id = ${id}`;
  if (!quote) return new Response("Não encontrado", { status: 404 });
  const items = await sql<{ description: string; quantity: number; unit_price: number }[]>`
    select description, quantity, unit_price from quote_items
    where quote_id = ${id} order by position`;

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

  return new Response(Buffer.from(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${new URL(req.url).searchParams.has("download") ? "attachment" : "inline"}; filename="orcamento-${String(quote.number).padStart(4, "0")}-energyza.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
