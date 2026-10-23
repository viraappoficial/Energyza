"use server";

import { z } from "zod";
import { sql } from "@/lib/db";
import { getFreeSlots, type Slot } from "@/lib/slots";

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
  return { ok: true, summary: { service: service.name, when } };
}
