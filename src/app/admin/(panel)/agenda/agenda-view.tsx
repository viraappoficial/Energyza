"use client";

import Link from "next/link";
import { useState } from "react";
import { setAppointmentStatus } from "../../actions";
import { DAY_MS, addDays, dayKey, fmtLongDay, fmtTime, startOfDay } from "@/lib/dates";
import { PageTitle } from "@/app/admin/(panel)/page-title";

export type AgendaAppt = {
  id: string;
  service_name: string;
  customer_name: string;
  customer_phone: string;
  address: string;
  notes: string;
  starts_at: string;
  ends_at: string;
  status: "pendente" | "confirmado" | "concluido" | "cancelado";
  source: "site" | "manual";
  origin: string;
};
export type AgendaOff = { starts_at: string; ends_at: string; reason: string };

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

function shiftMonth(month: string, delta: number) {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

// O mês inteiro chega de uma vez: trocar de dia é instantâneo (sem ir ao servidor).
export function AgendaView({
  month,
  today,
  initialSelected,
  appts,
  off,
}: {
  month: string;
  today: string;
  initialSelected: string;
  appts: AgendaAppt[];
  off: AgendaOff[];
}) {
  const [selected, setSelected] = useState(initialSelected);

  const [y, m] = month.split("-").map(Number);
  const first = new Date(Date.UTC(y, m - 1, 1));
  const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const offset = first.getUTCDay();
  const weeks = Math.ceil((offset + daysInMonth) / 7);
  const gridStart = addDays(`${month}-01`, -offset);
  const cells = Array.from({ length: weeks * 7 }, (_, i) => addDays(gridStart, i));

  const byDay = new Map<string, AgendaAppt[]>();
  for (const a of appts) {
    const k = dayKey(a.starts_at);
    byDay.set(k, [...(byDay.get(k) ?? []), a]);
  }
  const blockedReason = (key: string) => {
    const s = startOfDay(key).getTime();
    const e = s + DAY_MS;
    return off.find((o) => Date.parse(o.starts_at) < e && Date.parse(o.ends_at) > s);
  };

  const pick = (key: string) => {
    setSelected(key);
    window.history.replaceState(null, "", `/admin/agenda?dia=${key}`);
  };

  const dayList = byDay.get(selected) ?? [];
  const pendentes = appts.filter((a) => a.status === "pendente" && dayKey(a.starts_at).startsWith(month)).length;
  const monthText = first.toLocaleDateString("pt-BR", { month: "long", year: "numeric", timeZone: "UTC" });
  const monthLabel = monthText.charAt(0).toUpperCase() + monthText.slice(1);
  const selectedOff = blockedReason(selected);

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <PageTitle eyebrow="Painel" title="Agenda" />
          {pendentes > 0 && (
            <p className="text-sm text-yellow-300">{pendentes} aguardando confirmação neste mês</p>
          )}
        </div>
        <Link href={`/admin/novo?data=${selected}`} className="btn btn-gold">
          + Novo agendamento
        </Link>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <section className="edge-card p-3 sm:p-4">
          <div className="mb-3 flex items-center justify-between gap-2">
            <Link href={`/admin/agenda?mes=${shiftMonth(month, -1)}`} className="btn btn-outline !px-3 !py-1.5 text-sm" aria-label="Mês anterior">
              ‹
            </Link>
            <div className="flex items-center gap-3">
              <h2 className="font-display text-2xl font-bold uppercase">{monthLabel}</h2>
              {month !== today.slice(0, 7) || selected !== today ? (
                <Link href="/admin/agenda" className="px-2 py-2 text-sm text-gold underline">Hoje</Link>
              ) : null}
            </div>
            <Link href={`/admin/agenda?mes=${shiftMonth(month, 1)}`} className="btn btn-outline !px-3 !py-1.5 text-sm" aria-label="Próximo mês">
              ›
            </Link>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center text-xs uppercase tracking-wide text-muted">
            {WEEKDAYS.map((w) => (
              <div key={w} className="py-1">{w}</div>
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
                <button
                  type="button"
                  key={key}
                  onClick={() => pick(key)}
                  aria-label={`${fmtLongDay(key)}: ${list.length} agendamento(s)`}
                  aria-current={isSel ? "date" : undefined}
                  className={`flex min-h-16 flex-col rounded-lg border p-1 text-left transition-colors sm:min-h-24 sm:p-1.5 ${
                    isSel ? "border-gold bg-gold/10" : "border-border hover:border-gold/60"
                  } ${inMonth ? "" : "opacity-40"} ${blocked ? "bg-surface-2" : ""}`}
                >
                  <span className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-sm ${isToday ? "bg-gold font-bold text-black" : ""}`}>
                    {Number(key.slice(8))}
                  </span>
                  {blocked && <span className="mt-0.5 text-[10px] uppercase text-muted">Folga</span>}
                  {list.length > 0 && (
                    <span className={`mt-auto self-start rounded-full px-1.5 text-[11px] font-semibold sm:hidden ${hasPending ? "bg-yellow-500/20 text-yellow-300" : "bg-emerald-500/20 text-emerald-300"}`}>
                      {list.length}
                    </span>
                  )}
                  <span className="mt-1 hidden flex-col gap-0.5 sm:flex">
                    {list.slice(0, 2).map((a) => (
                      <span key={a.id} className={`truncate rounded px-1 text-[11px] ${CHIP_STYLE[a.status] ?? ""}`}>
                        {fmtTime(a.starts_at)} {a.customer_name.split(" ")[0]}
                      </span>
                    ))}
                    {list.length > 2 && <span className="px-1 text-[11px] text-muted">+{list.length - 2} mais</span>}
                  </span>
                </button>
              );
            })}
          </div>

          <p className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
            <span><span className="text-yellow-300">●</span> pendente</span>
            <span><span className="text-emerald-300">●</span> confirmado</span>
            <span><span className="text-sky-300">●</span> concluído</span>
          </p>
        </section>

        <section>
          <h2 className="font-display text-2xl font-bold uppercase text-gold">{fmtLongDay(selected)}</h2>
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
                <li key={a.id} className="edge-card p-4">
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
                      {a.origin ? ` · ${a.origin}` : ""}
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
                    <Link
                      href={`/admin/orcamentos/novo?agendamento=${a.id}`}
                      className="btn btn-outline !px-3 !py-1.5 text-sm"
                    >
                      Fazer orçamento
                    </Link>
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
