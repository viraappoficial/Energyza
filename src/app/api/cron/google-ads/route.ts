import { timingSafeEqual } from "node:crypto";
import { googleAdsConfigured, syncGoogleAds } from "@/lib/google-ads";

export const dynamic = "force-dynamic";

function authorized(req: Request) {
  const expected = process.env.CRON_SECRET;
  if (!expected || expected.length < 16) return false;
  const got = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  const a = Buffer.from(got);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

// Chamado todo dia pela Vercel (vercel.json). Puxa custos e cliques do Google Ads.
export async function GET(req: Request) {
  if (!authorized(req)) return Response.json({ error: "Não autorizado" }, { status: 401 });
  if (!googleAdsConfigured()) return Response.json({ error: "Google Ads não configurado" }, { status: 503 });
  try {
    return Response.json({ ok: true, rows: await syncGoogleAds() });
  } catch (e) {
    console.error("[google-ads] falha ao sincronizar:", (e as Error).message);
    return Response.json({ error: (e as Error).message }, { status: 502 });
  }
}
