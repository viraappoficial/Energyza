import Link from "next/link";
import { ArrowDownRight, ChevronRight, Clock, HandCoins, PiggyBank } from "lucide-react";
import { sql } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { addDays, dayKey } from "@/lib/dates";
import { brl } from "@/lib/format";
import { PERIODS, periodRange, type PeriodKey } from "@/lib/traffic";
import { deleteExpense } from "../../actions";
import { PageTitle } from "../page-title";
import { ExpenseForm } from "./expense-form";

export const dynamic = "force-dynamic";

const METHOD: Record<string, string> = { pix: "Pix", dinheiro: "Dinheiro", cartao: "Cartão", transferencia: "Transferência", outro: "Outro" };
const CATEGORY: Record<string, string> = { material: "Material", combustivel: "Combustível", ferramenta: "Ferramenta", imposto: "Imposto", ajudante: "Ajudante", outros: "Outros" };
const STATUS_CHIP: Record<string, { label: string; chip: string }> = {
  rascunho: { label: "Rascunho", chip: "border-neutral-500/50 text-neutral-300" },
  enviado: { label: "Enviado", chip: "border-yellow-500/50 text-yellow-300" },
  aprovado: { label: "Aprovado", chip: "border-emerald-500/50 text-emerald-300" },
  concluido: { label: "Concluído", chip: "border-sky-500/50 text-sky-300" },
};
const dm = (d: string) => d.slice(0, 10).split("-").reverse().slice(0, 2).join("/");
const num = (n: number) => String(n).padStart(4, "0");
const cents = (n: number) => Math.round(n * 100) / 100;
// segunda-feira da semana (igual ao date_trunc('week') do banco)
function weekStart(day: string) {
  const d = new Date(`${day}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
  return d.toISOString().slice(0, 10);
}

type QuoteRow = { id: string; number: number; customer_name: string; status: string; due: string | null; total: number; paid: number };
type PayRow = { id: string; amount: number; day: string; method: string; quote_id: string; number: number; customer_name: string };

export default async function CaixaPage({ searchParams }: { searchParams: Promise<{ p?: string }> }) {
  await requireAdmin();
  const sp = await searchParams;
  const period: PeriodKey = (PERIODS.some((x) => x.key === sp.p) ? sp.p : "mes") as PeriodKey;
  const { from, to } = periodRange(period);
  const today = dayKey(new Date());

  const [quotes, pays, sumRow, weeks, despesas, ads] = await Promise.all([
    // orçamentos não recusados, com total e quanto já foi pago
    sql<QuoteRow[]>`
      select q.id, q.number, q.customer_name, q.status, q.due_date as due,
        greatest(0, coalesce((select sum(quantity * unit_price) from quote_items where quote_id = q.id), 0) - q.discount + q.surcharge)::float8 as total,
        coalesce((select sum(amount) from quote_payments where quote_id = q.id), 0)::float8 as paid
      from quotes q where q.status <> 'recusado' order by q.number desc limit 1000`,
    // dinheiro que entrou no período (pela data do pagamento)
    sql<PayRow[]>`
      select p.id, p.amount::float8 as amount, p.paid_at as day, p.method, q.id as quote_id, q.number, q.customer_name
      from quote_payments p join quotes q on q.id = p.quote_id
      where p.paid_at between ${from}::date and ${to}::date order by p.paid_at desc, p.created_at desc limit 300`,
    sql<{ total: number; n: number }[]>`
      select coalesce(sum(amount), 0)::float8 as total, count(*)::int as n from quote_payments where paid_at between ${from}::date and ${to}::date`,
    sql<{ wk: string; total: number }[]>`
      select date_trunc('week', paid_at)::date::text as wk, sum(amount)::float8 as total
      from quote_payments where paid_at between ${from}::date and ${to}::date group by 1 order by 1 desc limit 8`,
    sql<{ id: string; day: string; category: string; description: string; amount: number }[]>`
      select id, day, category, description, amount::float8 as amount from expenses
      where day between ${from}::date and ${to}::date order by day desc, created_at desc limit 200`,
    sql<{ total: number }[]>`select coalesce(sum(cost), 0)::float8 as total from ad_costs where day between ${from}::date and ${to}::date`,
  ]);

  const emCaixa = sumRow[0]?.total ?? 0;
  const nPay = sumRow[0]?.n ?? 0;
  const left = (x: QuoteRow) => Math.max(0, cents(x.total - x.paid));
  const abertos = quotes.filter((x) => ["rascunho", "enviado", "aprovado"].includes(x.status) && left(x) > 0);
  const aReceber = quotes
    .filter((x) => x.status === "concluido" && left(x) > 0)
    .sort((a, b) => (a.due ?? "9999").localeCompare(b.due ?? "9999"));
  const previsto = cents(abertos.reduce((s, x) => s + left(x), 0));
  const receber = cents(aReceber.reduce((s, x) => s + left(x), 0));
  const manual = despesas.reduce((s, x) => s + x.amount, 0);
  const anuncios = ads[0]?.total ?? 0;
  const saidas = manual + anuncios;
  const resultado = emCaixa - saidas;

  // previsão: o que falta pagar, por semana da data prevista
  const pending = [...abertos, ...aReceber];
  const forecast = new Map<string, number>();
  let atrasado = 0;
  let semData = 0;
  for (const x of pending) {
    if (!x.due) { semData += left(x); continue; }
    if (x.due < today) { atrasado += left(x); continue; }
    const wk = weekStart(String(x.due));
    forecast.set(wk, (forecast.get(wk) ?? 0) + left(x));
  }
  const realByWeek = new Map(weeks.map((w) => [w.wk, w.total]));
  const chartWeeks = [...new Set([...realByWeek.keys(), ...[...forecast.keys()].filter((k) => k <= weekStart(addDays(today, 35)))])].sort();
  const maxBar = Math.max(1, ...chartWeeks.map((k) => (realByWeek.get(k) ?? 0) + (forecast.get(k) ?? 0)));
  const k1 = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(1).replace(".", ",")}k` : String(Math.round(n)));

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
  const row = (x: QuoteRow, amount: number, tone: string, sub: React.ReactNode) => (
    <li key={x.id}>
      <Link href={`/admin/orcamentos/${x.id}`} className="edge-card flex min-h-16 items-center gap-3 p-3">
        <span className="min-w-0 flex-1">
          <span className="block truncate font-semibold">#{num(x.number)} · {x.customer_name}</span>
          <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted">
            <span className={`rounded-full border px-2.5 py-0.5 text-xs ${STATUS_CHIP[x.status]?.chip ?? ""}`}>{STATUS_CHIP[x.status]?.label ?? x.status}</span>
            {sub}
          </span>
        </span>
        <strong className={`shrink-0 ${tone}`}>{brl(amount)}</strong>
        <ChevronRight className="h-5 w-5 shrink-0 text-muted" />
      </Link>
    </li>
  );
  const dueText = (x: QuoteRow) =>
    x.due ? (String(x.due) < today ? <span className="text-red-300">atrasado desde {dm(String(x.due))}</span> : <span>vence {dm(String(x.due))}</span>) : <span>sem data prevista</span>;
  const paidText = (x: QuoteRow) => (x.paid > 0 ? <span>já pago {brl(x.paid)}</span> : null);

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
        <p className="mt-2 text-sm text-muted">Pagamentos recebidos no período ({nPay})</p>
        <div className="mt-4 space-y-2 border-t border-border pt-4 text-sm">
          <p className="flex justify-between"><span className="text-muted">Despesas e anúncios</span><span className="font-semibold text-red-300">− {brl(saidas)}</span></p>
          <p className="flex items-baseline justify-between text-base"><span className="font-semibold">Resultado</span><span className={`font-display text-2xl font-extrabold ${resultado >= 0 ? "text-emerald-300" : "text-red-300"}`}>{brl(resultado)}</span></p>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stat(<HandCoins className="h-6 w-6" />, brl(receber), "A receber", `${aReceber.length} serviço(s) feito(s), falta pagar`, "text-sky-300")}
        {stat(<Clock className="h-6 w-6" />, brl(previsto), "Previsto", `${abertos.length} orçamento(s) em aberto`, "text-yellow-300")}
        {stat(<ArrowDownRight className="h-6 w-6" />, brl(saidas), "Saídas", `${brl(manual)} à mão + ${brl(anuncios)} anúncios`)}
        {stat(<PiggyBank className="h-6 w-6" />, brl(resultado), "Resultado", "em caixa − saídas", resultado >= 0 ? "text-emerald-300" : "text-red-300")}
      </div>

      {/* semana a semana: o que entrou e o que está previsto entrar */}
      <h2 className={`${h2} mt-9`}>Semana a semana</h2>
      <div className="edge-card mt-3 p-4">
        {chartWeeks.length === 0 ? (
          <p className="text-sm text-muted">Ainda não há pagamentos nem previsões. Registre pagamentos nos orçamentos e informe a data prevista do saldo.</p>
        ) : (
          <div className="flex h-40 items-end justify-center gap-2">
            {chartWeeks.map((k) => {
              const real = realByWeek.get(k) ?? 0;
              const prev = forecast.get(k) ?? 0;
              return (
                <div key={k} className="flex h-full min-w-0 max-w-[4.5rem] flex-1 flex-col justify-end text-center">
                  <span className="mb-1 truncate text-[11px] font-semibold">
                    {real > 0 && <span className="text-emerald-300">{k1(real)}</span>}{real > 0 && prev > 0 && " "}{prev > 0 && <span className="text-yellow-300">+{k1(prev)}</span>}
                  </span>
                  {prev > 0 && <div className="rounded-t border border-dashed border-yellow-300/70 bg-yellow-300/10" style={{ height: `${Math.max(4, (prev / maxBar) * 100)}%` }} />}
                  {real > 0 && <div className={`bg-emerald-400 ${prev > 0 ? "" : "rounded-t"}`} style={{ height: `${Math.max(4, (real / maxBar) * 100)}%` }} />}
                  <span className="mt-1.5 text-[10.5px] text-muted">{dm(k)}</span>
                </div>
              );
            })}
          </div>
        )}
        <p className="mt-3 text-xs text-muted"><span className="text-emerald-300">■</span> recebido · <span className="text-yellow-300">▭</span> previsto (pela data prevista do pagamento). Semana começando em cada data.</p>
        {(atrasado > 0 || semData > 0) && (
          <p className="mt-2 text-sm">
            {atrasado > 0 && <span className="mr-4 text-red-300">Atrasado: <strong>{brl(atrasado)}</strong></span>}
            {semData > 0 && <span className="text-muted">Sem data prevista: <strong className="text-foreground">{brl(semData)}</strong></span>}
          </p>
        )}
      </div>

      {/* a receber */}
      <h2 className={`${h2} mt-9`}>A receber</h2>
      <p className="mt-1 text-sm text-muted">Serviços já feitos que ainda não foram pagos por completo.</p>
      {aReceber.length === 0 ? (
        <p className="edge-card mt-3 p-4 text-sm text-muted">Nada a receber.</p>
      ) : (
        <ul className="mt-3 space-y-2">{aReceber.map((x) => row(x, left(x), "text-sky-300", <>{dueText(x)}{paidText(x)}</>))}</ul>
      )}

      {/* previsto */}
      <h2 className={`${h2} mt-9`}>Previsto</h2>
      <p className="mt-1 text-sm text-muted">Orçamentos ainda em aberto. O que já foi pago deles (sinal) já está em caixa.</p>
      {abertos.length === 0 ? (
        <p className="edge-card mt-3 p-4 text-sm text-muted">Nenhum orçamento em aberto.</p>
      ) : (
        <ul className="mt-3 space-y-2">{abertos.map((x) => row(x, left(x), "text-yellow-300", <>{dueText(x)}{paidText(x)}</>))}</ul>
      )}

      {/* entradas */}
      <h2 className={`${h2} mt-9`}>Entradas</h2>
      {pays.length === 0 ? (
        <p className="edge-card mt-3 p-4 text-sm text-muted">Nenhum pagamento neste período. Abra um orçamento e registre o pagamento.</p>
      ) : (
        <ul className="mt-3 divide-y divide-border rounded-xl border border-border">
          {pays.map((x) => (
            <li key={x.id}>
              <Link href={`/admin/orcamentos/${x.quote_id}`} className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-white/5">
                <span className="min-w-0">
                  <span className="block truncate font-semibold">#{num(x.number)} · {x.customer_name}</span>
                  <span className="text-sm text-muted">{dm(String(x.day))}{x.method ? ` · ${METHOD[x.method] ?? x.method}` : ""}</span>
                </span>
                <strong className="shrink-0 text-emerald-300">+ {brl(x.amount)}</strong>
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
            <span className="min-w-0"><span className="block truncate font-semibold">{x.description}</span><span className="text-sm text-muted">{dm(String(x.day))} · {CATEGORY[x.category] ?? x.category}</span></span>
            <span className="flex shrink-0 items-center gap-1">
              <strong className="text-red-300">− {brl(x.amount)}</strong>
              <form action={deleteExpense}><input type="hidden" name="id" value={x.id} /><button className="px-2 py-2 text-red-300" aria-label="Remover despesa">✕</button></form>
            </span>
          </li>
        ))}
      </ul>

      <h2 className={`${h2} mt-8`}>Lançar despesa</h2>
      <div className="edge-card mt-3 p-4"><ExpenseForm today={today} /></div>
    </>
  );
}
