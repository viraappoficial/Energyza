"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { sql } from "@/lib/db";
import { dayKey } from "@/lib/dates";
import { MAX_UPLOAD, MAX_WORKS, normalizePhoto } from "@/lib/works";
import { prepareMedia } from "@/lib/media";
import { notifyOwner, pushConfigured } from "@/lib/push";
import { loadQuotePdf, quoteFileName } from "@/lib/quote-load";
import { chatIdOf, friendlyError, sendFile, sendText, sendVoice, wahaConfigured } from "@/lib/waha";
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
  // pagamento já recebido e serviço já feito (só em orçamento novo)
  const serviceDone = !editing && formData.get("service_done") === "1";
  const subtotal = q.items.reduce((acc, it) => acc + it.quantity * it.unit_price, 0);
  const total = Math.max(0, Math.round((subtotal - q.discount + q.surcharge) * 100) / 100);
  const payMode = String(formData.get("pay_mode") ?? "none");
  const paid = editing ? 0 : payMode === "all" ? total : payMode === "part" ? Math.min(parseMoney(formData.get("pay_amount")), total) : 0;
  const payDate = parseDay(formData.get("pay_date"));
  const payMethod = parseMethod(formData.get("pay_method"));
  const dueRaw = String(formData.get("due_date") ?? "");
  const dueDate = /^\d{4}-\d{2}-\d{2}$/.test(dueRaw) ? dueRaw : null;

  try {
    await sql.begin(async (tx) => {
      if (editing) {
        const done = await tx`
          update quotes set
            customer_name = ${q.name}, customer_phone = ${q.phone}, customer_email = ${q.email},
            customer_document = ${q.document}, address = ${q.address}, zip = ${q.zip},
            neighborhood = ${q.neighborhood}, city = ${q.city}, state = ${q.state},
            discount = ${q.discount}, surcharge = ${q.surcharge}, notes = ${q.notes},
            valid_until = coalesce(${q.validUntil}::date, valid_until), due_date = ${dueDate}::date
          where id = ${id} returning id`;
        if (done.length === 0) throw new Error("not-found");
        await tx`delete from quote_items where quote_id = ${id}`;
      } else {
        await tx`
          insert into quotes
            (id, customer_name, customer_phone, customer_email, customer_document,
             address, zip, neighborhood, city, state, discount, surcharge, notes,
             valid_until, appointment_id, status, completed_at, due_date)
          values
            (${id}, ${q.name}, ${q.phone}, ${q.email}, ${q.document}, ${q.address}, ${q.zip},
             ${q.neighborhood}, ${q.city}, ${q.state}, ${q.discount}, ${q.surcharge}, ${q.notes},
             ${q.validUntil ?? defaultValid}, ${apptId},
             ${serviceDone ? "concluido" : "rascunho"}, ${serviceDone ? dayKey(new Date()) : null}, ${dueDate})`;
        if (paid > 0) {
          await tx`
            insert into quote_payments (quote_id, amount, paid_at, method)
            values (${id}, ${paid}, ${payDate}::date, ${payMethod})`;
        }
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
  revalidatePath("/admin/caixa");
  redirect(`/admin/orcamentos/${id}`);
}

// data "AAAA-MM-DD" válida ou hoje (Brasília)
function parseDay(v: FormDataEntryValue | null | undefined) {
  const t = String(v ?? "").trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(t) ? t : dayKey(new Date());
}
const METHODS = ["pix", "dinheiro", "cartao", "transferencia", "outro"];
const parseMethod = (v: FormDataEntryValue | null | undefined) => (METHODS.includes(String(v)) ? String(v) : "");

function revalidateQuote(id: string) {
  revalidatePath(`/admin/orcamentos/${id}`);
  revalidatePath("/admin/orcamentos");
  revalidatePath("/admin/caixa");
  revalidatePath("/admin");
}

export async function setQuoteStatus(formData: FormData) {
  await requireAdmin();
  const status = String(formData.get("status"));
  if (!["rascunho", "enviado", "aprovado", "concluido", "recusado"].includes(status)) return;
  const id = String(formData.get("id"));
  if (!UUID_RE.test(id)) return;
  // concluído = serviço feito (data de hoje, se ainda não tinha). O dinheiro em caixa vem dos pagamentos.
  await sql`
    update quotes set status = ${status},
      completed_at = case when ${status} = 'concluido' then coalesce(completed_at, ${dayKey(new Date())}::date) else null end
    where id = ${id}`;
  revalidateQuote(id);
}

// quanto ainda falta o cliente pagar neste orçamento
async function remainingOf(id: string) {
  const [r] = await sql<{ remaining: number }[]>`
    select (greatest(0, coalesce((select sum(quantity * unit_price) from quote_items where quote_id = ${id}), 0) - discount + surcharge)
      - coalesce((select sum(amount) from quote_payments where quote_id = ${id}), 0))::float8 as remaining
    from quotes where id = ${id}`;
  return Math.max(0, Math.round((r?.remaining ?? 0) * 100) / 100);
}

// "Serviço feito": marca como concluído e, se o cliente pagou o saldo agora, registra o pagamento
export async function concludeQuote(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id"));
  if (!UUID_RE.test(id)) return;
  const date = parseDay(formData.get("date"));
  const done = await sql`
    update quotes set status = 'concluido', completed_at = ${date}::date
    where id = ${id} and status <> 'recusado' returning id`;
  if (done.length && formData.get("pay_rest") === "1") {
    const rest = await remainingOf(id);
    if (rest > 0) {
      await sql`insert into quote_payments (quote_id, amount, paid_at, method) values (${id}, ${rest}, ${date}::date, ${parseMethod(formData.get("method"))})`;
    }
  }
  revalidateQuote(id);
}

// registra um pagamento (sinal, parcela ou saldo); nunca passa do que falta
export async function addPayment(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id"));
  if (!UUID_RE.test(id)) return;
  const amount = Math.min(parseMoney(formData.get("amount")), await remainingOf(id));
  if (amount <= 0) return;
  await sql`
    insert into quote_payments (quote_id, amount, paid_at, method)
    values (${id}, ${amount}, ${parseDay(formData.get("date"))}::date, ${parseMethod(formData.get("method"))})`;
  revalidateQuote(id);
}

export async function deletePayment(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id"));
  const quoteId = String(formData.get("quote_id"));
  if (!UUID_RE.test(id) || !UUID_RE.test(quoteId)) return;
  await sql`delete from quote_payments where id = ${id} and quote_id = ${quoteId}`;
  revalidateQuote(quoteId);
}

// quando o cliente vai pagar o que falta (previsão)
export async function setQuoteDue(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id"));
  if (!UUID_RE.test(id)) return;
  const raw = String(formData.get("due") ?? "");
  await sql`update quotes set due_date = ${/^\d{4}-\d{2}-\d{2}$/.test(raw) ? raw : null}::date where id = ${id}`;
  revalidateQuote(id);
}

// ---------- Despesas (saídas do caixa) ----------
const EXPENSE_CATEGORIES = ["material", "combustivel", "ferramenta", "imposto", "ajudante", "outros"];

export async function addExpense(
  _prev: { error?: string; ok?: boolean },
  formData: FormData,
): Promise<{ error?: string; ok?: boolean }> {
  await requireAdmin();
  const description = String(formData.get("description") ?? "").trim().slice(0, 160);
  const category = String(formData.get("category") ?? "");
  const amount = parseMoney(formData.get("amount"));
  if (!description) return { error: "Descreva a despesa." };
  if (amount <= 0) return { error: "Informe o valor." };
  try {
    await sql`
      insert into expenses (day, category, description, amount)
      values (${parseDay(formData.get("day"))}::date, ${EXPENSE_CATEGORIES.includes(category) ? category : "outros"}, ${description}, ${amount})`;
  } catch {
    return { error: "Não foi possível salvar." };
  }
  revalidatePath("/admin/caixa");
  return { ok: true };
}

export async function deleteExpense(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id"));
  if (UUID_RE.test(id)) await sql`delete from expenses where id = ${id}`;
  revalidatePath("/admin/caixa");
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
  revalidatePath("/admin/caixa");
  revalidatePath("/admin/orcamentos");
  redirect("/admin/orcamentos");
}

export async function deleteCatalogItem(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id"));
  if (UUID_RE.test(id)) await sql`delete from quote_catalog where id = ${id}`;
  revalidatePath("/admin/orcamentos/novo");
}

// ---------- Tráfego (gasto lançado à mão) ----------
export async function addManualSpend(
  _prev: { error?: string; ok?: boolean },
  formData: FormData,
): Promise<{ error?: string; ok?: boolean }> {
  await requireAdmin();
  const day = String(formData.get("day") ?? "");
  const channel = String(formData.get("channel") ?? "");
  const campaign = String(formData.get("campaign") ?? "").trim().slice(0, 120);
  const amount = parseMoney(formData.get("amount"));
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return { error: "Escolha a data." };
  if (!["google", "meta", "outro"].includes(channel)) return { error: "Escolha o canal." };
  if (amount <= 0) return { error: "Informe o valor gasto." };
  try {
    // o mesmo dia/canal/campanha soma ao que já foi lançado
    await sql`
      insert into ad_costs (day, channel, campaign_id, campaign_name, cost, origin)
      values (${day}, ${channel}, ${campaign.toLowerCase()}, ${campaign}, ${amount}, 'manual')
      on conflict (day, channel, campaign_id, origin) do update set cost = ad_costs.cost + excluded.cost, synced_at = now()`;
  } catch {
    return { error: "Não foi possível salvar." };
  }
  revalidatePath("/admin/trafego");
  return { ok: true };
}

export async function deleteManualSpend(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id"));
  if (UUID_RE.test(id)) await sql`delete from ad_costs where id = ${id} and origin = 'manual'`;
  revalidatePath("/admin/trafego");
}


// ---------- WhatsApp (WAHA) ----------
const MAX_FILE = 4_000_000;

export type ChatState = { error?: string; ok?: number };

// Envia texto e/ou arquivo para uma conversa. O WAHA devolve o webhook da própria mensagem (message.any),
// então só gravamos aqui quando o id vem na resposta (o webhook ignora o que já existe).
export async function sendWhatsApp(_prev: ChatState, formData: FormData): Promise<ChatState> {
  await requireAdmin();
  if (!wahaConfigured()) return { error: "WhatsApp ainda não configurado (WAHA_URL e WAHA_API_KEY)." };
  const chatId = String(formData.get("chatId") ?? "");
  const quoteId = String(formData.get("quoteId") ?? "");
  const text = String(formData.get("text") ?? "").trim().slice(0, 4000);
  const upload = formData.get("file");
  const hasUpload = upload instanceof File && upload.size > 0;
  const isVoice = formData.get("voice") === "1" && hasUpload && upload.type.startsWith("audio/");
  if (!chatId || (!text && !hasUpload && !quoteId)) return { error: "Escreva uma mensagem ou escolha um arquivo." };
  if (hasUpload && upload.size > MAX_FILE) return { error: "Arquivo grande demais (máximo 4 MB)." };

  try {
    // o que vai como anexo: um orçamento do sistema (PDF gerado agora) ou o arquivo escolhido
    let attach: { buf: Buffer; mime: string; name: string } | null = null;
    let sentQuote: string | null = null;
    if (quoteId) {
      if (!UUID_RE.test(quoteId)) return { error: "Orçamento inválido." };
      const q = await loadQuotePdf(quoteId);
      if (!q) return { error: "Orçamento não encontrado." };
      attach = { buf: Buffer.from(q.bytes), mime: "application/pdf", name: quoteFileName(q.number) };
      sentQuote = quoteId;
    } else if (hasUpload) {
      const raw = Buffer.from(await upload.arrayBuffer());
      const mime0 = upload.type || "application/octet-stream";
      if (mime0.startsWith("image/") && mime0 !== "image/gif") {
        // foto: reduz antes de enviar e de guardar (o WhatsApp também comprime)
        const prep = await prepareMedia(raw, mime0, "jpeg");
        attach = "data" in prep
          ? { buf: prep.data, mime: prep.mime, name: upload.name.replace(/\.[^.]+$/, "") + ".jpg" }
          : { buf: raw, mime: mime0, name: upload.name };
      } else {
        attach = { buf: raw, mime: mime0, name: upload.name };
      }
    }

    let id: string | null;
    let mediaId: string | null = null;
    if (attach) {
      const payload = { mimetype: attach.mime, filename: attach.name, data: attach.buf.toString("base64") };
      id = isVoice ? await sendVoice(chatId, payload) : await sendFile(chatId, payload, text);
      const [row] = await sql<{ id: string }[]>`insert into wa_media (mime, name, data) values (${attach.mime}, ${attach.name}, ${attach.buf}) returning id`;
      mediaId = row.id;
    } else {
      id = await sendText(chatId, text);
    }
    // orçamento enviado deixa de ser rascunho
    if (sentQuote) await sql`update quotes set status = 'enviado' where id = ${sentQuote} and status = 'rascunho'`;
    if (id) {
      await sql.begin(async (tx) => {
        const ins = await tx`
          insert into wa_messages (id, chat_id, from_me, body, has_media, media_id, media_mime, media_name)
          values (${id}, ${chatId}, true, ${text}, ${!!attach}, ${mediaId}, ${attach?.mime ?? ""}, ${attach?.name ?? ""})
          on conflict (id) do update set
            media_id = excluded.media_id, media_mime = excluded.media_mime, media_name = excluded.media_name, media_note = ''
          where wa_messages.media_id is null and excluded.media_id is not null
          returning id`;
        if (ins.length) {
          await tx`update wa_chats set last_body = ${text || (isVoice ? "🎤 Áudio" : "📎 Arquivo")}, last_at = now() where chat_id = ${chatId}`;
        }
      });
    }
  } catch (e) {
    console.error("[whatsapp] falha ao enviar:", (e as Error).message);
    return { error: friendlyError(e) };
  }
  revalidatePath("/admin/conversas");
  revalidatePath("/admin/orcamentos");
  return { ok: Date.now() };
}

// Abre (ou cria) uma conversa a partir de um telefone
export async function startChat(_prev: { error?: string }, formData: FormData): Promise<{ error?: string }> {
  await requireAdmin();
  let digits = String(formData.get("phone") ?? "").replace(/\D/g, "");
  if (digits.length < 10) return { error: "Informe o telefone com DDD." };
  if (!digits.startsWith("55")) digits = "55" + digits;
  if (!wahaConfigured()) return { error: "WhatsApp ainda não configurado." };
  let chatId: string;
  try {
    chatId = await chatIdOf(digits);
  } catch (e) {
    return { error: friendlyError(e) };
  }
  await sql`insert into wa_chats (chat_id, phone, last_body) values (${chatId}, ${digits}, '') on conflict (chat_id) do nothing`;
  redirect(`/admin/conversas/${encodeURIComponent(chatId)}`);
}


// ---------- Notificações no celular (Web Push) ----------
export async function savePushSubscription(sub: { endpoint: string; keys: { p256dh: string; auth: string } }, userAgent: string) {
  await requireAdmin();
  const ok = typeof sub?.endpoint === "string" && sub.endpoint.startsWith("https://") && sub.endpoint.length < 1000
    && typeof sub.keys?.p256dh === "string" && typeof sub.keys?.auth === "string";
  if (!ok) return { ok: false as const, error: "Aparelho inválido." };
  await sql`
    insert into push_subscriptions (endpoint, p256dh, auth, user_agent)
    values (${sub.endpoint}, ${sub.keys.p256dh}, ${sub.keys.auth}, ${String(userAgent).slice(0, 200)})
    on conflict (endpoint) do update set p256dh = excluded.p256dh, auth = excluded.auth, user_agent = excluded.user_agent`;
  return { ok: true as const };
}

export async function removePushSubscription(endpoint: string) {
  await requireAdmin();
  await sql`delete from push_subscriptions where endpoint = ${String(endpoint)}`;
}

export async function sendTestPush() {
  await requireAdmin();
  if (!pushConfigured()) return { error: "Notificações ainda não configuradas no servidor." };
  const r = await notifyOwner({ title: "Energyza", body: "Teste: as notificações estão funcionando.", url: "/admin", tag: "teste" });
  return r.sent > 0 ? { ok: true as const } : { error: "Nenhum aparelho recebeu. Ative as notificações de novo neste aparelho." };
}


// ---------- Trabalhos realizados (galeria do site) ----------
export type WorkState = { error?: string; ok?: number };

const refreshWorks = () => {
  revalidatePath("/");
  revalidatePath("/admin/trabalhos");
};

async function readPhoto(formData: FormData) {
  const f = formData.get("image");
  if (!(f instanceof File) || f.size === 0) return null;
  if (f.size > MAX_UPLOAD) throw new Error("grande");
  return normalizePhoto(Buffer.from(await f.arrayBuffer()));
}

const cleanTitle = (v: FormDataEntryValue | null) => String(v ?? "").trim().slice(0, 80);
const cleanDesc = (v: FormDataEntryValue | null) => String(v ?? "").trim().slice(0, 160);

// Cria (sem id) ou edita (com id) um trabalho. Foto obrigatória só ao criar.
export async function saveWork(_prev: WorkState, formData: FormData): Promise<WorkState> {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const editing = UUID_RE.test(id);
  const title = cleanTitle(formData.get("title"));
  const description = cleanDesc(formData.get("description"));
  if (title.length < 3) return { error: "Escreva um título (mínimo 3 letras)." };

  let photo: Awaited<ReturnType<typeof readPhoto>>;
  try {
    photo = await readPhoto(formData);
  } catch (e) {
    return { error: (e as Error).message === "grande" ? "Foto grande demais (máximo 4 MB)." : "Não foi possível ler essa foto. Use uma imagem JPG, PNG ou WebP." };
  }

  if (editing) {
    if (photo) {
      await sql`update works set title = ${title}, description = ${description}, image_data = ${photo.data}, image_mime = ${photo.mime}, static_src = null, updated_at = now() where id = ${id}`;
    } else {
      await sql`update works set title = ${title}, description = ${description} where id = ${id}`;
    }
  } else {
    if (!photo) return { error: "Escolha uma foto." };
    const [{ n }] = await sql<{ n: number }[]>`select count(*)::int as n from works`;
    if (n >= MAX_WORKS) return { error: `Limite de ${MAX_WORKS} trabalhos. Apague algum antes de adicionar.` };
    // entra no fim da fila
    await sql`
      insert into works (title, description, image_data, image_mime, sort_order)
      values (${title}, ${description}, ${photo.data}, ${photo.mime}, (select coalesce(max(sort_order), 0) + 1 from works))`;
  }
  refreshWorks();
  return { ok: Date.now() };
}

export async function toggleWork(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id"));
  if (UUID_RE.test(id)) await sql`update works set active = not active where id = ${id}`;
  refreshWorks();
}

export async function deleteWork(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id"));
  if (UUID_RE.test(id)) await sql`delete from works where id = ${id}`;
  refreshWorks();
}

// troca a posição com o vizinho (dir = up | down)
export async function moveWork(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id"));
  const dir = String(formData.get("dir"));
  if (!UUID_RE.test(id) || (dir !== "up" && dir !== "down")) return;
  await sql.begin(async (tx) => {
    const rows = await tx<{ id: string }[]>`select id from works order by sort_order, created_at`;
    const i = rows.findIndex((r) => r.id === id);
    const j = dir === "up" ? i - 1 : i + 1;
    if (i < 0 || j < 0 || j >= rows.length) return;
    [rows[i], rows[j]] = [rows[j], rows[i]];
    // renumera a lista inteira (evita empates)
    for (let k = 0; k < rows.length; k++) await tx`update works set sort_order = ${k + 1} where id = ${rows[k].id}`;
  });
  refreshWorks();
}
