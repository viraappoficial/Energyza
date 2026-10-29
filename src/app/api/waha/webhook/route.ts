import { createHmac, timingSafeEqual } from "node:crypto";
import { sql } from "@/lib/db";
import { after } from "next/server";
import { notifyOwner } from "@/lib/push";
import { downloadMedia, isOwnerChat, messageMediaUrl, wahaConfigured } from "@/lib/waha";
import { mb, prepareMedia } from "@/lib/media";
import { fmtPhone } from "@/lib/wa-format";
import { labelChat, unlabelChat } from "@/lib/labels";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

type Payload = {
  id?: string;
  timestamp?: number;
  from?: string;
  to?: string;
  fromMe?: boolean;
  body?: string;
  hasMedia?: boolean;
  ack?: number;
  replyTo?: { id?: string; body?: string; participant?: string } | null;
  // eventos que não são mensagem nova
  revokedMessageId?: string;
  editedMessageId?: string;
  before?: { id?: string } | null;
  after?: { id?: string; body?: string } | null;
  reaction?: { text?: string; messageId?: string } | null;
  media?: { url?: string | null; mimetype?: string; filename?: string | null } | null;
  _data?: { pushName?: string; key?: { remoteJid?: string; remoteJidAlt?: string } };
};

const digits = (jid: string) => jid.split("@")[0].replace(/\D/g, "");

