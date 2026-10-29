// Cliente do WAHA (WhatsApp HTTP API) hospedado na VPS. Só roda no servidor.
const session = "default";

export const wahaConfigured = () => !!process.env.WAHA_URL && !!process.env.WAHA_API_KEY;

async function waha(method: "GET" | "POST" | "PUT" | "DELETE", path: string, body?: unknown) {
  const r = await fetch(process.env.WAHA_URL!.replace(/\/$/, "") + path, {
    method,
    headers: { "X-Api-Key": process.env.WAHA_API_KEY!, "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(20_000),
    cache: "no-store",
  });
  const text = await r.text();
  if (!r.ok) throw Object.assign(new Error(`WAHA ${r.status}: ${text.slice(0, 200)}`), { status: r.status });
  try { return JSON.parse(text); } catch { return null; }
}

// 422 "Session status is not as expected" = sessão fora do ar, não é número inexistente
export function friendlyError(e: unknown) {
  const err = e as { status?: number; message?: string };
  if (err.status === 422 && /session status/i.test(err.message ?? "")) return "WhatsApp desconectado. Reconecte o número no servidor e tente de novo.";
  if (err.message === "numero-inexistente") return "Esse número não está no WhatsApp.";
  if (/plus|not available|only .*core|unsupported/i.test(err.message ?? "")) return "O WAHA instalado não envia arquivos (parece exigir a versão Plus). Texto continua funcionando.";
  if (err.status === 401 || err.status === 403) return "Chave do WAHA recusada. Confira WAHA_API_KEY.";
  return "Não foi possível enviar agora. Tente de novo em instantes.";
}

// telefone só com dígitos (55…) -> chatId; resolve o 9º dígito
export async function chatIdOf(phone: string): Promise<string> {
  if (phone.includes("@")) return phone;
  const j = await waha("GET", `/api/contacts/check-exists?phone=${phone}&session=${session}`);
  if (!j?.numberExists) throw new Error("numero-inexistente");
  return j.chatId as string;
}

// o WAHA devolve o id como texto ou como { _serialized }
const msgId = (r: unknown): string | null => {
  const id = (r as { id?: unknown } | null)?.id;
  if (typeof id === "string") return id;
  const s = (id as { _serialized?: unknown } | undefined)?._serialized;
  return typeof s === "string" ? s : null;
};

// replyTo = id da mensagem que está sendo respondida (aparece citada no WhatsApp do cliente)
export async function sendText(chatId: string, text: string, replyTo?: string | null) {
  return msgId(await waha("POST", "/api/sendText", { session, chatId, text, ...(replyTo ? { reply_to: replyTo } : {}) }));
}

export async function sendFile(chatId: string, file: { mimetype: string; filename: string; data: string }, caption: string, replyTo?: string | null) {
  const path = file.mimetype.startsWith("image/") ? "/api/sendImage" : "/api/sendFile";
  return msgId(await waha("POST", path, { session, chatId, file, ...(caption ? { caption } : {}), ...(replyTo ? { reply_to: replyTo } : {}) }));
}

// Áudio gravado no painel: vai como mensagem de voz (o WAHA converte para o formato do WhatsApp)
export async function sendVoice(chatId: string, file: { mimetype: string; filename: string; data: string }, replyTo?: string | null) {
  return msgId(await waha("POST", "/api/sendVoice", { session, chatId, file, convert: true, ...(replyTo ? { reply_to: replyTo } : {}) }));
}

// "Apagar para todos": o WAHA revoga a mensagem enviada
export async function deleteMessage(chatId: string, messageId: string) {
  await waha("DELETE", `/api/${session}/chats/${encodeURIComponent(chatId)}/messages/${encodeURIComponent(messageId)}`);
}

// Reação com emoji (texto vazio remove a reação)
export async function reactToMessage(messageId: string, reaction: string) {
  await waha("PUT", "/api/reaction", { session, messageId, reaction });
}

// O WAHA informa o link do arquivo com o endereço dele "por dentro" (ex.: localhost:3000), que a Vercel não alcança.
// Por isso só aproveitamos o caminho (/api/files/...) e buscamos pelo endereço público configurado, com a chave.
export async function downloadMedia(url: string, max = 12_000_000) {
  const base = process.env.WAHA_URL!.replace(/\/$/, "");
  let path = url;
  try {
    const u = new URL(url, base);
    path = u.pathname + u.search;
  } catch {
    // já é um caminho
  }
  const r = await fetch(base + path, {
    headers: { "X-Api-Key": process.env.WAHA_API_KEY! },
    signal: AbortSignal.timeout(20_000),
    cache: "no-store",
  });
  if (!r.ok) throw new Error(`download ${r.status}`);
  const len = Number(r.headers.get("content-length") ?? 0);
  if (len > max) return { tooBig: len } as const;
  const buf = Buffer.from(await r.arrayBuffer());
  if (buf.length > max) return { tooBig: buf.length } as const;
  return { buf, mime: r.headers.get("content-type")?.split(";")[0] ?? "application/octet-stream" } as const;
}

// Quando a mensagem chega sem link do arquivo, pede ao WAHA a mensagem com a mídia baixada
export async function messageMediaUrl(chatId: string, messageId: string): Promise<string | null> {
  const j = await waha("GET", `/api/${session}/chats/${encodeURIComponent(chatId)}/messages/${encodeURIComponent(messageId)}?downloadMedia=true`);
  const url = (j as { media?: { url?: string | null } } | null)?.media?.url;
  return typeof url === "string" ? url : null;
}

// Número pessoal do eletricista (só dígitos com 55) que recebe avisos pelo WhatsApp
export const ownerPhone = () => (process.env.OWNER_WHATSAPP ?? "").replace(/\D/g, "");

// a conversa é a do próprio eletricista? (compara os 8 últimos dígitos: o 9º dígito varia)
export const isOwnerChat = (jid: string) => {
  const o = ownerPhone();
  return !!o && jid.split("@")[0].replace(/\D/g, "").slice(-8) === o.slice(-8);
};

// Manda um aviso do chip para o WhatsApp pessoal do eletricista. Nunca derruba quem chamou.
export async function notifyOwnerWhatsApp(text: string) {
  const phone = ownerPhone();
  if (!wahaConfigured() || !phone) return;
  try {
    await sendText(await chatIdOf(phone), text);
  } catch (e) {
    console.error("[whatsapp] aviso ao eletricista falhou:", (e as Error).message);
  }
}
