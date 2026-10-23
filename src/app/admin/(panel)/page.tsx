import { sql, type Appointment } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { addDays, dayKey, startOfDay } from "@/lib/dates";
import { AgendaView, type AgendaAppt } from "./agenda-view";

export const dynamic = "force-dynamic";

function origem(a: Record<string, string> | null) {
  if (!a) return "";
  if (a.gclid || a.gbraid || a.wbraid) return "Google Ads";
  if (a.fbclid) return "Meta Ads";
  if (a.utm_source) return a.utm_source;
  if (a.referrer) return a.referrer;
  return "";
}

const isDayKey = (s?: string): s is string => !!s && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s));
const isMonthKey = (s?: string): s is string => !!s && /^\d{4}-(0[1-9]|1[0-2])$/.test(s);

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

  // o mês inteiro (com os dias vizinhos da grade) vem de uma vez
  const [y, m] = month.split("-").map(Number);
  const offset = new Date(Date.UTC(y, m - 1, 1)).getUTCDay();
  const weeks = Math.ceil((offset + new Date(Date.UTC(y, m, 0)).getUTCDate()) / 7);
  const gridStart = addDays(`${month}-01`, -offset);
  const rangeStart = startOfDay(gridStart);
  const rangeEnd = startOfDay(addDays(gridStart, weeks * 7));

  const [rows, off] = await Promise.all([
    sql<Appointment[]>`
      select * from appointments
      where starts_at >= ${rangeStart} and starts_at < ${rangeEnd}
      order by starts_at`,
    sql<{ starts_at: Date; ends_at: Date; reason: string }[]>`
      select starts_at, ends_at, reason from time_off
      where starts_at < ${rangeEnd} and ends_at > ${rangeStart}`,
  ]);

  const appts: AgendaAppt[] = rows.map((a) => ({
    id: a.id,
    service_name: a.service_name,
    customer_name: a.customer_name,
    customer_phone: a.customer_phone,
    address: a.address,
    notes: a.notes,
    starts_at: a.starts_at.toISOString(),
    ends_at: a.ends_at.toISOString(),
    status: a.status,
    source: a.source,
    origin: origem(a.attribution),
  }));

  return (
    <AgendaView
      // remonta ao trocar de mês, mantém o estado ao confirmar/cancelar
      key={month}
      month={month}
      today={today}
      initialSelected={selected}
      appts={appts}
      off={off.map((o) => ({
        starts_at: o.starts_at.toISOString(),
        ends_at: o.ends_at.toISOString(),
        reason: o.reason,
      }))}
    />
  );
}
