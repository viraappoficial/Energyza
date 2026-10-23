import Link from "next/link";
import { ArrowRight, CalendarCheck, CalendarClock, FilePlus2, FileText, MessageCircle, Plus, Send } from "lucide-react";
import { sql } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { addDays, dayKey, fmtLongDay, fmtTime, startOfDay } from "@/lib/dates";
import { brl } from "@/lib/format";
import { setAppointmentStatus } from "../actions";
import { PageTitle } from "./page-title";

export const dynamic = "force-dynamic";

type Appt = {
  id: string;
  service_name: string;
  customer_name: string;
  customer_phone: string;
  address: string;
  starts_at: Date;
  ends_at: Date;
  status: string;
};

const STATUS_CHIP: Record<string, string> = {
  pendente: "border-yellow-500/50 text-yellow-300",
  confirmado: "border-emerald-500/50 text-emerald-300",
  concluido: "border-sky-500/50 text-sky-300",
  rascunho: "border-neutral-500/50 text-neutral-300",
  enviado: "border-yellow-500/50 text-yellow-300",
  aprovado: "border-emerald-500/50 text-emerald-300",
  recusado: "border-red-500/50 text-red-300",
};

const wa = (phone: string, text: string) =>
  `https://wa.me/55${phone.replace(/\D/g, "").replace(/^55/, "")}?text=${encodeURIComponent(text)}`;

// hora atual em Brasília (fora do componente: Date.now é impuro)
const brtHour = () => Number(new Date(Date.now() - 3 * 3_600_000).toISOString().slice(11, 13));

