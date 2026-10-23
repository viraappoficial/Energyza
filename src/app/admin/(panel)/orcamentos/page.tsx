import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { brl } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function OrcamentosPage() {
  const supabase = await createClient();
  const { data: quotes } = await supabase
    .from("quotes")
    .select("id,number,customer_name,issued_at,status,discount,surcharge,quote_items(quantity,unit_price)")
    .order("number", { ascending: false });

  return (
    <>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Orçamentos</h1>
        <Link href="/admin/orcamentos/novo" className="btn btn-gold">+ Novo orçamento</Link>
      </div>
      <ul className="mt-6 space-y-2">
        {(quotes ?? []).length === 0 && <li className="text-muted">Nenhum orçamento ainda.</li>}
        {(quotes ?? []).map((q) => {
          const sub = q.quote_items.reduce((s, i) => s + Number(i.quantity) * Number(i.unit_price), 0);
          const total = Math.max(0, sub - Number(q.discount) + Number(q.surcharge));
          return (
            <li key={q.id}>
              <Link href={`/admin/orcamentos/${q.id}`} className="card flex flex-wrap items-center justify-between gap-2 p-4 hover:border-gold">
                <span>
                  <strong className="text-gold">#{String(q.number).padStart(4, "0")}</strong> · {q.customer_name}
                  <span className="ml-2 text-sm text-muted">{q.issued_at.split("-").reverse().join("/")}</span>
                </span>
                <span className="flex items-center gap-3">
                  <span className="rounded-full border border-border px-3 py-0.5 text-xs">{q.status}</span>
                  <strong>{brl(total)}</strong>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </>
  );
}