// Recebe mensagens do WAHA (recebidas e enviadas pelo celular) e grava na caixa de conversas.
export async function POST(req: Request) {
  if (Number(req.headers.get("content-length") ?? 0) > 2000000) return new Response("grande demais", { status: 413 });
  const secret = process.env.WAHA_WEBHOOK_SECRET;
  if (!secret) return new Response("webhook desligado", { status: 503 });

  const raw = await req.text();
  const got = req.headers.get("x-webhook-hmac") ?? "";
  const want = createHmac("sha512", secret).update(raw).digest("hex");
  if (got.length !== want.length || !timingSafeEqual(Buffer.from(got), Buffer.from(want))) {
    return new Response("forbidden", { status: 403 });
  }

  let ev: { event?: string; payload?: Payload };
  try { ev = JSON.parse(raw); } catch { return new Response("bad request", { status: 400 }); }
  const p = ev.payload;
  // ✓ entregue/lido, mensagem apagada ou editada, reação: só atualizam uma mensagem que já temos
  if (ev.event === "message.ack" || ev.event === "message.revoked" || ev.event === "message.edited" || ev.event === "message.reaction") {
    if (p) await updateExisting(ev.event, p).catch((e) => console.error("[waha] evento", ev.event, "falhou:", (e as Error).message));
    return Response.json({ ok: true });
  }
  if (ev.event !== "message" && ev.event !== "message.any") return Response.json({ ok: true });
  if (!p?.id) return Response.json({ ok: true });

  const fromMe = !!p.fromMe;
  // a conversa é sempre o "outro lado": para o que você enviou, usa `to` ou a chave interna do WhatsApp
  const chatId = String((fromMe ? (p.to || p._data?.key?.remoteJid) : p.from) ?? "");
  if (!chatId || chatId.endsWith("@g.us") || chatId.includes("status@broadcast")) return Response.json({ ok: true });
  // conversa com o próprio eletricista (avisos do sistema): não entra na caixa
  if (isOwnerChat(chatId)) return Response.json({ ok: true });

  // @lid = número oculto: usa o telefone real quando o WhatsApp informa
  const alt = p._data?.key?.remoteJidAlt;
  const phone = chatId.endsWith("@c.us") ? digits(chatId) : alt ? digits(alt) : "";
  const body = p.body ?? "";
  const at = new Date((p.timestamp ?? Math.floor(Date.now() / 1000)) * 1000).toISOString();
  const name = fromMe ? "" : (p._data?.pushName ?? "");

  // o WAHA reenvia quando demora: se já existe, não faz nada
  const [seen] = await sql`select 1 from wa_messages where id = ${p.id}`;
  if (seen) return Response.json({ ok: true });

  // arquivo (foto, PDF, áudio…): baixa do WAHA, comprime e guarda; se não der, guarda o motivo para a conversa explicar
  let mediaId: string | null = null;
  let mime = p.media?.mimetype ?? "";
  const mediaName = p.media?.filename ?? "";
  let mediaNote = "";
  if (p.hasMedia) {
    try {
      if (!wahaConfigured()) throw new Error("waha não configurado");
      const url = p.media?.url ?? (await messageMediaUrl(chatId, p.id));
      if (!url) throw new Error("sem link do arquivo");
      const dl = await downloadMedia(url);
      if (dl.tooBig !== undefined) {
        mediaNote = `grande:${mb(dl.tooBig)}`;
      } else if (dl.buf) {
        const prep = await prepareMedia(dl.buf, mime || dl.mime);
        if ("skipped" in prep) {
          mediaNote = prep.skipped === "grande" ? `grande:${mb(prep.size)}` : "invalido";
        } else {
          mime = prep.mime;
          const [row] = await sql<{ id: string }[]>`
            insert into wa_media (mime, name, data) values (${prep.mime}, ${mediaName}, ${prep.data}) returning id`;
          mediaId = row.id;
        }
      }
    } catch (e) {
      mediaNote = "falhou";
      console.error("[waha] não baixou o arquivo:", (e as Error).message);
    }
  }

  const preview = body || (p.hasMedia ? "📎 Arquivo" : "");
  // resposta a outra mensagem: guarda o trecho citado (vem no evento; se não vier, usa o que já temos)
  let replyTo: string | null = null;
  let replyBody = "";
  let replyFromMe: boolean | null = null;
  if (p.replyTo?.id) {
    const quoted = await findMessage(p.replyTo.id);
    replyTo = quoted?.id ?? p.replyTo.id;
    replyBody = (p.replyTo.body || quoted?.body || (quoted?.has_media ? "📎 Arquivo" : "")).slice(0, 300);
    replyFromMe = quoted ? quoted.from_me : null;
  }
  const ack = Math.max(-1, Math.min(4, Number.isFinite(p.ack) ? Number(p.ack) : fromMe ? 1 : 0));
  let isNew = false;
  let newChat = false;
  await sql.begin(async (tx) => {
    const [chatRow] = await tx<{ created: boolean }[]>`
      insert into wa_chats (chat_id, phone, name, last_body, last_at, unread)
      values (${chatId}, ${phone}, ${name}, ${preview}, ${at}, 0)
      on conflict (chat_id) do update set
        phone = case when excluded.phone <> '' then excluded.phone else wa_chats.phone end,
        name = case when excluded.name <> '' then excluded.name else wa_chats.name end
      returning (xmax = 0) as created`;
    newChat = !!chatRow?.created;
    const inserted = await tx`
      insert into wa_messages (id, chat_id, from_me, body, has_media, media_id, media_mime, media_name, media_note, at, ack, reply_to, reply_body, reply_from_me)
      values (${p.id!}, ${chatId}, ${fromMe}, ${body}, ${!!p.hasMedia}, ${mediaId}, ${mime}, ${mediaName}, ${mediaNote}, ${at}, ${ack}, ${replyTo}, ${replyBody}, ${replyFromMe})
      on conflict (id) do nothing returning id`;
    // só conta como nova se a mensagem não existia (reenvios concorrentes do webhook não duplicam)
    if (inserted.length) {
      isNew = true;
      await tx`
        update wa_chats set
          last_body = case when ${at}::timestamptz >= last_at then ${preview} else last_body end,
          last_at = greatest(last_at, ${at}::timestamptz),
          archived = false,
          unread = unread + ${fromMe ? 0 : 1}
        where chat_id = ${chatId}`;
    }
  });

  // primeira mensagem de um cliente novo: etiqueta "Novo cliente"
  if (newChat && !fromMe) await labelChat(chatId, "Novo cliente").catch(() => {});
  // você respondeu (pelo painel ou pelo celular): deixa de ser "Novo cliente"
  if (isNew && fromMe) await unlabelChat(chatId, "Novo cliente").catch(() => {});

  // arquivos com mais de 90 dias saem do banco (a mensagem fica, com o aviso "arquivo antigo removido")
  if (p.hasMedia) after(purgeOldMedia);

  // mensagem nova de cliente: avisa o celular do eletricista depois de responder ao WAHA
  if (isNew && !fromMe) {
    const who = name || (phone ? fmtPhone(phone) : "Novo contato");
    after(() => notifyOwner({ title: who, body: preview.slice(0, 140), url: `/admin/conversas/${encodeURIComponent(chatId)}`, tag: `chat-${chatId}` }));
  }
  return Response.json({ ok: true });
}

