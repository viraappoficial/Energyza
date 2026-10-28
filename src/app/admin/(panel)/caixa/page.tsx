import Link from "next/link";
import { ArrowDownRight, ChevronRight, Clock, PiggyBank, Receipt, TrendingUp } from "lucide-react";
import { sql } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { dayKey } from "@/lib/dates";
import { brl } from "@/lib/format";
import { PERIODS, periodRange, type PeriodKey } from "@/lib/traffic";
import { deleteExpense } from "../../actions";
import { PageTitle } from "../page-title";
import { ExpenseForm } from "./expense-form";

export const dynamic = "force-dynamic";

const TOTAL = sql`greatest(0, coalesce(sum(i.quantity * i.unit_price), 0) - q.discount + q.surcharge)::float8`;
const METHOD: Record<string, string> = { pix: "Pix", dinheiro: "Dinheiro", cartao: "Cartão", transferencia: "Transferência", outro: "Outro" };
const CATEGORY: Record<string, string> = { material: "Material", combustivel: "Combustível", ferramenta: "Ferramenta", imposto: "Imposto", ajudante: "Ajudante", outros: "Outros" };
const OPEN: Record<string, { label: string; chip: string; bar: string }> = {
  rascunho: { label: "Rascunho", chip: "border-neutral-500/50 text-neutral-300", bar: "bg-neutral-500" },
  enviado: { label: "Enviado", chip: "border-yellow-500/50 text-yellow-300", bar: "bg-yellow-400" },
  aprovado: { label: "Aprovado", chip: "border-emerald-500/50 text-emerald-300", bar: "bg-emerald-500" },
};
const dm = (d: string) => d.slice(0, 10).split("-").reverse().slice(0, 2).join("/");
const num = (n: number) => String(n).padStart(4, "0");

type QuoteRow = { id: string; number: number; customer_name: string; status: string; total: number; day: string; payment_method: string };

