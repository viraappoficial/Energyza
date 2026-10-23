import "server-only";
import { sql } from "@/lib/db";
import {
  MAX_DAYS_AHEAD,
  MIN_LEAD_HOURS,
  SLOT_STEP_MINUTES,
  TZ_OFFSET,
} from "@/lib/config";

export type Slot = { start: string; end: string; label: string };

const DAY_MS = 86_400_000;

function toDate(dateStr: string, time: string) {
  return new Date(`${dateStr}T${time.slice(0, 5)}:00${TZ_OFFSET}`);
}

export function isValidDateStr(s: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s));
}

// Horários livres de um dia para um serviço (duração em minutos).
export async function getFreeSlots(
  dateStr: string,
  durationMinutes: number,
): Promise<Slot[]> {
  if (!isValidDateStr(dateStr)) return [];

  const dayStart = toDate(dateStr, "00:00");
  const dayEnd = new Date(dayStart.getTime() + DAY_MS);
  const now = new Date();
  if (dayEnd.getTime() < now.getTime()) return [];
  if (dayStart.getTime() > now.getTime() + MAX_DAYS_AHEAD * DAY_MS) return [];

  // dia da semana no fuso local (meio-dia evita virada de data)
  const weekday = new Date(`${dateStr}T12:00:00${TZ_OFFSET}`).getUTCDay();

  const [hours, appts, off] = await Promise.all([
    sql<{ start_time: string; end_time: string }[]>`
      select start_time::text, end_time::text from working_hours where weekday = ${weekday}`,
    sql<{ starts_at: Date; ends_at: Date }[]>`
      select starts_at, ends_at from appointments
      where status <> 'cancelado' and starts_at < ${dayEnd} and ends_at > ${dayStart}`,
    sql<{ starts_at: Date; ends_at: Date }[]>`
      select starts_at, ends_at from time_off
      where starts_at < ${dayEnd} and ends_at > ${dayStart}`,
  ]);

  const busy = [...appts, ...off].map((b) => ({
    s: b.starts_at.getTime(),
    e: b.ends_at.getTime(),
  }));

  const earliest = now.getTime() + MIN_LEAD_HOURS * 3_600_000;
  const slots: Slot[] = [];

  for (const h of hours) {
    const winStart = toDate(dateStr, h.start_time).getTime();
    const winEnd = toDate(dateStr, h.end_time).getTime();
    for (
      let t = winStart;
      t + durationMinutes * 60_000 <= winEnd;
      t += SLOT_STEP_MINUTES * 60_000
    ) {
      const end = t + durationMinutes * 60_000;
      if (t < earliest) continue;
      if (busy.some((b) => t < b.e && end > b.s)) continue;
      const start = new Date(t);
      slots.push({
        start: start.toISOString(),
        end: new Date(end).toISOString(),
        label: start.toLocaleTimeString("pt-BR", {
          hour: "2-digit",
          minute: "2-digit",
          timeZone: "America/Sao_Paulo",
        }),
      });
    }
  }
  return slots.sort((a, b) => a.start.localeCompare(b.start));
}
