import { notFound } from "next/navigation";
import { sql } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { dayKey } from "@/lib/dates";
import { QuoteForm, type CatalogItem, type QuoteInitial } from "../../quote-form";

export const dynamic = "force-dynamic";

export default async function EditarOrcamento({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();

  const [q] = await sql`select * from quotes where id = ${id}`;
  if (!q) notFound();
  const items = await sql<{ description: string; quantity: number; unit_price: number }[]>`
    select description, quantity, unit_price from quote_items where quote_id = ${id} order by position`;
  const catalog = await sql<CatalogItem[]>`
    select id, description, unit_price from quote_catalog order by description`;

  const initial: QuoteInitial = {
    id: q.id,
    number: q.number,
    issuedAt: q.issued_at,
    name: q.customer_name,
    phone: q.customer_phone,
    email: q.customer_email,
    document: q.customer_document,
    address: q.address,
    zip: q.zip,
    neighborhood: q.neighborhood,
    city: q.city,
    state: q.state,
    discount: q.discount,
    surcharge: q.surcharge,
    validUntil: q.valid_until,
    notes: q.notes,
    items,
  };

  return (
    <>
      <h1 className="mb-6 text-2xl font-bold">
        Editar orçamento <span className="text-gold">#{String(q.number).padStart(4, "0")}</span>
      </h1>
      <QuoteForm initial={initial} catalog={catalog} today={dayKey(new Date())} />
    </>
  );
}
