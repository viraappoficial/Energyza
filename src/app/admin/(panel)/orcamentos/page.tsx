import Link from "next/link";
import { sql } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { brl } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function OrcamentosPage() {
  await requireAdmin();
  const quotes = await sql<
    { id: string; number: number; customer_name: string; issued_at: string; status: string; total: number }[]
  >`
    select q.id, q.number, q.customer_name, q.issued_at, q.status,
      greatest(0, coalesce(sum(i.quantity * i.unit_price), 0) - q.discount + q.surcharge) as total
    from quotes q left join quote_items i on i.quote_id = q.id
    group by q.id order by q.number desc`;

  return (
    <>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Orçamentos</h1>
        <Link href="/admin/orcamentos/novo" className="btn btn-gold">+ Novo orçamento</Link>
      </div>
      <ul className="mt-6 space-y-2">
        {quotes.length === 0 && <li className="text-muted">Nenhum orçamento ainda.</li>}
        {quotes.map((q) => {
          return (
            <li key={q.id}>
              <Link href={`/admin/orcamentos/${q.id}`} className="card flex flex-wrap items-center justify-between gap-2 p-4 hover:border-gold">
                <span>
                  <strong className="text-gold">#{String(q.number).padStart(4, "0")}</strong> · {q.customer_name}
                  <span className="ml-2 text-sm text-muted">{q.issued_at.split("-").reverse().join("/")}</span>
                </span>
                <span className="flex items-center gap-3">
                  <span className="rounded-full border border-border px-3 py-0.5 text-xs">{q.status}</span>
                  <strong>{brl(q.total)}</strong>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </>
  );
}
