import Link from "next/link";
import { sql, type Appointment } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { setAppointmentStatus } from "../actions";

export const dynamic = "force-dynamic";

const STATUS_STYLE: Record<string, string> = {
  pendente: "border-yellow-500/50 text-yellow-300",
  confirmado: "border-emerald-500/50 text-emerald-300",
  concluido: "border-sky-500/50 text-sky-300",
  cancelado: "border-red-500/50 text-red-300",
};
const CHIP_STYLE: Record<string, string> = {
  pendente: "bg-yellow-500/15 text-yellow-300",
  confirmado: "bg-emerald-500/15 text-emerald-300",
  concluido: "bg-sky-500/15 text-sky-300",
};
const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const DAY_MS = 86_400_000;

type D = Date | string;

function origem(a: Record<string, string> | null) {
  if (!a) return "";
  if (a.gclid || a.gbraid || a.wbraid) return "Google Ads";
  if (a.fbclid) return "Meta Ads";
  if (a.utm_source) return a.utm_source;
  if (a.referrer) return a.referrer;
  return "";
}

// chave "YYYY-MM-DD" no horário de Brasília
const dayKey = (d: D) =>
  new Date(new Date(d).getTime() - 3 * 3_600_000).toISOString().slice(0, 10);
const startOfDay = (key: string) => new Date(`${key}T00:00:00-03:00`);
const addDays = (key: string, n: number) =>
  new Date(Date.parse(`${key}T12:00:00Z`) + n * DAY_MS).toISOString().slice(0, 10);

const fmtTime = (d: D) =>
  new Date(d).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Sao_Paulo",
  });
const fmtLongDay = (key: string) =>
  new Date(`${key}T12:00:00Z`).toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    timeZone: "UTC",
  });

const isDayKey = (s?: string): s is string => !!s && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s));
const isMonthKey = (s?: string): s is string => !!s && /^\d{4}-(0[1-9]|1[0-2])$/.test(s);

