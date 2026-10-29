import { timingSafeEqual } from "node:crypto";
import { googleAdsConfigured, syncGoogleAds } from "@/lib/google-ads";
import { metaAdsConfigured, syncMetaAds } from "@/lib/meta-ads";

export const dynamic = "force-dynamic";

function authorized(req: Request) {
  const expected = process.env.CRON_SECRET;
  if (!expected || expected.length < 16) return false;
  const got = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  const a = Buffer.from(got);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

// Chamado todo dia pela Vercel (vercel.json). Puxa custos e cliques do Google Ads e da Meta.
// Uma falha não impede a outra rede de atualizar.
export async function GET(req: Request) {
  if (!authorized(req)) return Response.json({ error: "Não autorizado" }, { status: 401 });
  if (!googleAdsConfigured() && !metaAdsConfigured()) return Response.json({ error: "Nenhuma rede de anúncios configurada" }, { status: 503 });
  const out: Record<string, number | string> = {};
  if (googleAdsConfigured()) {
    try {
      out.google = await syncGoogleAds();
    } catch (e) {
      console.error("[google-ads] falha ao sincronizar:", (e as Error).message);
      out.google = "erro";
    }
  }
  if (metaAdsConfigured()) {
    try {
      out.meta = await syncMetaAds();
    } catch (e) {
      console.error("[meta-ads] falha ao sincronizar:", (e as Error).message);
      out.meta = "erro";
    }
  }
  const failed = Object.values(out).includes("erro");
  return Response.json({ ok: !failed, ...out }, { status: failed ? 502 : 200 });
}
