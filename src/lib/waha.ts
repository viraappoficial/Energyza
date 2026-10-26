// Cliente do WAHA (WhatsApp HTTP API) hospedado na VPS. Só roda no servidor.
const session = "default";

export const wahaConfigured = () => !!process.env.WAHA_URL && !!process.env.WAHA_API_KEY;

async function waha(method: "GET" | "POST", path: string, body?: unknown) {
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

export async function sendText(chatId: string, text: string) {
  return msgId(await waha("POST", "/api/sendText", { session, chatId, text }));
}

export async function sendFile(chatId: string, file: { mimetype: string; filename: string; data: string }, caption: string) {
  const path = file.mimetype.startsWith("image/") ? "/api/sendImage" : "/api/sendFile";
  return msgId(await waha("POST", path, { session, chatId, file, ...(caption ? { caption } : {}) }));
}

// baixa mídia recebida (a URL pede a chave do WAHA)
export async function downloadMedia(url: string, max = 8_000_000) {
  const base = process.env.WAHA_URL!.replace(/\/$/, "");
  const abs = url.startsWith("http") ? url : base + url;
  const sameHost = abs.startsWith(base);
  const r = await fetch(abs, {
    headers: sameHost ? { "X-Api-Key": process.env.WAHA_API_KEY! } : undefined,
    signal: AbortSignal.timeout(15_000),
  });
  if (!r.ok) return null;
  const buf = Buffer.from(await r.arrayBuffer());
  if (buf.length > max) return null;
  return { buf, mime: r.headers.get("content-type")?.split(";")[0] ?? "application/octet-stream" };
}
