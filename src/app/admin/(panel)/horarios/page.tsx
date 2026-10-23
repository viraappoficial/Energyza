import { sql } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { addTimeOff, addWorkingHours, deleteTimeOff, deleteWorkingHours } from "../../actions";
import { PageTitle } from "@/app/admin/(panel)/page-title";

export const dynamic = "force-dynamic";
const DAYS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

export default async function HorariosPage() {
  await requireAdmin();
  const [hours, off] = await Promise.all([
    sql<{ id: string; weekday: number; start_time: string; end_time: string }[]>`
      select id, weekday, start_time::text, end_time::text from working_hours
      order by weekday, start_time`,
    sql<{ id: string; starts_at: Date; ends_at: Date; reason: string }[]>`
      select id, starts_at, ends_at, reason from time_off
      where ends_at >= now() order by starts_at`,
  ]);

  return (
    <div className="space-y-10">
      <section>
        <PageTitle eyebrow="Painel" title="Horários" />
        <h2 className="font-display mt-8 text-2xl font-bold uppercase">Horário de atendimento</h2>
        <ul className="mt-4 space-y-2">
          {DAYS.map((d, i) => {
            const list = hours.filter((h) => h.weekday === i);
            return (
              <li key={d} className="edge-card flex flex-wrap items-center gap-3 p-3">
                <span className="w-24 font-semibold">{d}</span>
                {list.length === 0 && <span className="text-muted">Sem atendimento</span>}
                {list.map((h) => (
                  <form key={h.id} action={deleteWorkingHours} className="flex items-center gap-1 rounded-lg border border-border px-2 py-1 text-sm">
                    <input type="hidden" name="id" value={h.id} />
                    {h.start_time.slice(0, 5)}–{h.end_time.slice(0, 5)}
                    <button className="-my-2 ml-1 px-3 py-2 text-red-300" aria-label="Remover">✕</button>
                  </form>
                ))}
              </li>
            );
          })}
        </ul>

        <form action={addWorkingHours} className="edge-card mt-4 space-y-3 p-4">
          <p className="font-semibold">Adicionar faixa de horário</p>
          <div className="flex flex-wrap gap-3 text-sm">
            {DAYS.map((d, i) => (
              <label key={d} className="flex items-center gap-1">
                <input type="checkbox" name="weekday" value={i} /> {d.slice(0, 3)}
              </label>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <input type="time" name="start" defaultValue="08:00" className="input !w-auto" />
            <span>até</span>
            <input type="time" name="end" defaultValue="12:00" className="input !w-auto" />
            <button className="btn btn-outline">Adicionar</button>
          </div>
        </form>
      </section>

      <section>
        <h2 className="font-display text-2xl font-bold uppercase">Folgas e bloqueios</h2>
        <p className="mt-1 text-sm text-muted">Dias em que não aparece nenhum horário no site.</p>
        <ul className="mt-4 space-y-2">
          {off.length === 0 && <li className="text-muted">Nenhum bloqueio futuro.</li>}
          {off.map((o) => (
            <li key={o.id} className="edge-card flex items-center justify-between p-3 text-sm">
              <span>
                {new Date(o.starts_at).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })} →{" "}
                {new Date(new Date(o.ends_at).getTime() - 1).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })}
                {o.reason && ` · ${o.reason}`}
              </span>
              <form action={deleteTimeOff}>
                <input type="hidden" name="id" value={o.id} />
                <button className="text-red-300">Remover</button>
              </form>
            </li>
          ))}
        </ul>
        <form action={addTimeOff} className="edge-card mt-4 flex flex-wrap items-end gap-3 p-4">
          <div><label className="label">De</label><input type="date" name="from" required className="input" /></div>
          <div><label className="label">Até (opcional)</label><input type="date" name="to" className="input" /></div>
          <div className="min-w-40 flex-1"><label className="label">Motivo</label><input name="reason" className="input" placeholder="Férias, feriado…" /></div>
          <button className="btn btn-outline">Bloquear</button>
        </form>
      </section>
    </div>
  );
}
