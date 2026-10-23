import { timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { sql } from "@/lib/db";

export const dynamic = "force-dynamic";

const Row = z.object({
  day: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  campaignId: z.union([z.string(), z.number()]).transform(String).pipe(z.string().max(40)),
  campaignName: z.string().max(200).default(""),
  cost: z.number().min(0).max(10_000_000),
  clicks: z.number().int().min(0).default(0),
  impressions: z.number().int().min(0).default(0),
  conversions: z.number().min(0).default(0),
});
const Body = z.object({
  channel: z.enum(["google", "meta"]),
  rows: z.array(Row).max(3000),
});

function authorized(req: Request) {
  const expected = process.env.ADS_INGEST_TOKEN;
  if (!expected || expected.length < 24) return "off" as const;
  const got = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  const a = Buffer.from(got);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b) ? ("ok" as const) : ("denied" as const);
}

// Recebe custos/cliques/conversões por dia e campanha (enviado pelo script do Google Ads).
// Protegido por token secreto (ADS_INGEST_TOKEN). Reenviar o mesmo dia atualiza o valor.
export async function POST(req: Request) {
  const auth = authorized(req);
  if (auth === "off") return Response.json({ error: "Token não configurado no servidor" }, { status: 503 });
  if (auth === "denied") return Response.json({ error: "Não autorizado" }, { status: 401 });

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return Response.json({ error: "JSON inválido" }, { status: 400 });
  }
  const parsed = Body.safeParse(json);
  if (!parsed.success) {
    return Response.json({ error: "Dados inválidos", detail: parsed.error.issues[0]?.message }, { status: 400 });
  }
  const { channel, rows } = parsed.data;

  await sql.begin(async (tx) => {
    for (const r of rows) {
      await tx`
        insert into ad_costs (day, channel, campaign_id, campaign_name, cost, clicks, impressions, conversions, origin, synced_at)
        values (${r.day}, ${channel}, ${r.campaignId}, ${r.campaignName}, ${r.cost}, ${r.clicks}, ${r.impressions}, ${r.conversions}, 'script', now())
        on conflict (day, channel, campaign_id, origin) do update set
          campaign_name = excluded.campaign_name, cost = excluded.cost, clicks = excluded.clicks,
          impressions = excluded.impressions, conversions = excluded.conversions, synced_at = now()`;
    }
  });
  return Response.json({ ok: true, received: rows.length });
}
