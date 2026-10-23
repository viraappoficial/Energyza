"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/admin/login");
  return supabase;
}

// ---------- Login ----------
export async function signIn(
  _prev: { error?: string },
  formData: FormData,
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: String(formData.get("email") ?? ""),
    password: String(formData.get("password") ?? ""),
  });
  if (error) return { error: "E-mail ou senha incorretos." };
  redirect("/admin");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/admin/login");
}

// ---------- Agendamentos ----------
export async function setAppointmentStatus(formData: FormData) {
  const supabase = await requireUser();
  const id = String(formData.get("id"));
  const status = String(formData.get("status"));
  if (!["pendente", "confirmado", "concluido", "cancelado"].includes(status)) return;
  await supabase.from("appointments").update({ status }).eq("id", id);
  revalidatePath("/admin");
}

export async function createManualAppointment(
  _prev: { error?: string },
  formData: FormData,
): Promise<{ error?: string }> {
  const supabase = await requireUser();
  const serviceId = String(formData.get("serviceId"));
  const date = String(formData.get("date"));
  const time = String(formData.get("time"));
  const name = String(formData.get("name") ?? "").trim();
  if (!serviceId || !date || !time || name.length < 2) {
    return { error: "Preencha serviço, data, hora e nome." };
  }
  const { data: service } = await supabase
    .from("services")
    .select("id,name,duration_minutes")
    .eq("id", serviceId)
    .single();
  if (!service) return { error: "Serviço não encontrado." };

  const start = new Date(`${date}T${time}:00-03:00`);
  if (Number.isNaN(start.getTime())) return { error: "Data/hora inválida." };
  const end = new Date(start.getTime() + service.duration_minutes * 60_000);

  const { error } = await supabase.from("appointments").insert({
    service_id: service.id,
    service_name: service.name,
    customer_name: name,
    customer_phone: String(formData.get("phone") ?? "").trim(),
    address: String(formData.get("address") ?? "").trim(),
    notes: String(formData.get("notes") ?? "").trim(),
    starts_at: start.toISOString(),
    ends_at: end.toISOString(),
    status: "confirmado",
    source: "manual",
  });
  if (error) {
    return {
      error:
        error.code === "23P01"
          ? "Já existe um agendamento nesse horário."
          : "Não foi possível salvar.",
    };
  }
  revalidatePath("/admin");
  redirect("/admin");
}

// ---------- Serviços ----------
export async function saveService(formData: FormData) {
  const supabase = await requireUser();
  const id = String(formData.get("id") ?? "");
  const row = {
    name: String(formData.get("name") ?? "").trim(),
    description: String(formData.get("description") ?? "").trim(),
    duration_minutes: Number(formData.get("duration")) || 60,
    active: formData.get("active") === "on",
  };
  if (!row.name) return;
  if (id) await supabase.from("services").update(row).eq("id", id);
  else await supabase.from("services").insert(row);
  revalidatePath("/admin/servicos");
  revalidatePath("/");
}

// ---------- Horários ----------
export async function addWorkingHours(formData: FormData) {
  const supabase = await requireUser();
  const start = String(formData.get("start"));
  const end = String(formData.get("end"));
  if (end <= start) return;
  const days = formData.getAll("weekday").map(Number);
  if (days.length === 0) return;
  await supabase
    .from("working_hours")
    .insert(days.map((weekday) => ({ weekday, start_time: start, end_time: end })));
  revalidatePath("/admin/horarios");
}

export async function deleteWorkingHours(formData: FormData) {
  const supabase = await requireUser();
  await supabase.from("working_hours").delete().eq("id", String(formData.get("id")));
  revalidatePath("/admin/horarios");
}

export async function addTimeOff(formData: FormData) {
  const supabase = await requireUser();
  const from = String(formData.get("from"));
  const to = String(formData.get("to") || from);
  if (!from) return;
  const starts = new Date(`${from}T00:00:00-03:00`);
  const ends = new Date(new Date(`${to}T00:00:00-03:00`).getTime() + 86_400_000);
  if (ends <= starts) return;
  await supabase.from("time_off").insert({
    starts_at: starts.toISOString(),
    ends_at: ends.toISOString(),
    reason: String(formData.get("reason") ?? "").trim(),
  });
  revalidatePath("/admin/horarios");
}

export async function deleteTimeOff(formData: FormData) {
  const supabase = await requireUser();
  await supabase.from("time_off").delete().eq("id", String(formData.get("id")));
  revalidatePath("/admin/horarios");
}

// ---------- Orçamentos ----------
export async function createQuote(
  _prev: { error?: string },
  formData: FormData,
): Promise<{ error?: string }> {
  const supabase = await requireUser();
  const descs = formData.getAll("desc").map((v) => String(v).trim());
  const qtys = formData.getAll("qty").map(Number);
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

  const num = (k: string) => Math.max(0, Number(String(formData.get(k) ?? "0").replace(",", ".")) || 0);
  const text = (k: string) => String(formData.get(k) ?? "").trim();

  const { data: quote, error } = await supabase
    .from("quotes")
    .insert({
      customer_name: name,
      customer_phone: text("phone"),
      customer_email: text("email"),
      customer_document: text("document"),
      address: text("address"),
      zip: text("zip"),
      neighborhood: text("neighborhood"),
      city: text("city"),
      state: text("state") || "PR",
      discount: num("discount"),
      surcharge: num("surcharge"),
      notes: text("notes"),
      valid_until: text("valid_until") || undefined,
    })
    .select("id")
    .single();
  if (error || !quote) return { error: "Não foi possível salvar o orçamento." };

  const { error: itemsError } = await supabase
    .from("quote_items")
    .insert(items.map((it) => ({ ...it, quote_id: quote.id })));
  if (itemsError) {
    await supabase.from("quotes").delete().eq("id", quote.id);
    return { error: "Não foi possível salvar os itens." };
  }
  revalidatePath("/admin/orcamentos");
  redirect(`/admin/orcamentos/${quote.id}`);
}

export async function setQuoteStatus(formData: FormData) {
  const supabase = await requireUser();
  const status = String(formData.get("status"));
  if (!["rascunho", "enviado", "aprovado", "recusado"].includes(status)) return;
  const id = String(formData.get("id"));
  await supabase.from("quotes").update({ status }).eq("id", id);
  revalidatePath(`/admin/orcamentos/${id}`);
  revalidatePath("/admin/orcamentos");
}

export async function deleteQuote(formData: FormData) {
  const supabase = await requireUser();
  await supabase.from("quotes").delete().eq("id", String(formData.get("id")));
  revalidatePath("/admin/orcamentos");
  redirect("/admin/orcamentos");
}
