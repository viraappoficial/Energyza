import Link from "next/link";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { sql } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { brl } from "@/lib/format";
import { deleteQuote, setQuoteStatus } from "../../../actions";

export const dynamic = "force-dynamic";

export default async function OrcamentoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireAdmin();
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const [q] = await sql`select * from quotes where id = ${id}`;
  if (!q) notFound();
  const items = await sql<
    { id: string; description: string; quantity: number; unit_price: number }[]
  >`select id, description, quantity, unit_price from quote_items where quote_id = ${id} order by position`;

  const subtotal = items.reduce((s, i) => s + Number(i.quantity) * Number(i.unit_price), 0);
  const total = Math.max(0, subtotal - Number(q.discount) + Number(q.surcharge));

  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "https";
  const origin = process.env.NEXT_PUBLIC_SITE_URL ?? `${proto}://${host}`;
  const pdfUrl = `${origin}/orcamento/${q.id}/pdf`;

  const digits = q.customer_phone.replace(/\D/g, "").replace(/^55/, "");
  const msg = `Olá ${q.customer_name}! Segue o orçamento nº ${String(q.number).padStart(4, "0")} da Energyza Elétrica, no valor de ${brl(total)}.\n\nVeja o PDF: ${pdfUrl}`;
  const wa = digits
    ? `https://wa.me/55${digits}?text=${encodeURIComponent(msg)}`
    : `https://wa.me/?text=${encodeURIComponent(msg)}`;

  return (
    <>
      <Link href="/admin/orcamentos" className="text-sm text-muted hover:text-gold">← Orçamentos</Link>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Orçamento <span className="text-gold">#{String(q.number).padStart(4, "0")}</span></h1>
        <div className="flex flex-wrap gap-2">
          <a href={`/orcamento/${q.id}/pdf`} target="_blank" rel="noopener noreferrer" className="btn btn-outline">Ver PDF</a>
          <a href={wa} target="_blank" rel="noopener noreferrer" className="btn btn-gold">Enviar no WhatsApp</a>
        </div>
      </div>

      <div className="card mt-6 p-5">
        <p className="text-lg font-semibold">{q.customer_name}</p>
        <p className="text-sm text-muted">
          {[q.customer_phone, q.customer_email, q.address, q.neighborhood, q.city && `${q.city}/${q.state}`].filter(Boolean).join(" · ")}
        </p>
        <table className="mt-5 w-full text-sm">
          <thead className="text-left text-muted">
            <tr><th className="py-1">Descrição</th><th>Qtd.</th><th>Unit.</th><th className="text-right">Total</th></tr>
          </thead>
          <tbody>
            {items.map((i) => (
              <tr key={i.id} className="border-t border-border">
                <td className="py-2">{i.description}</td>
                <td>{String(i.quantity).replace(".", ",")}</td>
                <td>{brl(Number(i.unit_price))}</td>
                <td className="text-right">{brl(Number(i.quantity) * Number(i.unit_price))}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="mt-4 space-y-1 text-right text-sm">
          <p>Subtotal: {brl(subtotal)}</p>
          {Number(q.discount) > 0 && <p>Desconto: − {brl(Number(q.discount))}</p>}
          {Number(q.surcharge) > 0 && <p>Acréscimo: + {brl(Number(q.surcharge))}</p>}
          <p className="text-xl font-bold text-gold">Total: {brl(total)}</p>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <span className="text-sm text-muted">Status:</span>
        {(["rascunho", "enviado", "aprovado", "recusado"] as const).map((s) => (
          <form key={s} action={setQuoteStatus}>
            <input type="hidden" name="id" value={q.id} />
            <input type="hidden" name="status" value={s} />
            <button className={`btn !px-3 !py-1.5 text-sm ${q.status === s ? "btn-gold" : "btn-outline"}`}>{s}</button>
          </form>
        ))}
        <form action={deleteQuote} className="ml-auto">
          <input type="hidden" name="id" value={q.id} />
          <button className="text-sm text-red-300 hover:underline">Excluir</button>
        </form>
      </div>
    </>
  );
}
