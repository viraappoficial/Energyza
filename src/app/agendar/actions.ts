"use server";

import { z } from "zod";
import { after } from "next/server";
import { sql } from "@/lib/db";
import { notifyOwner } from "@/lib/push";
import { notifyOwnerWhatsApp } from "@/lib/waha";
import { getFreeSlots, type Slot } from "@/lib/slots";
import { allow, clientIp } from "@/lib/rate-limit";

export async function listServices() {
  return sql<
    { id: string; name: string; description: string; duration_minutes: number }[]
  >`select id, name, description, duration_minutes from services where active order by sort_order`;
}

// serviços ativos + dias da semana em que há atendimento (para o calendário)
export async function listBookingConfig() {
  const [services, days] = await Promise.all([
    listServices(),
    sql<{ weekday: number }[]>`select distinct weekday from working_hours order by weekday`,
  ]);
  return { services, openWeekdays: days.map((d) => d.weekday) };
}

export async function fetchSlots(
  serviceId: string,
  date: string,
): Promise<Slot[]> {
  if (!z.uuid().safeParse(serviceId).success) return [];
  const [service] = await sql<{ duration_minutes: number }[]>`
    select duration_minutes from services where id = ${serviceId} and active`;
  if (!service) return [];
  return getFreeSlots(date, service.duration_minutes);
}

const BookingSchema = z.object({
  serviceId: z.uuid(),
  start: z.iso.datetime(),
  name: z.string().trim().min(3, "Informe seu nome").max(120),
  phone: z
    .string()
    .trim()
    .transform((v) => v.replace(/\D/g, ""))
    .pipe(z.string().min(10, "Telefone inválido").max(13, "Telefone inválido")),
  address: z.string().trim().min(5, "Informe o endereço do atendimento").max(250),
  notes: z
    .string()
    .trim()
    .min(10, "Descreva o que você precisa (mínimo 10 caracteres)")
    .max(1000),
  attribution: z
    .string()
    .max(2000)
    .transform((v) => {
      try {
        const o = JSON.parse(v);
        if (!o || typeof o !== "object" || Array.isArray(o)) return {};
        // só texto curto, no máximo 15 chaves
        return Object.fromEntries(
          Object.entries(o)
            .filter(([, val]) => typeof val === "string")
            .slice(0, 15)
            .map(([k, val]) => [k.slice(0, 40), (val as string).slice(0, 200)]),
        ) as Record<string, string>;
      } catch {
        return {};
      }
    })
    .default({}),
});

export type BookingState = {
  ok: boolean;
  error?: string;
  summary?: { service: string; when: string };
};

export async function createBooking(
  _prev: BookingState,
  formData: FormData,
): Promise<BookingState> {
  // honeypot: bots preenchem, pessoas não
  if (formData.get("website")) return { ok: true };

  const parsed = BookingSchema.safeParse({
    serviceId: formData.get("serviceId"),
    start: formData.get("start"),
    name: formData.get("name"),
    phone: formData.get("phone"),
    address: formData.get("address"),
    notes: formData.get("notes") ?? "",
    attribution: formData.get("attribution") ?? "{}",
  });
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Dados inválidos",
    };
  }
  const d = parsed.data;

  // freios contra robô e abuso (agenda lotada de horário falso, spam de aviso no WhatsApp do dono)
  const ip = await clientIp();
  if (!(await allow(`book:ip:h:${ip}`, 4, 3600)) || !(await allow(`book:ip:d:${ip}`, 10, 86_400))) {
    return { ok: false, error: "Muitas solicitações em pouco tempo. Tente de novo mais tarde ou chame no WhatsApp." };
  }
  const [{ mine }] = await sql<{ mine: number }[]>`
    select count(*)::int as mine from appointments
    where source = 'site' and status in ('pendente', 'confirmado') and ends_at > now()
      and right(regexp_replace(customer_phone, '[^0-9]', '', 'g'), 10) = ${d.phone.slice(-10)}`;
  if (mine >= 2) return { ok: false, error: "Você já tem agendamentos marcados. Para mudar, chame no WhatsApp." };
  const [{ today }] = await sql<{ today: number }[]>`
    select count(*)::int as today from appointments where source = 'site' and created_at > now() - interval '24 hours'`;
  if (today >= 40) return { ok: false, error: "Estamos com muitos pedidos agora. Chame pelo WhatsApp para agendar." };

  const [service] = await sql<{ id: string; name: string; duration_minutes: number }[]>`
    select id, name, duration_minutes from services
    where id = ${d.serviceId} and active`;
  if (!service) return { ok: false, error: "Serviço indisponível" };

  // revalida no servidor: o horário precisa estar na lista de livres
  const startDate = new Date(d.start);
  const dateStr = new Date(startDate.getTime() - 3 * 3_600_000)
    .toISOString()
    .slice(0, 10);
  const free = await getFreeSlots(dateStr, service.duration_minutes);
  const slot = free.find(
    (s) => new Date(s.start).getTime() === startDate.getTime(),
  );
  if (!slot) {
    return {
      ok: false,
      error: "Esse horário acabou de ser ocupado. Escolha outro.",
    };
  }

  try {
    await sql`
      insert into appointments
        (service_id, service_name, customer_name, customer_phone, address, notes,
         starts_at, ends_at, status, source, attribution)
      values
        (${service.id}, ${service.name}, ${d.name}, ${d.phone}, ${d.address}, ${d.notes},
         ${slot.start}, ${slot.end}, 'pendente', 'site', ${sql.json(d.attribution)})`;
  } catch (e) {
    // 23P01 = violação da exclusão (horário ocupado por corrida)
    if ((e as { code?: string }).code === "23P01") {
      return {
        ok: false,
        error: "Esse horário acabou de ser ocupado. Escolha outro.",
      };
    }
    return {
      ok: false,
      error: "Não foi possível agendar. Tente pelo WhatsApp.",
    };
  }

  const when = new Date(slot.start).toLocaleString("pt-BR", {
    dateStyle: "full",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo",
  });

  // avisa o eletricista (celular e WhatsApp) sem atrasar a resposta ao cliente
  const panel = process.env.PANEL_HOST ? `https://${process.env.PANEL_HOST}` : (process.env.NEXT_PUBLIC_SITE_URL ?? "");
  const day = dateStr;
  const alert = await allow("notify:booking", 15, 3600); // teto de avisos por hora (protege o chip do WhatsApp)
  after(async () => {
    if (!alert) return;
    await notifyOwner({
      title: "Novo agendamento",
      body: `${service.name} · ${when} · ${d.name}`,
      url: `/admin/agenda?dia=${day}`,
      tag: "agendamento",
    });
    await notifyOwnerWhatsApp(
      [
        "⚡ *Novo agendamento pelo site*",
        "",
        `*Serviço:* ${service.name}`,
        `*Quando:* ${when}`,
        `*Cliente:* ${d.name}`,
        `*Telefone:* ${d.phone}`,
        `*Endereço:* ${d.address}`,
        `*Detalhes:* ${d.notes}`,
        "",
        `Abrir na agenda: ${panel}/admin/agenda?dia=${day}`,
      ].join("\n"),
    );
  });
  return { ok: true, summary: { service: service.name, when } };
}
