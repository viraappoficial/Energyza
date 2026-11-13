import { timingSafeEqual } from "node:crypto";
import { sendAgendaMessage } from "@/lib/agenda-bot";

export const dynamic = "force-dynamic";

function authorized(req: Request) {
  const expected = process.env.CRON_SECRET;
  if (!expected || expected.length < 16) return false;
  const got = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  const a = Buffer.from(got);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

// Todo dia ~7h (Brasília): manda o "bom dia" com a agenda e as cobranças para o WhatsApp do dono.
export async function GET(req: Request) {
  if (!authorized(req)) return Response.json({ error: "Não autorizado" }, { status: 401 });
  try {
    const r = await sendAgendaMessage();
    if (r.status === "falhou") console.error("[agenda] WhatsApp não enviou:", r.error);
    return Response.json({ ok: r.status !== "falhou", agenda: r.status }, { status: r.status === "falhou" ? 502 : 200 });
  } catch (e) {
    console.error("[agenda] falha:", (e as Error).message);
    return Response.json({ ok: false, agenda: "erro" }, { status: 502 });
  }
}
