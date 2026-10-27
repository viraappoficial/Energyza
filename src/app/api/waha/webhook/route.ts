import { createHmac, timingSafeEqual } from "node:crypto";
import { sql } from "@/lib/db";
import { after } from "next/server";
import { notifyOwner } from "@/lib/push";
import { downloadMedia, isOwnerChat, messageMediaUrl, wahaConfigured } from "@/lib/waha";
import { mb, prepareMedia } from "@/lib/media";
import { fmtPhone } from "@/lib/wa-format";

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
  media?: { url?: string | null; mimetype?: string; filename?: string | null } | null;
  _data?: { pushName?: string; key?: { remoteJid?: string; remoteJidAlt?: string } };
};

const digits = (jid: string) => jid.split("@")[0].replace(/\D/g, "");

// Recebe mensagens do WAHA (recebidas e enviadas pelo celular) e grava na caixa de conversas.
export async function POST(req: Request) {
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
  if (ev.event !== "message" && ev.event !== "message.any") return Response.json({ ok: true });
  const p = ev.payload;
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
  let isNew = false;
  await sql.begin(async (tx) => {
    await tx`
      insert into wa_chats (chat_id, phone, name, last_body, last_at, unread)
      values (${chatId}, ${phone}, ${name}, ${preview}, ${at}, 0)
      on conflict (chat_id) do update set
        phone = case when excluded.phone <> '' then excluded.phone else wa_chats.phone end,
        name = case when excluded.name <> '' then excluded.name else wa_chats.name end`;
    const inserted = await tx`
      insert into wa_messages (id, chat_id, from_me, body, has_media, media_id, media_mime, media_name, media_note, at)
      values (${p.id!}, ${chatId}, ${fromMe}, ${body}, ${!!p.hasMedia}, ${mediaId}, ${mime}, ${mediaName}, ${mediaNote}, ${at})
      on conflict (id) do nothing returning id`;
    // só conta como nova se a mensagem não existia (reenvios concorrentes do webhook não duplicam)
    if (inserted.length) {
      isNew = true;
      await tx`
        update wa_chats set
          last_body = case when ${at}::timestamptz >= last_at then ${preview} else last_body end,
          last_at = greatest(last_at, ${at}::timestamptz),
          unread = unread + ${fromMe ? 0 : 1}
        where chat_id = ${chatId}`;
    }
  });

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
