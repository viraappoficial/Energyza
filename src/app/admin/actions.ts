"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { sql } from "@/lib/db";
import {
  checkCredentials,
  createSession,
  destroySession,
  requireAdmin,
} from "@/lib/auth";

// ---------- Login ----------
export async function signIn(
  _prev: { error?: string; email?: string },
  formData: FormData,
): Promise<{ error?: string; email?: string }> {
  const email = String(formData.get("email") ?? "");
  const ok = await checkCredentials(email, String(formData.get("password") ?? ""));
  if (!ok) return { error: "E-mail ou senha incorretos.", email };
  await createSession();
  redirect("/admin");
}

export async function signOut() {
  await destroySession();
  redirect("/admin/login");
}

// ---------- Agendamentos ----------
export async function setAppointmentStatus(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id"));
  const status = String(formData.get("status"));
  if (!["pendente", "confirmado", "concluido", "cancelado"].includes(status)) return;
  await sql`update appointments set status = ${status} where id = ${id}`;
  revalidatePath("/admin");
}

export async function createManualAppointment(
  _prev: { error?: string },
  formData: FormData,
): Promise<{ error?: string }> {
  await requireAdmin();
  const serviceId = String(formData.get("serviceId"));
  const date = String(formData.get("date"));
  const time = String(formData.get("time"));
  const name = String(formData.get("name") ?? "").trim();
  if (!serviceId || !date || !time || name.length < 2) {
    return { error: "Preencha serviço, data, hora e nome." };
  }
  const [service] = await sql<{ id: string; name: string; duration_minutes: number }[]>`
    select id, name, duration_minutes from services where id = ${serviceId}`;
  if (!service) return { error: "Serviço não encontrado." };

  const start = new Date(`${date}T${time}:00-03:00`);
  if (Number.isNaN(start.getTime())) return { error: "Data/hora inválida." };
  const end = new Date(start.getTime() + service.duration_minutes * 60_000);

  try {
    await sql`
      insert into appointments
        (service_id, service_name, customer_name, customer_phone, address, notes,
         starts_at, ends_at, status, source)
      values
        (${service.id}, ${service.name}, ${name},
         ${String(formData.get("phone") ?? "").trim()},
         ${String(formData.get("address") ?? "").trim()},
         ${String(formData.get("notes") ?? "").trim()},
         ${start}, ${end}, 'confirmado', 'manual')`;
  } catch (e) {
    return {
      error:
        (e as { code?: string }).code === "23P01"
          ? "Já existe um agendamento nesse horário."
          : "Não foi possível salvar.",
    };
  }
  revalidatePath("/admin");
  redirect("/admin");
}

// ---------- Serviços ----------
export async function saveService(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const duration = Math.min(480, Math.max(15, Number(formData.get("duration")) || 60));
  const active = formData.get("active") === "on";
  if (!name) return;
  if (id) {
    await sql`update services set name = ${name}, description = ${description},
      duration_minutes = ${duration}, active = ${active} where id = ${id}`;
  } else {
    await sql`insert into services (name, description, duration_minutes, active, sort_order)
      values (${name}, ${description}, ${duration}, ${active},
        (select coalesce(max(sort_order), 0) + 1 from services))`;
  }
  revalidatePath("/admin/servicos");
  revalidatePath("/");
}

// ---------- Horários ----------
export async function addWorkingHours(formData: FormData) {
  await requireAdmin();
  const start = String(formData.get("start"));
  const end = String(formData.get("end"));
  if (!start || !end || end <= start) return;
  const days = formData.getAll("weekday").map(Number).filter((d) => d >= 0 && d <= 6);
  for (const weekday of days) {
    await sql`insert into working_hours (weekday, start_time, end_time)
      values (${weekday}, ${start}, ${end})`;
  }
  revalidatePath("/admin/horarios");
}

export async function deleteWorkingHours(formData: FormData) {
  await requireAdmin();
  await sql`delete from working_hours where id = ${String(formData.get("id"))}`;
  revalidatePath("/admin/horarios");
}

export async function addTimeOff(formData: FormData) {
  await requireAdmin();
  const from = String(formData.get("from"));
  const to = String(formData.get("to") || from);
  if (!from) return;
  const starts = new Date(`${from}T00:00:00-03:00`);
  const ends = new Date(new Date(`${to}T00:00:00-03:00`).getTime() + 86_400_000);
  if (Number.isNaN(starts.getTime()) || ends <= starts) return;
  await sql`insert into time_off (starts_at, ends_at, reason)
    values (${starts}, ${ends}, ${String(formData.get("reason") ?? "").trim()})`;
  revalidatePath("/admin/horarios");
}

export async function deleteTimeOff(formData: FormData) {
  await requireAdmin();
  await sql`delete from time_off where id = ${String(formData.get("id"))}`;
  revalidatePath("/admin/horarios");
}

// ---------- Orçamentos ----------
export async function createQuote(
  _prev: { error?: string },
  formData: FormData,
): Promise<{ error?: string }> {
  await requireAdmin();
  const descs = formData.getAll("desc").map((v) => String(v).trim());
  const qtys = formData.getAll("qty").map((v) => Number(String(v).replace(",", ".")));
  const prices = formData.getAll("price").map((v) => Number(String(v).replace(",", ".")));
  const items = descs
    .map((description, i) => ({
      description,
      quantity: qtys[i] > 0 ? qtys[i] : 1,
      unit_price: prices[i] >= 0 ? prices[i] : 0,
      position: i,
    }))
    .filter((it) => it.description);

  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "Informe o nome do cliente." };
  if (items.length === 0) return { error: "Adicione pelo menos um item." };

  const num = (k: string) =>
    Math.max(0, Number(String(formData.get(k) ?? "0").replace(",", ".")) || 0);
  const text = (k: string) => String(formData.get(k) ?? "").trim();
  const validUntil = text("valid_until");

  const id = crypto.randomUUID();
  try {
    await sql.begin(async (tx) => {
      await tx`
        insert into quotes
          (id, customer_name, customer_phone, customer_email, customer_document,
           address, zip, neighborhood, city, state, discount, surcharge, notes, valid_until)
        values
          (${id}, ${name}, ${text("phone")}, ${text("email")}, ${text("document")},
           ${text("address")}, ${text("zip")}, ${text("neighborhood")}, ${text("city")},
           ${text("state") || "PR"}, ${num("discount")}, ${num("surcharge")}, ${text("notes")},
           ${validUntil || new Date(Date.now() + 15 * 86_400_000).toISOString().slice(0, 10)})`;
      for (const it of items) {
        await tx`
          insert into quote_items (quote_id, position, description, quantity, unit_price)
          values (${id}, ${it.position}, ${it.description}, ${it.quantity}, ${it.unit_price})`;
      }
    });
  } catch {
    return { error: "Não foi possível salvar o orçamento." };
  }
  revalidatePath("/admin/orcamentos");
  redirect(`/admin/orcamentos/${id}`);
}

export async function setQuoteStatus(formData: FormData) {
  await requireAdmin();
  const status = String(formData.get("status"));
  if (!["rascunho", "enviado", "aprovado", "recusado"].includes(status)) return;
  const id = String(formData.get("id"));
  await sql`update quotes set status = ${status} where id = ${id}`;
  revalidatePath(`/admin/orcamentos/${id}`);
  revalidatePath("/admin/orcamentos");
}

export async function deleteQuote(formData: FormData) {
  await requireAdmin();
  await sql`delete from quotes where id = ${String(formData.get("id"))}`;
  revalidatePath("/admin/orcamentos");
  redirect("/admin/orcamentos");
}
