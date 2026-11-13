import { sql } from "@/lib/db";
import { brl } from "@/lib/format";
import { addDays, dayKey, fmtTime, startOfDay } from "@/lib/dates";
import { allow } from "@/lib/rate-limit";
import { notifyOwnerWhatsApp } from "@/lib/waha";
import { recordInOwnerChat } from "@/lib/daily-report";

// "Bom dia" do dono: agenda do dia + orçamentos que pedem atenção. Só sai se houver algo a dizer.

const fone = (p: string) => {
  const d = p.replace(/\D/g, "").replace(/^55(?=\d{10,11}$)/, "");
  return d.length === 11 ? `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}` : d.length === 10 ? `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}` : p;
};
const dm = (k: string) => k.slice(8, 10) + "/" + k.slice(5, 7);
const WEEK = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];

type Ap = { service_name: string; customer_name: string; customer_phone: string; address: string; notes: string; starts_at: Date; status: string };
type Qt = { number: number; customer_name: string; total: number; falta: number; due_date: string | null; status: string; valid_until: string };

export async function buildAgendaMessage(now = new Date()): Promise<string | null> {
  const hoje = dayKey(now);
  const amanha = addDays(hoje, 1);
  const [aps, prox, quotes] = await Promise.all([
    sql<Ap[]>`select service_name, customer_name, customer_phone, address, notes, starts_at, status from appointments
      where status in ('pendente','confirmado') and starts_at >= ${startOfDay(hoje)} and starts_at < ${startOfDay(amanha)} order by starts_at`,
    sql<{ n: number }[]>`select count(*)::int as n from appointments
      where status in ('pendente','confirmado') and starts_at >= ${startOfDay(amanha)} and starts_at < ${startOfDay(addDays(amanha, 1))}`,
    sql<Qt[]>`
      select * from (
        select q.number, q.customer_name, q.status, q.due_date::text as due_date, q.valid_until::text as valid_until,
          greatest(0, coalesce((select sum(quantity * unit_price) from quote_items where quote_id = q.id), 0) - q.discount + q.surcharge)::float8 as total,
          greatest(0, coalesce((select sum(quantity * unit_price) from quote_items where quote_id = q.id), 0) - q.discount + q.surcharge
            - coalesce((select sum(amount) from quote_payments where quote_id = q.id), 0))::float8 as falta
        from quotes q where q.status in ('enviado','aprovado','concluido')) x
      where (x.status = 'enviado' and x.valid_until between ${hoje} and ${addDays(hoje, 2)})
         or (x.status in ('aprovado','concluido') and x.falta > 0 and x.due_date is not null and x.due_date <= ${addDays(hoje, 1)})
      order by x.due_date nulls last, x.number`,
  ]);

  const venc = quotes.filter((q) => q.status !== "enviado");
  const expira = quotes.filter((q) => q.status === "enviado");
  if (!aps.length && !venc.length && !expira.length) return null;

  const dia = new Date(`${hoje}T12:00:00Z`).getUTCDay();
  const L: string[] = [`☀️ *Bom dia, Vanderson!* Hoje é ${WEEK[dia]}, ${dm(hoje)}.`, ""];

  if (aps.length) {
    L.push(`📅 *Agenda de hoje (${aps.length})*`);
    for (const a of aps) {
      L.push(`🕐 *${fmtTime(a.starts_at)}* · ${a.service_name}${a.status === "pendente" ? " _(a confirmar)_" : ""}`);
      L.push(`   ${a.customer_name} · ${fone(a.customer_phone)}`);
      if (a.address) L.push(`   📍 ${a.address}`);
      if (a.notes) L.push(`   📝 ${a.notes.replace(/\s+/g, " ").slice(0, 120)}`);
    }
    L.push("");
  } else {
    L.push("📅 Nenhum agendamento hoje.", "");
  }
  if (prox[0]?.n) L.push(`➡️ Amanhã: ${prox[0].n} agendamento${prox[0].n > 1 ? "s" : ""}.`, "");

  if (venc.length) {
    L.push("💰 *Cobranças para hoje*");
    for (const q of venc.slice(0, 6)) {
      const atras = q.due_date! < hoje;
      L.push(`• #${String(q.number).padStart(4, "0")} ${q.customer_name}: falta ${brl(q.falta)} · ${atras ? `atrasado (venceu ${dm(q.due_date!)})` : q.due_date === hoje ? "vence hoje" : "vence amanhã"}`);
    }
    if (venc.length > 6) L.push(`… e mais ${venc.length - 6}`);
    L.push("");
  }
  if (expira.length) {
    L.push("⏳ *Orçamentos perto de vencer (sem resposta)*");
    for (const q of expira.slice(0, 5)) L.push(`• #${String(q.number).padStart(4, "0")} ${q.customer_name} · ${brl(q.total)} · vale até ${dm(q.valid_until)}`);
    L.push("Vale chamar o cliente hoje para fechar.", "");
  }
  L.push(aps.length ? "💪 Bom trabalho e bora pra cima! Confirme os horários com os clientes antes de sair." : "💪 Bom dia e ótima semana de trabalho!");
  return L.join("\n");
}

export async function sendAgendaMessage(manual = false): Promise<{ status: "enviado" | "nada" | "ja-enviado" | "falhou"; error?: string; texto?: string }> {
  if (!(await allow(manual ? "agenda:manual" : "agenda:daily", manual ? 6 : 1, manual ? 3600 : 72_000))) return { status: "ja-enviado" };
  const text = await buildAgendaMessage();
  if (!text) return { status: "nada" };
  const r = await notifyOwnerWhatsApp(text);
  if (!r.ok) return { status: "falhou", error: r.error };
  await recordInOwnerChat(r.id, text);
  return { status: "enviado", texto: text };
}
