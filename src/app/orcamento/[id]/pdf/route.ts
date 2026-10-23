import { createAdminClient } from "@/lib/supabase/admin";
import { buildQuotePdf } from "@/lib/quote-pdf";

export const dynamic = "force-dynamic";

// Link "secreto" (UUID não adivinhável) que o cliente recebe pelo WhatsApp.
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return new Response("Não encontrado", { status: 404 });

  const db = createAdminClient();
  const { data: quote } = await db.from("quotes").select("*").eq("id", id).single();
  if (!quote) return new Response("Não encontrado", { status: 404 });
  const { data: items } = await db
    .from("quote_items")
    .select("description,quantity,unit_price")
    .eq("quote_id", id)
    .order("position");

  const bytes = await buildQuotePdf(
    {
      ...quote,
      discount: Number(quote.discount),
      surcharge: Number(quote.surcharge),
    },
    (items ?? []).map((i) => ({
      description: i.description,
      quantity: Number(i.quantity),
      unit_price: Number(i.unit_price),
    })),
  );

  return new Response(Buffer.from(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="orcamento-${String(quote.number).padStart(4, "0")}-energyza.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
