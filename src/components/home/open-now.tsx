"use client";

import { useSyncExternalStore } from "react";

export type Hours = { weekday: number; start: string; end: string }[]; // "08:00"

const DAYS = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];

// relógio que atualiza a cada minuto (null no servidor, para não divergir na hidratação)
function subscribe(cb: () => void) {
  const t = setInterval(cb, 60_000);
  return () => clearInterval(t);
}
const tick = () => Math.floor(Date.now() / 60_000);

function brt(ms: number) {
  const d = new Date(ms - 3 * 3_600_000); // Brasília = UTC-3
  return { weekday: d.getUTCDay(), minutes: d.getUTCHours() * 60 + d.getUTCMinutes() };
}
const toMin = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));

// "Atendendo agora" / "Volta amanhã às 08h", calculado dos horários reais do painel.
export function OpenNow({ hours }: { hours: Hours }) {
  const minute = useSyncExternalStore(subscribe, tick, () => null);
  if (minute === null) return <span className="inline-block h-8 w-44 rounded-full bg-surface-2" aria-hidden />;

  const now = brt(minute * 60_000);
  const today = hours.filter((h) => h.weekday === now.weekday);
  const open = today.some((h) => now.minutes >= toMin(h.start) && now.minutes < toMin(h.end));

  let label = "Atendendo agora";
  if (!open) {
    const laterToday = today.map((h) => toMin(h.start)).filter((m) => m > now.minutes).sort((a, b) => a - b)[0];
    if (laterToday !== undefined) {
      label = `Volta hoje às ${String(Math.floor(laterToday / 60)).padStart(2, "0")}h`;
    } else {
      let found = "";
      for (let i = 1; i <= 7 && !found; i++) {
        const wd = (now.weekday + i) % 7;
        const first = hours.filter((h) => h.weekday === wd).map((h) => toMin(h.start)).sort((a, b) => a - b)[0];
        if (first !== undefined) found = `${i === 1 ? "amanhã" : DAYS[wd]} às ${String(Math.floor(first / 60)).padStart(2, "0")}h`;
      }
      label = found ? `Volta ${found}` : "Fora do horário";
    }
  }

  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-border bg-black/60 px-3.5 py-1.5 text-sm font-medium">
      <span
        className={`h-2.5 w-2.5 rounded-full ${open ? "bg-emerald-400" : "bg-neutral-500"}`}
        style={open ? { animation: "live-dot 1.6s ease-out infinite" } : undefined}
      />
      {label}
    </span>
  );
}