function shiftMonth(month: string, delta: number) {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

export default async function AgendaPage({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string; dia?: string }>;
}) {
  await requireAdmin();
  const { mes, dia } = await searchParams;

  const today = dayKey(new Date());
  const month = isDayKey(dia) ? dia.slice(0, 7) : isMonthKey(mes) ? mes : today.slice(0, 7);
  const selected = isDayKey(dia) ? dia : month === today.slice(0, 7) ? today : `${month}-01`;

  // grade do mês (domingo a sábado)
  const [y, m] = month.split("-").map(Number);
  const first = new Date(Date.UTC(y, m - 1, 1));
  const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const offset = first.getUTCDay();
  const weeks = Math.ceil((offset + daysInMonth) / 7);
  const gridStart = addDays(`${month}-01`, -offset);
  const cells = Array.from({ length: weeks * 7 }, (_, i) => addDays(gridStart, i));
  const rangeStart = startOfDay(cells[0]);
  const rangeEnd = startOfDay(addDays(cells[cells.length - 1], 1));

  const [appts, off] = await Promise.all([
    sql<Appointment[]>`
      select * from appointments
      where starts_at >= ${rangeStart} and starts_at < ${rangeEnd}
      order by starts_at`,
    sql<{ starts_at: Date; ends_at: Date; reason: string }[]>`
      select starts_at, ends_at, reason from time_off
      where starts_at < ${rangeEnd} and ends_at > ${rangeStart}`,
  ]);

  const byDay = new Map<string, Appointment[]>();
  for (const a of appts) {
    const k = dayKey(a.starts_at);
    byDay.set(k, [...(byDay.get(k) ?? []), a]);
  }
  const blockedReason = (key: string) => {
    const s = startOfDay(key).getTime();
    const e = s + DAY_MS;
    return off.find((o) => o.starts_at.getTime() < e && o.ends_at.getTime() > s);
  };

  const dayList = byDay.get(selected) ?? [];
  const pendentes = appts.filter((a) => a.status === "pendente").length;
  const monthText = first.toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
  const monthLabel = monthText.charAt(0).toUpperCase() + monthText.slice(1);
  const selectedOff = blockedReason(selected);

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Agenda</h1>
          {pendentes > 0 && (
            <p className="text-sm text-yellow-300">
              {pendentes} aguardando confirmação neste mês
            </p>
          )}
        </div>
        <Link href={`/admin/novo?data=${selected}`} className="btn btn-gold">
          + Novo agendamento
        </Link>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        {/* ---------- Calendário ---------- */}
        <section className="card p-3 sm:p-4">
          <div className="mb-3 flex items-center justify-between gap-2">
            <Link href={`/admin?mes=${shiftMonth(month, -1)}`} className="btn btn-outline !px-3 !py-1.5 text-sm" aria-label="Mês anterior">
              ‹
            </Link>
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-semibold">{monthLabel}</h2>
              {month !== today.slice(0, 7) || selected !== today ? (
                <Link href="/admin" className="text-sm text-gold underline">
                  Hoje
                </Link>
              ) : null}
            </div>
            <Link href={`/admin?mes=${shiftMonth(month, 1)}`} className="btn btn-outline !px-3 !py-1.5 text-sm" aria-label="Próximo mês">
              ›
            </Link>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center text-xs uppercase tracking-wide text-muted">
            {WEEKDAYS.map((w) => (
              <div key={w} className="py-1">
                {w}
              </div>
            ))}
          </div>

          <div className="mt-1 grid grid-cols-7 gap-1">
            {cells.map((key) => {
              const list = (byDay.get(key) ?? []).filter((a) => a.status !== "cancelado");
              const inMonth = key.startsWith(month);
              const isToday = key === today;
              const isSel = key === selected;
              const hasPending = list.some((a) => a.status === "pendente");
              const blocked = blockedReason(key);
              return (
                <Link
                  key={key}
                  href={`/admin?dia=${key}`}
                  aria-label={`${fmtLongDay(key)}: ${list.length} agendamento(s)`}
                  aria-current={isSel ? "date" : undefined}
                  className={`flex min-h-16 flex-col rounded-lg border p-1 text-left transition-colors sm:min-h-24 sm:p-1.5 ${
                    isSel ? "border-gold bg-gold/10" : "border-border hover:border-gold/60"
                  } ${inMonth ? "" : "opacity-40"} ${blocked ? "bg-surface-2" : ""}`}
                >
                  <span
                    className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-sm ${
                      isToday ? "bg-gold font-bold text-black" : ""
                    }`}
                  >
                    {Number(key.slice(8))}
                  </span>
                  {blocked && <span className="mt-0.5 text-[10px] uppercase text-muted">Folga</span>}
                  {/* celular: só a contagem */}
                  {list.length > 0 && (
                    <span
                      className={`mt-auto self-start rounded-full px-1.5 text-[11px] font-semibold sm:hidden ${
                        hasPending ? "bg-yellow-500/20 text-yellow-300" : "bg-emerald-500/20 text-emerald-300"
                      }`}
                    >
                      {list.length}
                    </span>
                  )}
                  {/* computador: primeiros horários */}
                  <span className="mt-1 hidden flex-col gap-0.5 sm:flex">
                    {list.slice(0, 2).map((a) => (
                      <span
                        key={a.id}
                        className={`truncate rounded px-1 text-[11px] ${CHIP_STYLE[a.status] ?? ""}`}
                      >
                        {fmtTime(a.starts_at)} {a.customer_name.split(" ")[0]}
                      </span>
                    ))}
                    {list.length > 2 && (
                      <span className="px-1 text-[11px] text-muted">+{list.length - 2} mais</span>
                    )}
                  </span>
                </Link>
              );
            })}
          </div>

          <p className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
            <span><span className="text-yellow-300">●</span> pendente</span>
            <span><span className="text-emerald-300">●</span> confirmado</span>
            <span><span className="text-sky-300">●</span> concluído</span>
          </p>
        </section>

        {/* ---------- Agenda do dia ---------- */}
        <section>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-gold">
            {fmtLongDay(selected)}
          </h2>
          {selectedOff && (
            <p className="mt-2 rounded-lg border border-border bg-surface-2 p-3 text-sm text-muted">
              Dia bloqueado{selectedOff.reason ? `: ${selectedOff.reason}` : ""}. O site não oferece horários nele.
            </p>
          )}
          {dayList.length === 0 ? (
            <p className="mt-4 text-muted">Nada agendado neste dia.</p>
          ) : (
            <ul className="mt-3 space-y-3">
              {dayList.map((a) => (
                <li key={a.id} className="card p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="text-lg font-semibold">
                        {fmtTime(a.starts_at)}–{fmtTime(a.ends_at)} · {a.service_name}
                      </p>
                      <p>{a.customer_name}</p>
                      {a.customer_phone && <p className="text-sm text-muted">{a.customer_phone}</p>}
                      {a.address && <p className="text-sm text-muted">{a.address}</p>}
                      {a.notes && <p className="mt-1 text-sm text-muted">“{a.notes}”</p>}
                    </div>
                    <span className={`rounded-full border px-3 py-0.5 text-xs ${STATUS_STYLE[a.status]}`}>
                      {a.status}
                      {a.source === "site" ? " · site" : ""}
                      {origem(a.attribution) ? ` · ${origem(a.attribution)}` : ""}
                    </span>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {a.customer_phone && (
                      <a
                        className="btn btn-outline !px-3 !py-1.5 text-sm"
                        target="_blank"
                        rel="noopener noreferrer"
                        href={`https://wa.me/55${a.customer_phone.replace(/\D/g, "").replace(/^55/, "")}?text=${encodeURIComponent(
                          `Olá ${a.customer_name}! Aqui é da Energyza sobre seu agendamento (${a.service_name}) em ${fmtLongDay(selected)} às ${fmtTime(a.starts_at)}.`,
                        )}`}
                      >
                        WhatsApp
                      </a>
                    )}
                    {(["confirmado", "concluido", "cancelado"] as const)
                      .filter((s) => s !== a.status)
                      .map((s) => (
                        <form key={s} action={setAppointmentStatus}>
                          <input type="hidden" name="id" value={a.id} />
                          <input type="hidden" name="status" value={s} />
                          <button className="btn btn-outline !px-3 !py-1.5 text-sm">
                            {s === "concluido" ? "Concluir" : s === "confirmado" ? "Confirmar" : "Cancelar"}
                          </button>
                        </form>
                      ))}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}
