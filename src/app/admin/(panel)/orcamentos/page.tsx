import Link from "next/link";
import { ChevronRight, FilePlus2 } from "lucide-react";
import { sql } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { brl } from "@/lib/format";
import { addDays, dayKey } from "@/lib/dates";
import { PageTitle } from "../page-title";
import { Filtros } from "./filtros";

export const dynamic = "force-dynamic";

const STATUSES = ["rascunho", "enviado", "aprovado", "concluido", "recusado"] as const;
const LABEL: Record<string, string> = { rascunho: "Rascunho", enviado: "Enviado", aprovado: "Aprovado", concluido: "Concluído", recusado: "Recusado" };
const CHIP: Record<string, string> = {
  rascunho: "border-neutral-500/50 text-neutral-300",
  enviado: "border-yellow-500/50 text-yellow-300",
  aprovado: "border-emerald-500/50 text-emerald-300",
  concluido: "border-sky-500/50 text-sky-300",
  recusado: "border-red-500/50 text-red-300",
};
const PERIODOS = [
  ["tudo", "Tudo"],
  ["hoje", "Hoje"],
  ["7", "7 dias"],
  ["30", "30 dias"],
  ["mes", "Este mês"],
  ["mesant", "Mês passado"],
  ["custom", "Escolher datas"],
] as const;
const ORDENS = ["recentes", "antigos", "valor", "nome"] as const;
const PAGINA = 50;

type Row = {
  id: string; number: number; customer_name: string; customer_phone: string; issued_at: string; status: string;
  due_date: string | null; total: number; paid: number;
};

const dm = (d: string) => d.slice(0, 10).split("-").reverse().join("/");
const num = (n: number) => String(n).padStart(4, "0");
const cents = (n: number) => Math.round(n * 100) / 100;
const isDay = (v: string) => /^\d{4}-\d{2}-\d{2}$/.test(v);
const mesDe = (d: string) => {
  const t = new Date(`${d.slice(0, 7)}-15T12:00:00Z`).toLocaleDateString("pt-BR", { month: "long", year: "numeric", timeZone: "UTC" });
  return t.charAt(0).toUpperCase() + t.slice(1);
};

