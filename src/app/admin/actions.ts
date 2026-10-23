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
  revalidatePath("/admin/agenda");
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
  revalidatePath("/admin/agenda");
  redirect("/admin/agenda");
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
const UUID_RE = /^[0-9a-f-]{36}$/i;

type QuoteItemInput = {
  description: string;
  quantity: number;
  unit_price: number;
  position: number;
  catalog: boolean;
};

const toNumber = (v: FormDataEntryValue | null | undefined) =>
  Number(String(v ?? "0").replace(/\./g, "").replace(",", ".")) || 0;
// aceita "1.250,50", "1250,50" e "1250.50"
function parseMoney(v: FormDataEntryValue | null | undefined) {
  const raw = String(v ?? "").trim();
  if (!raw) return 0;
  const n = raw.includes(",") ? toNumber(raw) : Number(raw) || 0;
  return Math.max(0, Math.round(n * 100) / 100);
}

function parseQuoteForm(fd: FormData) {
  const descs = fd.getAll("desc").map((v) => String(v).trim());
  const qtys = fd.getAll("qty").map((v) => {
    const n = Number(String(v).replace(",", "."));
    return n > 0 ? n : 1;
  });
  const prices = fd.getAll("price").map((v) => parseMoney(v));
  const cats = fd.getAll("cat").map((v) => String(v) === "1");
  const items: QuoteItemInput[] = descs
    .map((description, i) => ({
      description: description.slice(0, 300),
      quantity: qtys[i] ?? 1,
      unit_price: prices[i] ?? 0,
      position: i,
      catalog: cats[i] ?? false,
    }))
    .filter((it) => it.description)
    .slice(0, 80);

  const text = (k: string, max = 200) => String(fd.get(k) ?? "").trim().slice(0, max);
  const name = text("name", 120);
  if (!name) return { error: "Informe o nome do cliente." } as const;
  if (items.length === 0) return { error: "Adicione pelo menos um item." } as const;

  const validUntil = text("valid_until", 10);
  return {
    data: {
      name,
      phone: text("phone", 30),
      email: text("email", 120),
      document: text("document", 30),
      address: text("address"),
      zip: text("zip", 12),
      neighborhood: text("neighborhood", 80),
      city: text("city", 80),
      state: text("state", 2) || "PR",
      discount: parseMoney(fd.get("discount")),
      surcharge: parseMoney(fd.get("surcharge")),
      notes: text("notes", 1000),
      validUntil: /^\d{4}-\d{2}-\d{2}$/.test(validUntil) ? validUntil : null,
      items,
    },
  } as const;
}

// cria (sem id) ou atualiza (com id) um orçamento
export async function saveQuote(
  _prev: { error?: string },
  formData: FormData,
): Promise<{ error?: string }> {
  await requireAdmin();
  const parsed = parseQuoteForm(formData);
  if ("error" in parsed) return { error: parsed.error };
  const q = parsed.data;

  const rawId = String(formData.get("id") ?? "");
  const editing = UUID_RE.test(rawId);
  const rawAppt = String(formData.get("appointment_id") ?? "");
  const apptId = UUID_RE.test(rawAppt) ? rawAppt : null;
  const id = editing ? rawId : crypto.randomUUID();
  const defaultValid = new Date(Date.now() + 15 * 86_400_000).toISOString().slice(0, 10);

  try {
    await sql.begin(async (tx) => {
      if (editing) {
        const done = await tx`
          update quotes set
            customer_name = ${q.name}, customer_phone = ${q.phone}, customer_email = ${q.email},
            customer_document = ${q.document}, address = ${q.address}, zip = ${q.zip},
            neighborhood = ${q.neighborhood}, city = ${q.city}, state = ${q.state},
            discount = ${q.discount}, surcharge = ${q.surcharge}, notes = ${q.notes},
            valid_until = coalesce(${q.validUntil}::date, valid_until)
          where id = ${id} returning id`;
        if (done.length === 0) throw new Error("not-found");
        await tx`delete from quote_items where quote_id = ${id}`;
      } else {
        await tx`
          insert into quotes
            (id, customer_name, customer_phone, customer_email, customer_document,
             address, zip, neighborhood, city, state, discount, surcharge, notes,
             valid_until, appointment_id)
          values
            (${id}, ${q.name}, ${q.phone}, ${q.email}, ${q.document}, ${q.address}, ${q.zip},
             ${q.neighborhood}, ${q.city}, ${q.state}, ${q.discount}, ${q.surcharge}, ${q.notes},
             ${q.validUntil ?? defaultValid}, ${apptId})`;
      }
      for (const it of q.items) {
        await tx`
          insert into quote_items (quote_id, position, description, quantity, unit_price)
          values (${id}, ${it.position}, ${it.description}, ${it.quantity}, ${it.unit_price})`;
        if (it.catalog) {
          await tx`
            insert into quote_catalog (description, unit_price)
            values (${it.description}, ${it.unit_price})
            on conflict (description) do update set unit_price = excluded.unit_price`;
        }
      }
    });
  } catch {
    return { error: "Não foi possível salvar o orçamento." };
  }
  revalidatePath("/admin/orcamentos");
  revalidatePath(`/admin/orcamentos/${id}`);
  redirect(`/admin/orcamentos/${id}`);
}

export async function setQuoteStatus(formData: FormData) {
  await requireAdmin();
  const status = String(formData.get("status"));
  if (!["rascunho", "enviado", "aprovado", "recusado"].includes(status)) return;
  const id = String(formData.get("id"));
  if (!UUID_RE.test(id)) return;
  await sql`update quotes set status = ${status} where id = ${id}`;
  revalidatePath(`/admin/orcamentos/${id}`);
  revalidatePath("/admin/orcamentos");
}

// ao enviar pelo WhatsApp: rascunho vira "enviado" (não mexe em aprovado/recusado)
export async function markQuoteSent(id: string) {
  await requireAdmin();
  if (!UUID_RE.test(id)) return;
  await sql`update quotes set status = 'enviado' where id = ${id} and status = 'rascunho'`;
  revalidatePath(`/admin/orcamentos/${id}`);
  revalidatePath("/admin/orcamentos");
}

export async function deleteQuote(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id"));
  if (UUID_RE.test(id)) await sql`delete from quotes where id = ${id}`;
  revalidatePath("/admin/orcamentos");
  redirect("/admin/orcamentos");
}

export async function deleteCatalogItem(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id"));
  if (UUID_RE.test(id)) await sql`delete from quote_catalog where id = ${id}`;
  revalidatePath("/admin/orcamentos/novo");
}