export default async function InicioPage() {
  await requireAdmin();

  const today = dayKey(new Date());
  const dayStart = startOfDay(today);
  const dayEnd = startOfDay(addDays(today, 1));
  const weekEnd = startOfDay(addDays(today, 8));
  const hour = brtHour();
  const greeting = hour < 12 ? "Bom dia" : hour < 18 ? "Boa tarde" : "Boa noite";

  const [todayList, pending, week, quoteStats, recent] = await Promise.all([
    sql<Appt[]>`select id, service_name, customer_name, customer_phone, address, starts_at, ends_at, status
      from appointments where starts_at >= ${dayStart} and starts_at < ${dayEnd} and status <> 'cancelado'
      order by starts_at`,
    sql<Appt[]>`select id, service_name, customer_name, customer_phone, address, starts_at, ends_at, status
      from appointments where status = 'pendente' and ends_at >= now() order by starts_at limit 5`,
    sql<{ n: number }[]>`select count(*)::int as n from appointments
      where starts_at >= ${dayEnd} and starts_at < ${weekEnd} and status in ('pendente','confirmado')`,
    sql<{ status: string; n: number; total: number }[]>`
      select q.status, count(*)::int as n,
        coalesce(sum(greatest(0, (select coalesce(sum(i.quantity * i.unit_price), 0) from quote_items i where i.quote_id = q.id) - q.discount + q.surcharge)), 0) as total
      from quotes q group by q.status`,
    sql<{ id: string; number: number; customer_name: string; status: string; total: number }[]>`
      select q.id, q.number, q.customer_name, q.status,
        greatest(0, (select coalesce(sum(i.quantity * i.unit_price), 0) from quote_items i where i.quote_id = q.id) - q.discount + q.surcharge) as total
      from quotes q order by q.number desc limit 4`,
  ]);

  const open = quoteStats.find((s) => s.status === "enviado");
  const approved = quoteStats.find((s) => s.status === "aprovado");
  const drafts = quoteStats.find((s) => s.status === "rascunho");

  const stat = (href: string, icon: React.ReactNode, value: React.ReactNode, label: string, hint?: string) => (
    <Link href={href} className="edge-card flex min-h-28 flex-col justify-between p-4">
      <span className="text-gold">{icon}</span>
      <div>
        <p className="font-display text-4xl font-extrabold leading-none">{value}</p>
        <p className="mt-1 text-sm text-muted">{label}</p>
        {hint && <p className="text-xs text-gold">{hint}</p>}
      </div>
    </Link>
  );

  return (
    <>
      <PageTitle eyebrow={fmtLongDay(today)} title={<>{greeting}<span className="text-gold">.</span></>}>
        <div className="hidden gap-2 sm:flex">
          <Link href="/admin/novo" className="btn btn-outline"><Plus className="h-4 w-4" /> Agendamento</Link>
          <Link href="/admin/orcamentos/novo" className="btn btn-gold"><FilePlus2 className="h-4 w-4" /> Novo orçamento</Link>
        </div>
      </PageTitle>

      <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stat(`/admin/agenda?dia=${today}`, <CalendarCheck className="h-6 w-6" />, todayList.length, "Hoje")}
        {stat("/admin/agenda", <CalendarClock className="h-6 w-6" />, pending.length > 4 ? "5+" : pending.length, "Aguardando confirmação")}
        {stat("/admin/agenda", <CalendarClock className="h-6 w-6" />, week[0]?.n ?? 0, "Próximos 7 dias")}
        {stat("/admin/orcamentos?status=enviado", <Send className="h-6 w-6" />, open?.n ?? 0, "Orçamentos enviados", open?.n ? `${brl(open.total)} em aberto` : undefined)}
      </div>

      {/* hoje */}
      <section className="mt-8">
        <h2 className="font-display text-2xl font-bold uppercase">Hoje</h2>
        {todayList.length === 0 ? (
          <p className="mt-3 rounded-xl border border-dashed border-border p-5 text-muted">Nada agendado para hoje.</p>
        ) : (
          <ul className="mt-3 space-y-3">
            {todayList.map((a) => (
              <li key={a.id} className="edge-card flex items-center gap-4 p-4">
                <div className="text-center">
                  <p className="font-display text-3xl font-bold leading-none text-gold">{fmtTime(a.starts_at)}</p>
                  <p className="text-xs text-muted">até {fmtTime(a.ends_at)}</p>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{a.service_name}</p>
                  <p className="truncate text-sm text-muted">{a.customer_name}{a.address ? ` · ${a.address}` : ""}</p>
                </div>
                <span className={`hidden rounded-full border px-2.5 py-0.5 text-xs sm:inline ${STATUS_CHIP[a.status] ?? ""}`}>{a.status}</span>
                {a.customer_phone && (
                  <a href={wa(a.customer_phone, `Olá ${a.customer_name.split(" ")[0]}! Aqui é da Energyza sobre o atendimento de hoje às ${fmtTime(a.starts_at)}.`)} target="_blank" rel="noopener noreferrer" aria-label="WhatsApp" className="grid h-11 w-11 shrink-0 place-items-center rounded-lg border border-border text-gold hover:border-gold">
                    <MessageCircle className="h-5 w-5" />
                  </a>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* precisa de atenção */}
      {pending.length > 0 && (
        <section className="mt-8">
          <h2 className="font-display text-2xl font-bold uppercase">Precisa da sua confirmação</h2>
          <ul className="mt-3 space-y-3">
            {pending.map((a) => (
              <li key={a.id} className="edge-card p-4">
                <p className="font-semibold">{a.service_name} <span className="font-normal text-muted">· {a.customer_name}</span></p>
                <p className="text-sm text-muted">{fmtLongDay(dayKey(a.starts_at))} às {fmtTime(a.starts_at)}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <form action={setAppointmentStatus}>
                    <input type="hidden" name="id" value={a.id} />
                    <input type="hidden" name="status" value="confirmado" />
                    <button className="btn btn-gold !px-4 !py-2 text-sm">Confirmar</button>
                  </form>
                  <Link href={`/admin/agenda?dia=${dayKey(a.starts_at)}`} className="btn btn-outline !px-4 !py-2 text-sm">Ver na agenda</Link>
                  {a.customer_phone && (
                    <a href={wa(a.customer_phone, `Olá ${a.customer_name.split(" ")[0]}! Aqui é da Energyza. Recebi seu pedido de ${a.service_name} para ${fmtLongDay(dayKey(a.starts_at))} às ${fmtTime(a.starts_at)}.`)} target="_blank" rel="noopener noreferrer" className="btn btn-outline !px-4 !py-2 text-sm">
                      <MessageCircle className="h-4 w-4" /> WhatsApp
                    </a>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* orçamentos */}
      <section className="mt-8">
        <div className="flex items-end justify-between">
          <h2 className="font-display text-2xl font-bold uppercase">Orçamentos recentes</h2>
          <Link href="/admin/orcamentos" className="flex items-center gap-1 text-sm font-semibold text-gold">Ver todos <ArrowRight className="h-4 w-4" /></Link>
        </div>
        {recent.length === 0 ? (
          <p className="mt-3 rounded-xl border border-dashed border-border p-5 text-muted">Nenhum orçamento ainda.</p>
        ) : (
          <ul className="mt-3 space-y-3">
            {recent.map((q) => (
              <li key={q.id}>
                <Link href={`/admin/orcamentos/${q.id}`} className="edge-card flex min-h-16 items-center gap-3 p-4">
                  <FileText className="h-6 w-6 shrink-0 text-gold" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold">#{String(q.number).padStart(4, "0")} · {q.customer_name}</span>
                    <span className="text-sm text-muted">{brl(q.total)}</span>
                  </span>
                  <span className={`rounded-full border px-2.5 py-0.5 text-xs ${STATUS_CHIP[q.status] ?? ""}`}>{q.status}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-3 text-sm text-muted">
          {approved?.n ? `${approved.n} aprovado(s): ${brl(approved.total)}` : ""}
          {approved?.n && drafts?.n ? " · " : ""}
          {drafts?.n ? `${drafts.n} rascunho(s)` : ""}
        </p>
      </section>
    </>
  );
}