export default async function CaixaPage({ searchParams }: { searchParams: Promise<{ p?: string }> }) {
  await requireAdmin();
  const sp = await searchParams;
  const period: PeriodKey = (PERIODS.some((x) => x.key === sp.p) ? sp.p : "mes") as PeriodKey;
  const { from, to } = periodRange(period);

  const [entradas, previstos, weeks, despesas, ads] = await Promise.all([
    // dinheiro que entrou: orçamentos concluídos no período
    sql<QuoteRow[]>`
      select q.id, q.number, q.customer_name, q.status, ${TOTAL} as total, q.completed_at as day, q.payment_method
      from quotes q left join quote_items i on i.quote_id = q.id
      where q.status = 'concluido' and q.completed_at between ${from}::date and ${to}::date
      group by q.id order by q.completed_at desc, q.number desc limit 300`,
    // previsto: orçamentos ainda em aberto (qualquer data)
    sql<QuoteRow[]>`
      select q.id, q.number, q.customer_name, q.status, ${TOTAL} as total, q.issued_at as day, q.payment_method
      from quotes q left join quote_items i on i.quote_id = q.id
      where q.status in ('rascunho', 'enviado', 'aprovado')
      group by q.id order by q.number desc limit 300`,
    sql<{ wk: string; total: number }[]>`
      with t as (
        select q.completed_at, ${TOTAL} as total
        from quotes q left join quote_items i on i.quote_id = q.id
        where q.status = 'concluido' and q.completed_at between ${from}::date and ${to}::date
        group by q.id)
      select date_trunc('week', completed_at)::date::text as wk, sum(total)::float8 as total
      from t group by 1 order by 1 desc limit 8`,
    sql<{ id: string; day: string; category: string; description: string; amount: number }[]>`
      select id, day, category, description, amount::float8 as amount from expenses
      where day between ${from}::date and ${to}::date order by day desc, created_at desc limit 200`,
    sql<{ total: number }[]>`select coalesce(sum(cost), 0)::float8 as total from ad_costs where day between ${from}::date and ${to}::date`,
  ]);

  const emCaixa = entradas.reduce((s, x) => s + x.total, 0);
  const previsto = previstos.reduce((s, x) => s + x.total, 0);
  const manual = despesas.reduce((s, x) => s + x.amount, 0);
  const anuncios = ads[0]?.total ?? 0;
  const saidas = manual + anuncios;
  const resultado = emCaixa - saidas;

  const byStatus = Object.keys(OPEN).map((k) => {
    const rows = previstos.filter((p) => p.status === k);
    return { key: k, n: rows.length, total: rows.reduce((s, x) => s + x.total, 0) };
  });
  const weekRows = [...weeks].reverse();
  const maxWeek = Math.max(1, ...weekRows.map((w) => w.total));

  const h2 = "font-display text-2xl font-bold uppercase";
  const stat = (icon: React.ReactNode, value: string, label: string, hint?: string, tone = "") => (
    <div className="edge-card flex min-h-28 flex-col justify-between p-4">
      <span className="text-gold">{icon}</span>
      <div>
        <p className={`font-display text-3xl font-extrabold leading-none sm:text-4xl ${tone}`}>{value}</p>
        <p className="mt-1 text-sm text-muted">{label}</p>
        {hint && <p className="text-xs text-gold">{hint}</p>}
      </div>
    </div>
  );

  return (
    <>
      <PageTitle eyebrow="Painel" title="Caixa" />

      <div className="-mx-4 mt-5 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
        {PERIODS.map((x) => (
          <Link
            key={x.key}
            href={`/admin/caixa?p=${x.key}`}
            className={`flex min-h-10 shrink-0 items-center rounded-full border px-4 text-sm font-semibold ${
              period === x.key ? "border-gold bg-gold text-black" : "border-border text-neutral-300 hover:border-gold/60"
            }`}
          >
            {x.label}
          </Link>
        ))}
      </div>

      <div className="edge-card mt-5 border-emerald-500/30 bg-gradient-to-b from-[#0d1a14] to-[#0e0e0e] p-5">
        <p className="font-display text-sm font-semibold uppercase tracking-[0.2em] text-emerald-300">Em caixa</p>
        <p className="font-display mt-2 text-5xl font-extrabold leading-none text-emerald-300 sm:text-6xl">{brl(emCaixa)}</p>
        <p className="mt-2 text-sm text-muted">Orçamentos concluídos no período ({entradas.length})</p>
        <div className="mt-4 space-y-2 border-t border-border pt-4 text-sm">
          <p className="flex justify-between"><span className="text-muted">Despesas e anúncios</span><span className="font-semibold text-red-300">− {brl(saidas)}</span></p>
          <p className="flex items-baseline justify-between text-base"><span className="font-semibold">Resultado</span><span className={`font-display text-2xl font-extrabold ${resultado >= 0 ? "text-emerald-300" : "text-red-300"}`}>{brl(resultado)}</span></p>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-3">
        {stat(<Clock className="h-6 w-6" />, brl(previsto), "Previsto", `${previstos.length} orçamento(s) em aberto`, "text-yellow-300")}
        {stat(<ArrowDownRight className="h-6 w-6" />, brl(saidas), "Saídas", `${brl(manual)} à mão + ${brl(anuncios)} anúncios`)}
        <div className="col-span-2 lg:col-span-1">{stat(<PiggyBank className="h-6 w-6" />, brl(resultado), "Resultado do período", "em caixa − saídas", resultado >= 0 ? "text-emerald-300" : "text-red-300")}</div>
      </div>

      {/* previsto */}
      <h2 className={`${h2} mt-9`}>Previsto</h2>
      <p className="mt-1 text-sm text-muted">Orçamentos ainda não concluídos. Quando você concluir, o valor passa para “Em caixa”.</p>
      {previstos.length === 0 ? (
        <p className="edge-card mt-3 p-4 text-sm text-muted">Nenhum orçamento em aberto.</p>
      ) : (
        <>
          <div className="edge-card mt-3 p-4">
            <div className="flex h-5 gap-0.5 overflow-hidden rounded">
              {byStatus.filter((b) => b.total > 0).map((b) => <div key={b.key} className={OPEN[b.key].bar} style={{ flex: b.total }} title={`${OPEN[b.key].label}: ${brl(b.total)}`} />)}
            </div>
            <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm">
              {byStatus.map((b) => (
                <span key={b.key} className="text-muted"><span className={`mr-1.5 inline-block h-2.5 w-2.5 rounded-sm align-middle ${OPEN[b.key].bar}`} />{OPEN[b.key].label}: <strong className="text-foreground">{brl(b.total)}</strong> ({b.n})</span>
              ))}
            </div>
          </div>
          <ul className="mt-3 space-y-2">
            {previstos.map((x) => (
              <li key={x.id}>
                <Link href={`/admin/orcamentos/${x.id}`} className="edge-card flex min-h-16 items-center gap-3 p-3">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold">#{num(x.number)} · {x.customer_name}</span>
                    <span className={`mt-1 inline-block rounded-full border px-2.5 py-0.5 text-xs ${OPEN[x.status]?.chip ?? ""}`}>{OPEN[x.status]?.label ?? x.status}</span>
                  </span>
                  <strong className="shrink-0 text-yellow-300">{brl(x.total)}</strong>
                  <ChevronRight className="h-5 w-5 shrink-0 text-muted" />
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}

      {/* entradas por semana */}
      <h2 className={`${h2} mt-9`}>Entradas por semana</h2>
      <div className="edge-card mt-3 p-4">
        {weekRows.length === 0 ? (
          <p className="text-sm text-muted">Ainda não há orçamentos concluídos neste período.</p>
        ) : (
          <div className="flex h-36 items-end justify-center gap-2">
            {weekRows.map((w) => (
              <div key={w.wk} className="flex h-full min-w-0 max-w-[4.5rem] flex-1 flex-col justify-end text-center">
                <span className="mb-1 truncate text-[11px] font-semibold text-emerald-300">{w.total >= 1000 ? `${(w.total / 1000).toFixed(1).replace(".", ",")}k` : Math.round(w.total)}</span>
                <div className="rounded-t bg-emerald-400" style={{ height: `${Math.max(4, (w.total / maxWeek) * 100)}%` }} />
                <span className="mt-1.5 text-[10.5px] text-muted">{dm(w.wk)}</span>
              </div>
            ))}
          </div>
        )}
        <p className="mt-3 text-xs text-muted">Semana começando em cada data.</p>
      </div>

      {/* entradas */}
      <h2 className={`${h2} mt-9`}>Entradas</h2>
      {entradas.length === 0 ? (
        <p className="edge-card mt-3 p-4 text-sm text-muted">Nada concluído neste período. Abra um orçamento e toque em “Concluir e lançar no caixa”.</p>
      ) : (
        <ul className="mt-3 divide-y divide-border rounded-xl border border-border">
          {entradas.map((x) => (
            <li key={x.id}>
              <Link href={`/admin/orcamentos/${x.id}`} className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-white/5">
                <span className="min-w-0">
                  <span className="block truncate font-semibold">#{num(x.number)} · {x.customer_name}</span>
                  <span className="text-sm text-muted">{dm(x.day)}{x.payment_method ? ` · ${METHOD[x.payment_method] ?? x.payment_method}` : ""}</span>
                </span>
                <strong className="shrink-0 text-emerald-300">+ {brl(x.total)}</strong>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {/* saídas */}
      <h2 className={`${h2} mt-9`}>Despesas</h2>
      <p className="mt-1 text-sm text-muted">Material, combustível e o que mais você gastar. O gasto com anúncios vem da tela Tráfego.</p>
      <ul className="mt-3 divide-y divide-border rounded-xl border border-border">
        <li>
          <Link href="/admin/trafego" className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-white/5">
            <span className="min-w-0"><span className="block font-semibold">Anúncios (Google e Meta)</span><span className="text-sm text-muted">Vem da tela Tráfego</span></span>
            <strong className="shrink-0 text-red-300">− {brl(anuncios)}</strong>
          </Link>
        </li>
        {despesas.map((x) => (
          <li key={x.id} className="flex items-center justify-between gap-2 px-4 py-2.5">
            <span className="min-w-0"><span className="block truncate font-semibold">{x.description}</span><span className="text-sm text-muted">{dm(x.day)} · {CATEGORY[x.category] ?? x.category}</span></span>
            <span className="flex shrink-0 items-center gap-1">
              <strong className="text-red-300">− {brl(x.amount)}</strong>
              <form action={deleteExpense}><input type="hidden" name="id" value={x.id} /><button className="px-2 py-2 text-red-300" aria-label="Remover despesa">✕</button></form>
            </span>
          </li>
        ))}
      </ul>

      <h2 className={`${h2} mt-8`}>Lançar despesa</h2>
      <div className="edge-card mt-3 p-4"><ExpenseForm today={dayKey(new Date())} /></div>
      <p className="mt-4 flex items-center gap-2 text-xs text-muted"><Receipt className="h-4 w-4" /><TrendingUp className="h-4 w-4" /> Dica: orçamentos feitos a partir do agendamento continuam ligados ao cliente e à origem do anúncio.</p>
    </>
  );
}
