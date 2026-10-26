import { createHmac, timingSafeEqual } from "node:crypto";
import { sql } from "@/lib/db";
import { downloadMedia, wahaConfigured } from "@/lib/waha";

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
  _data?: { pushName?: string; key?: { remoteJidAlt?: string } };
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
  const chatId = String((fromMe ? p.to : p.from) ?? "");
  if (!chatId || chatId.endsWith("@g.us") || chatId.includes("status@broadcast")) return Response.json({ ok: true });

  // @lid = número oculto: usa o telefone real quando o WhatsApp informa
  const alt = p._data?.key?.remoteJidAlt;
  const phone = chatId.endsWith("@c.us") ? digits(chatId) : alt ? digits(alt) : "";
  const body = p.body ?? "";
  const at = new Date((p.timestamp ?? Math.floor(Date.now() / 1000)) * 1000).toISOString();
  const name = fromMe ? "" : (p._data?.pushName ?? "");

  // o WAHA reenvia quando demora: se já existe, não faz nada
  const [seen] = await sql`select 1 from wa_messages where id = ${p.id}`;
  if (seen) return Response.json({ ok: true });

  let mediaId: string | null = null;
  let mime = p.media?.mimetype ?? "";
  const mediaName = p.media?.filename ?? "";
  if (p.hasMedia && p.media?.url && wahaConfigured()) {
    try {
      const m = await downloadMedia(p.media.url);
      if (m) {
        mime = mime || m.mime;
        const [row] = await sql<{ id: string }[]>`
          insert into wa_media (mime, name, data) values (${mime}, ${mediaName}, ${m.buf}) returning id`;
        mediaId = row.id;
      }
    } catch {
      // sem o arquivo: a mensagem aparece como "mídia não baixada"
    }
  }

  const preview = body || (p.hasMedia ? "📎 Arquivo" : "");
  await sql.begin(async (tx) => {
    await tx`
      insert into wa_chats (chat_id, phone, name, last_body, last_at, unread)
      values (${chatId}, ${phone}, ${name}, ${preview}, ${at}, 0)
      on conflict (chat_id) do update set
        phone = case when excluded.phone <> '' then excluded.phone else wa_chats.phone end,
        name = case when excluded.name <> '' then excluded.name else wa_chats.name end`;
    const inserted = await tx`
      insert into wa_messages (id, chat_id, from_me, body, has_media, media_id, media_mime, media_name, at)
      values (${p.id!}, ${chatId}, ${fromMe}, ${body}, ${!!p.hasMedia}, ${mediaId}, ${mime}, ${mediaName}, ${at})
      on conflict (id) do nothing returning id`;
    // só conta como nova se a mensagem não existia (reenvios concorrentes do webhook não duplicam)
    if (inserted.length) {
      await tx`
        update wa_chats set
          last_body = case when ${at}::timestamptz >= last_at then ${preview} else last_body end,
          last_at = greatest(last_at, ${at}::timestamptz),
          unread = unread + ${fromMe ? 0 : 1}
        where chat_id = ${chatId}`;
    }
  });
  return Response.json({ ok: true });
}
