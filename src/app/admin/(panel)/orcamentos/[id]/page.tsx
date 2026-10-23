import Link from "next/link";
import { notFound } from "next/navigation";
import { sql } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { brl } from "@/lib/format";
import { deleteQuote, setQuoteStatus } from "../../../actions";
import { SendButtons } from "./send-buttons";
import { PageTitle } from "../../page-title";

const STATUS_CHIP: Record<string, string> = {
  rascunho: "border-neutral-500/50 text-neutral-300",
  enviado: "border-yellow-500/50 text-yellow-300",
  aprovado: "border-emerald-500/50 text-emerald-300",
  recusado: "border-red-500/50 text-red-300",
};

export const dynamic = "force-dynamic";

export default async function OrcamentoPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();

  const [q] = await sql`select * from quotes where id = ${id}`;
  if (!q) notFound();
  const items = await sql<
    { id: string; description: string; quantity: number; unit_price: number }[]
  >`select id, description, quantity, unit_price from quote_items where quote_id = ${id} order by position`;

  const subtotal = items.reduce((s, i) => s + i.quantity * i.unit_price, 0);
  const total = Math.max(0, subtotal - q.discount + q.surcharge);
  const number = String(q.number).padStart(4, "0");

  return (
    <>
      <Link href="/admin/orcamentos" className="inline-block py-2 text-sm text-muted hover:text-gold">← Orçamentos</Link>
      <PageTitle
        eyebrow="Orçamento"
        title={<>#{number}<span className={`ml-3 rounded-full border px-3 py-0.5 align-middle font-sans text-xs font-normal normal-case tracking-normal ${STATUS_CHIP[q.status] ?? ""}`}>{q.status}</span></>}
      >
        <Link href={`/admin/orcamentos/${id}/editar`} className="btn btn-outline !py-2 text-sm">Editar</Link>
      </PageTitle>

      <div className="mt-5">
        <SendButtons
          id={q.id}
          number={number}
          customerName={q.customer_name}
          phone={q.customer_phone}
          status={q.status}
          items={items.map((i) => ({ description: i.description, quantity: i.quantity, unit_price: i.unit_price }))}
          discount={q.discount}
          surcharge={q.surcharge}
          validUntil={q.valid_until}
          notes={q.notes}
          issuedAt={q.issued_at}
          address={q.address}
          city={q.city}
          state={q.state}
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        <div className="edge-card p-5">
          <p className="text-lg font-semibold">{q.customer_name}</p>
          <p className="text-sm text-muted">
            {[q.customer_phone, q.customer_email, q.address, q.neighborhood, q.city && `${q.city}/${q.state}`].filter(Boolean).join(" · ")}
          </p>
          <ul className="mt-5 divide-y divide-border text-sm">
            {items.map((i) => (
              <li key={i.id} className="py-3">
                <p>{i.description}</p>
                <p className="mt-1 flex justify-between gap-3 text-muted">
                  <span>{String(i.quantity).replace(".", ",")} × {brl(i.unit_price)}</span>
                  <span className="font-semibold text-foreground">{brl(i.quantity * i.unit_price)}</span>
                </p>
              </li>
            ))}
          </ul>
          <div className="mt-4 space-y-1 text-right text-sm">
            <p>Subtotal: {brl(subtotal)}</p>
            {q.discount > 0 && <p>Desconto: − {brl(q.discount)}</p>}
            {q.surcharge > 0 && <p>Acréscimo: + {brl(q.surcharge)}</p>}
            <p className="text-xl font-bold text-gold">Total: {brl(total)}</p>
          </div>
          {q.notes && <p className="mt-4 whitespace-pre-line border-t border-border pt-3 text-sm text-muted">{q.notes}</p>}
        </div>

        <div>
          {/* o PDF de verdade; no celular o navegador não exibe dentro da página */}
          <iframe
            title={`PDF do orçamento ${number}`}
            src={`/orcamento/${id}/pdf#toolbar=0&view=FitH`}
            className="hidden h-[70vh] min-h-[480px] w-full rounded-lg border border-border bg-white md:block"
          />
          <a href={`/orcamento/${id}/pdf`} target="_blank" rel="noopener noreferrer" className="btn btn-outline w-full md:hidden">
            Abrir o PDF
          </a>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <span className="text-sm text-muted">Marcar como:</span>
        {(["rascunho", "enviado", "aprovado", "recusado"] as const).map((s) => (
          <form key={s} action={setQuoteStatus}>
            <input type="hidden" name="id" value={q.id} />
            <input type="hidden" name="status" value={s} />
            <button className={`btn !px-3 !py-1.5 text-sm ${q.status === s ? "btn-gold" : "btn-outline"}`}>{s}</button>
          </form>
        ))}
        <form action={deleteQuote} className="ml-auto">
          <input type="hidden" name="id" value={q.id} />
          <button className="px-3 py-2 text-sm text-red-300 hover:underline">Excluir</button>
        </form>
      </div>
    </>
  );
}