async function purgeOldMedia() {
  try {
    await sql`update wa_messages set media_note = 'expirou' where media_id in (select id from wa_media where created_at < now() - interval '90 days')`;
    await sql`delete from wa_media where created_at < now() - interval '90 days'`;
  } catch (e) {
    console.error("[waha] limpeza de arquivos antigos falhou:", (e as Error).message);
  }
}

// WAHA manda o id completo ("true_5544…@c.us_3EB0…") ou só o final; o que importa é o final
const shortId = (id: string) => (id.includes("_") ? id.split("_")[2] ?? id : id);

async function findMessage(id: string) {
  const short = shortId(id);
  const [m] = await sql<{ id: string; chat_id: string; from_me: boolean; body: string; has_media: boolean }[]>`
    select id, chat_id, from_me, body, has_media from wa_messages
    where id = ${id} or id like ${"%\\_" + short.replace(/[%_\\]/g, "")} limit 1`;
  return m ?? null;
}

async function updateExisting(event: string, p: Payload) {
  if (event === "message.ack") {
    const m = p.id ? await findMessage(p.id) : null;
    if (!m || !m.from_me || typeof p.ack !== "number") return;
    // a marca só avança (1 → 2 → 3 → 4); erro (-1) só vale se ainda estava enviando
    if (p.ack < 0) await sql`update wa_messages set ack = -1 where id = ${m.id} and ack <= 0`;
    else await sql`update wa_messages set ack = greatest(ack, ${Math.min(4, p.ack)}) where id = ${m.id}`;
    return;
  }
  if (event === "message.revoked") {
    const m = await findFirst([p.revokedMessageId, p.before?.id, p.after?.id, p.id]);
    if (!m) return;
    await sql.begin(async (tx) => {
      await tx`update wa_messages set deleted = true, body = '', has_media = false, media_id = null, media_note = '' where id = ${m.id}`;
      await tx`
        update wa_chats set last_body = 'Mensagem apagada'
        where chat_id = ${m.chat_id} and last_at = (select max(at) from wa_messages where chat_id = ${m.chat_id})`;
    });
    return;
  }
  if (event === "message.edited") {
    const m = await findFirst([p.editedMessageId, p.after?.id, p.id]);
    const body = p.body ?? p.after?.body;
    if (!m || !body) return;
    await sql`update wa_messages set body = ${body}, edited = true where id = ${m.id}`;
    return;
  }
  if (event === "message.reaction") {
    const m = p.reaction?.messageId ? await findMessage(p.reaction.messageId) : null;
    if (!m) return;
    const emoji = (p.reaction?.text ?? "").slice(0, 16);
    if (p.fromMe) await sql`update wa_messages set my_reaction = ${emoji} where id = ${m.id}`;
    else await sql`update wa_messages set their_reaction = ${emoji} where id = ${m.id}`;
  }
}

async function findFirst(ids: (string | undefined)[]) {
  for (const id of ids) {
    if (!id) continue;
    const m = await findMessage(id);
    if (m) return m;
  }
  return null;
}