export default async function OrcamentosPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string; p?: string; de?: string; ate?: string; ord?: string; lim?: string }>;
}) {
  await requireAdmin();
  const sp = await searchParams;
  const status = (STATUSES as readonly string[]).includes(sp.status ?? "") ? sp.status! : "";
  const q = (sp.q ?? "").trim().replace(/\s+/g, " ").slice(0, 60);
  const ord = ((ORDENS as readonly string[]).includes(sp.ord ?? "") ? sp.ord : "recentes") as (typeof ORDENS)[number];
  const lim = Math.min(500, Math.max(PAGINA, Number(sp.lim) || PAGINA));
  const hoje = dayKey(new Date());

  // período: atalho ou datas escolhidas à mão
  let p = PERIODOS.some(([k]) => k === sp.p) ? sp.p! : "tudo";
  if (!sp.p && (isDay(sp.de ?? "") || isDay(sp.ate ?? ""))) p = "custom";
  let from = "";
  let to = "";
  const primeiroDoMes = `${hoje.slice(0, 7)}-01`;
  if (p === "hoje") { from = hoje; to = hoje; }
  else if (p === "7") { from = addDays(hoje, -6); to = hoje; }
  else if (p === "30") { from = addDays(hoje, -29); to = hoje; }
  else if (p === "mes") { from = primeiroDoMes; to = hoje; }
  else if (p === "mesant") { to = addDays(primeiroDoMes, -1); from = `${to.slice(0, 7)}-01`; }
  else if (p === "custom") { from = isDay(sp.de ?? "") ? sp.de! : ""; to = isDay(sp.ate ?? "") ? sp.ate! : ""; }

  // busca: número (17, 0017, #0017), nome ou telefone
  const termo = q.replace(/^#/, "");
  const soDigitos = termo.replace(/\D/g, "");
  const porNumero = /^\d{1,6}$/.test(termo) ? Number(termo) : null;
  const like = `%${termo.replace(/[%_\\]/g, "")}%`;

  const todos = await sql<Row[]>`
    select q.id, q.number, q.customer_name, q.customer_phone, q.issued_at, q.status, q.due_date,
      greatest(0, coalesce((select sum(quantity * unit_price) from quote_items where quote_id = q.id), 0) - q.discount + q.surcharge)::float8 as total,
      coalesce((select sum(amount) from quote_payments where quote_id = q.id), 0)::float8 as paid
    from quotes q
    where ${from ? sql`q.issued_at >= ${from}::date` : sql`true`}
      and ${to ? sql`q.issued_at <= ${to}::date` : sql`true`}
      and ${termo
        ? sql`(q.customer_name ilike ${like}
            ${porNumero !== null ? sql`or q.number = ${porNumero}` : sql``}
            ${soDigitos.length >= 4 ? sql`or regexp_replace(q.customer_phone, '\\D', '', 'g') like ${"%" + soDigitos + "%"}` : sql``})`
        : sql`true`}
    order by q.number desc limit 1000`;

  // contagem por situação (já com período e busca) e totais do que está na tela
  const contagem = new Map<string, number>();
  for (const x of todos) contagem.set(x.status, (contagem.get(x.status) ?? 0) + 1);
  const filtrados = status ? todos.filter((x) => x.status === status) : todos;
  const falta = (x: Row) => (["aprovado", "concluido"].includes(x.status) ? Math.max(0, cents(x.total - x.paid)) : 0);
  const totalValor = cents(filtrados.filter((x) => x.status !== "recusado").reduce((s, x) => s + x.total, 0));
  const fechado = cents(filtrados.filter((x) => ["aprovado", "concluido"].includes(x.status)).reduce((s, x) => s + x.total, 0));
  const recebido = cents(filtrados.reduce((s, x) => s + x.paid, 0));
  const aReceber = cents(filtrados.reduce((s, x) => s + falta(x), 0));

  const ordenados = [...filtrados].sort((a, b) =>
    ord === "valor" ? b.total - a.total
    : ord === "nome" ? a.customer_name.localeCompare(b.customer_name, "pt-BR")
    : ord === "antigos" ? String(a.issued_at).localeCompare(String(b.issued_at)) || a.number - b.number
    : String(b.issued_at).localeCompare(String(a.issued_at)) || b.number - a.number);
  const visiveis = ordenados.slice(0, lim);

  // lista agrupada por mês só quando a ordem é por data
  const porMes = ord === "recentes" || ord === "antigos";
  const grupos: { titulo: string; itens: Row[]; soma: number }[] = [];
  for (const x of visiveis) {
    const titulo = porMes ? mesDe(String(x.issued_at)) : "";
    const g = grupos[grupos.length - 1];
    if (g && g.titulo === titulo) { g.itens.push(x); g.soma += x.status === "recusado" ? 0 : x.total; }
    else grupos.push({ titulo, itens: [x], soma: x.status === "recusado" ? 0 : x.total });
  }

  const href = (over: Record<string, string>) => {
    const base: Record<string, string> = { ...(status ? { status } : {}), ...(q ? { q } : {}), ...(p !== "tudo" ? { p } : {}), ...(p === "custom" && sp.de ? { de: sp.de } : {}), ...(p === "custom" && sp.ate ? { ate: sp.ate } : {}), ...(ord !== "recentes" ? { ord } : {}) };
    const out = { ...base, ...over };
    for (const k of Object.keys(out)) if (!out[k]) delete out[k];
    const s = new URLSearchParams(out).toString();
    return `/admin/orcamentos${s ? `?${s}` : ""}`;
  };
  const filtrando = !!(status || q || p !== "tudo");

  const pill = (on: boolean) => `flex min-h-10 shrink-0 items-center gap-2 rounded-full border px-4 text-sm font-semibold ${on ? "border-gold bg-gold text-black" : "border-border text-neutral-300 hover:border-gold/60"}`;
  const stat = (label: string, value: string, tone = "") => (
    <div className="edge-card p-3.5">
      <p className="text-xs text-muted">{label}</p>
      <p className={`font-display mt-1 text-2xl font-extrabold leading-none sm:text-3xl ${tone}`}>{value}</p>
    </div>
  );

  return (
    <>
      <PageTitle eyebrow="Painel" title="Orçamentos">
        <Link href="/admin/orcamentos/novo" className="btn btn-gold hidden sm:inline-flex"><FilePlus2 className="h-4 w-4" /> Novo orçamento</Link>
      </PageTitle>

      <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stat(`Orçamentos${status ? ` · ${LABEL[status].toLowerCase()}` : ""}`, String(filtrados.length))}
        {stat("Valor (sem recusados)", brl(totalValor), "text-gold")}
        {stat("Fechado (aprovado + concluído)", brl(fechado), "text-emerald-300")}
        {stat("Falta receber", brl(aReceber), aReceber > 0 ? "text-sky-300" : "")}
      </div>

      <div className="mt-5">
        <Filtros q={q} de={sp.de && isDay(sp.de) ? sp.de : ""} ate={sp.ate && isDay(sp.ate) ? sp.ate : ""} ord={ord} personalizado={p === "custom"} />
      </div>

      <div className="-mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none]" role="group" aria-label="Período">
        {PERIODOS.map(([k, label]) => (
          <Link key={k} href={href({ p: k === "tudo" ? "" : k, de: "", ate: "", lim: "" })} aria-current={p === k ? "true" : undefined} className={pill(p === k)}>{label}</Link>
        ))}
      </div>
      <div className="-mx-4 mt-2 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none]" role="group" aria-label="Situação">
        <Link href={href({ status: "", lim: "" })} aria-current={!status ? "true" : undefined} className={pill(!status)}>Todos <span className="text-xs opacity-70">{todos.length}</span></Link>
        {STATUSES.map((s) => (
          <Link key={s} href={href({ status: s, lim: "" })} aria-current={status === s ? "true" : undefined} className={pill(status === s)}>
            {LABEL[s]} <span className="text-xs opacity-70">{contagem.get(s) ?? 0}</span>
          </Link>
        ))}
      </div>

      <p className="mt-4 flex flex-wrap items-center gap-x-3 text-sm text-muted">
        <span>Mostrando {visiveis.length} de {filtrados.length}{recebido > 0 && <> · recebido <span className="font-semibold text-emerald-300">{brl(recebido)}</span></>}</span>
        {filtrando && <Link href="/admin/orcamentos" className="font-semibold text-gold underline">Limpar filtros</Link>}
      </p>

      {visiveis.length === 0 && (
        <p className="mt-3 rounded-xl border border-dashed border-border p-6 text-muted">
          Nenhum orçamento encontrado{q ? <> para “{q}”</> : ""}. {filtrando && <Link href="/admin/orcamentos" className="text-gold underline">Ver todos</Link>}
        </p>
      )}

      {grupos.map((g, gi) => (
        <section key={`${g.titulo}-${gi}`} className="mt-5">
          {g.titulo && (
            <h2 className="mb-2 flex items-baseline justify-between gap-3 text-sm font-semibold text-muted">
              <span>{g.titulo}</span><span className="font-normal normal-case">{g.itens.length} · {brl(g.soma)}</span>
            </h2>
          )}
          <ul className="space-y-2.5">
            {g.itens.map((x) => {
              const f = falta(x);
              const atrasado = f > 0 && x.due_date && String(x.due_date) < hoje;
              return (
                <li key={x.id}>
                  <Link href={`/admin/orcamentos/${x.id}`} className="edge-card flex min-h-[4.5rem] items-center gap-3 p-3.5 sm:p-4">
                    <span className="font-display w-[4.2rem] shrink-0 text-2xl font-bold text-gold">#{num(x.number)}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-semibold">{x.customer_name}</span>
                      <span className="mt-0.5 block truncate text-xs text-muted">
                        {dm(String(x.issued_at))}{x.customer_phone ? ` · ${x.customer_phone}` : ""}
                      </span>
                    </span>
                    <span className="shrink-0 text-right">
                      <span className="block font-semibold">{brl(x.total)}</span>
                      <span className={`mt-0.5 inline-block rounded-full border px-2.5 py-0.5 text-xs ${CHIP[x.status] ?? ""}`}>{LABEL[x.status] ?? x.status}</span>
                      {x.paid > 0 && f === 0 && x.status !== "recusado" && <span className="mt-0.5 block text-xs text-emerald-300">{x.paid >= x.total ? "pago" : `pago ${brl(x.paid)}`}</span>}
                      {f > 0 && (
                        <span className={`mt-0.5 block text-xs ${atrasado ? "text-red-300" : "text-sky-300"}`}>
                          {atrasado ? `atrasado · falta ${brl(f)}` : `falta ${brl(f)}${x.due_date ? ` · vence ${dm(String(x.due_date))}` : ""}`}
                        </span>
                      )}
                    </span>
                    <ChevronRight className="hidden h-5 w-5 shrink-0 text-muted sm:block" />
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      ))}

      {ordenados.length > visiveis.length && (
        <div className="mt-6 text-center">
          <Link href={href({ lim: String(lim + PAGINA) })} scroll={false} className="btn btn-outline">Mostrar mais {Math.min(PAGINA, ordenados.length - visiveis.length)}</Link>
        </div>
      )}
    </>
  );
}
