import Link from "next/link";
import { FilePlus2, Search } from "lucide-react";
import { sql } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { brl } from "@/lib/format";
import { PageTitle } from "../page-title";

export const dynamic = "force-dynamic";

const STATUSES = ["rascunho", "enviado", "aprovado", "concluido", "recusado"] as const;
const CHIP: Record<string, string> = {
  rascunho: "border-neutral-500/50 text-neutral-300",
  enviado: "border-yellow-500/50 text-yellow-300",
  aprovado: "border-emerald-500/50 text-emerald-300",
  concluido: "border-sky-500/50 text-sky-300",
  recusado: "border-red-500/50 text-red-300",
};

export default async function OrcamentosPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string }>;
}) {
  await requireAdmin();
  const sp = await searchParams;
  const status = (STATUSES as readonly string[]).includes(sp.status ?? "") ? sp.status! : "";
  const q = (sp.q ?? "").trim().slice(0, 60);

  const quotes = await sql<
    { id: string; number: number; customer_name: string; issued_at: string; status: string; total: number; paid: number }[]
  >`
    select q.id, q.number, q.customer_name, q.issued_at, q.status,
      greatest(0, coalesce(sum(i.quantity * i.unit_price), 0) - q.discount + q.surcharge) as total,
      coalesce((select sum(p.amount) from quote_payments p where p.quote_id = q.id), 0)::float8 as paid
    from quotes q left join quote_items i on i.quote_id = q.id
    where ${status ? sql`q.status = ${status}` : sql`true`}
      and ${q ? sql`q.customer_name ilike ${"%" + q.replace(/[%_]/g, "") + "%"}` : sql`true`}
    group by q.id order by q.number desc limit 100`;

  const sum = quotes.reduce((s, x) => s + x.total, 0);
  const chip = (value: string, label: string) => {
    const on = status === value;
    const href = `/admin/orcamentos?${new URLSearchParams({ ...(value ? { status: value } : {}), ...(q ? { q } : {}) })}`;
    return (
      <Link
        key={label}
        href={href}
        className={`flex min-h-10 shrink-0 items-center rounded-full border px-4 text-sm font-semibold capitalize ${
          on ? "border-gold bg-gold text-black" : "border-border text-neutral-300 hover:border-gold/60"
        }`}
      >
        {label}
      </Link>
    );
  };

  return (
    <>
      <PageTitle eyebrow="Painel" title="Orçamentos">
        <Link href="/admin/orcamentos/novo" className="btn btn-gold hidden sm:inline-flex"><FilePlus2 className="h-4 w-4" /> Novo orçamento</Link>
      </PageTitle>

      <form className="relative mt-5" action="/admin/orcamentos">
        {status && <input type="hidden" name="status" value={status} />}
        <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted" />
        <input name="q" defaultValue={q} placeholder="Buscar por nome do cliente" className="input !pl-10" />
      </form>

      <div className="-mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
        {chip("", "Todos")}
        {STATUSES.map((s) => chip(s, s))}
      </div>

      <p className="mt-4 text-sm text-muted">
        {quotes.length} orçamento(s) · <span className="font-semibold text-gold">{brl(sum)}</span>
      </p>

      <ul className="mt-3 space-y-3">
        {quotes.length === 0 && <li className="rounded-xl border border-dashed border-border p-6 text-muted">Nenhum orçamento encontrado.</li>}
        {quotes.map((x) => (
          <li key={x.id}>
            <Link href={`/admin/orcamentos/${x.id}`} className="edge-card flex min-h-[4.5rem] items-center gap-3 p-4">
              <span className="font-display text-2xl font-bold text-gold">#{String(x.number).padStart(4, "0")}</span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold">{x.customer_name}</span>
                <span className="text-xs text-muted">{x.issued_at.split("-").reverse().join("/")}</span>
              </span>
              <span className="text-right">
                <span className="block font-semibold">{brl(x.total)}</span>
                <span className={`mt-0.5 inline-block rounded-full border px-2.5 py-0.5 text-xs ${CHIP[x.status] ?? ""}`}>{x.status}</span>
                {x.paid > 0 && <span className="mt-0.5 block text-xs text-emerald-300">{x.paid >= x.total ? "pago" : `pago ${brl(x.paid)}`}</span>}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
