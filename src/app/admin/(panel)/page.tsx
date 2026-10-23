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

type D = Date | string;
const fmtDay = (iso: D) =>
  new Date(iso).toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    timeZone: "America/Sao_Paulo",
  });
const fmtTime = (iso: D) =>
  new Date(iso).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Sao_Paulo",
  });
const dayKey = (iso: D) =>
  new Date(new Date(iso).getTime() - 3 * 3_600_000).toISOString().slice(0, 10);

export default async function AgendaPage({
  searchParams,
}: {
  searchParams: Promise<{ todos?: string }>;
}) {
  const { todos } = await searchParams;
  await requireAdmin();

  const todayStart = new Date(`${dayKey(new Date())}T00:00:00-03:00`);
  const appts = todos
    ? await sql<Appointment[]>`select * from appointments order by starts_at`
    : await sql<Appointment[]>`select * from appointments
        where starts_at >= ${todayStart} and status <> 'cancelado' order by starts_at`;

  const groups = new Map<string, Appointment[]>();
  for (const a of appts) {
    const k = dayKey(a.starts_at);
    groups.set(k, [...(groups.get(k) ?? []), a]);
  }
  const pendentes = appts.filter((a) => a.status === "pendente").length;

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Agenda</h1>
          {pendentes > 0 && (
            <p className="text-sm text-yellow-300">{pendentes} aguardando confirmação</p>
          )}
        </div>
        <div className="flex gap-2">
          <Link href={todos ? "/admin" : "/admin?todos=1"} className="btn btn-outline">
            {todos ? "Só próximos" : "Ver histórico"}
          </Link>
          <Link href="/admin/novo" className="btn btn-gold">+ Novo agendamento</Link>
        </div>
      </div>

      {groups.size === 0 && <p className="mt-8 text-muted">Nenhum agendamento.</p>}

      <div className="mt-6 space-y-8">
        {[...groups.entries()].map(([key, list]) => (
          <section key={key}>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gold">
              {fmtDay(list[0].starts_at)}
            </h2>
            <ul className="space-y-3">
              {list.map((a) => (
                <li key={a.id} className="card p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="text-lg font-semibold">
                        {fmtTime(a.starts_at)}–{fmtTime(a.ends_at)} · {a.service_name}
                      </p>
                      <p>{a.customer_name}</p>
                      {a.address && <p className="text-sm text-muted">{a.address}</p>}
                      {a.notes && <p className="text-sm text-muted">“{a.notes}”</p>}
                    </div>
                    <span className={`rounded-full border px-3 py-0.5 text-xs ${STATUS_STYLE[a.status]}`}>
                      {a.status}{a.source === "site" ? " · site" : ""}
                    </span>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {a.customer_phone && (
                      <a
                        className="btn btn-outline !px-3 !py-1.5 text-sm"
                        target="_blank"
                        rel="noopener noreferrer"
                        href={`https://wa.me/55${a.customer_phone.replace(/\D/g, "").replace(/^55/, "")}?text=${encodeURIComponent(
                          `Olá ${a.customer_name}! Aqui é da Energyza sobre seu agendamento (${a.service_name}) em ${fmtDay(a.starts_at)} às ${fmtTime(a.starts_at)}.`,
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
                          <button className="btn btn-outline !px-3 !py-1.5 text-sm capitalize">{s === "concluido" ? "Concluir" : s === "confirmado" ? "Confirmar" : "Cancelar"}</button>
                        </form>
                      ))}
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </>
  );
}
