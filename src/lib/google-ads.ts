import { sql } from "@/lib/db";

// Leitura direta da API do Google Ads (custos, cliques e conversões por dia e campanha).
const API = "https://googleads.googleapis.com/v24";

const cfg = () => ({
  clientId: process.env.GOOGLE_ADS_CLIENT_ID ?? "",
  clientSecret: process.env.GOOGLE_ADS_CLIENT_SECRET ?? "",
  refreshToken: process.env.GOOGLE_ADS_REFRESH_TOKEN ?? "",
  customerId: (process.env.GOOGLE_ADS_CUSTOMER_ID ?? "").replace(/\D/g, ""),
  loginCustomerId: (process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID ?? "").replace(/\D/g, ""),
});

export function googleAdsConfigured() {
  const c = cfg();
  return Boolean(c.clientId && c.clientSecret && c.refreshToken && c.customerId);
}

async function accessToken() {
  const c = cfg();
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    body: new URLSearchParams({ client_id: c.clientId, client_secret: c.clientSecret, refresh_token: c.refreshToken, grant_type: "refresh_token" }),
    cache: "no-store",
  });
  const json = (await res.json()) as { access_token?: string; error_description?: string; error?: string };
  if (!res.ok || !json.access_token) throw new Error(`Google recusou a autorização (${json.error_description ?? json.error ?? res.status}). Gere um novo refresh token.`);
  return json.access_token;
}

type Row = {
  segments: { date: string };
  campaign: { id: string; name: string };
  metrics: { costMicros?: string; clicks?: string; impressions?: string; conversions?: number };
};

// Busca os últimos 30 dias e grava em ad_costs (o mesmo dia atualiza o valor, nunca duplica).
export async function syncGoogleAds() {
  const c = cfg();
  const token = await accessToken();
  const res = await fetch(`${API}/customers/${c.customerId}/googleAds:search`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(c.loginCustomerId ? { "login-customer-id": c.loginCustomerId } : {}),
    },
    body: JSON.stringify({
      query:
        "SELECT segments.date, campaign.id, campaign.name, metrics.cost_micros, metrics.clicks, metrics.impressions, metrics.conversions " +
        "FROM campaign WHERE segments.date DURING LAST_30_DAYS",
    }),
    cache: "no-store",
  });
  const json = (await res.json()) as { results?: Row[]; error?: { message?: string } };
  if (!res.ok) throw new Error(json.error?.message ?? `Google Ads respondeu ${res.status}`);
  const rows = json.results ?? [];

  await sql.begin(async (tx) => {
    for (const r of rows) {
      await tx`
        insert into ad_costs (day, channel, campaign_id, campaign_name, cost, clicks, impressions, conversions, origin, synced_at)
        values (${r.segments.date}, 'google', ${String(r.campaign.id)}, ${r.campaign.name ?? ""}, ${Number(r.metrics.costMicros ?? 0) / 1e6},
                ${Number(r.metrics.clicks ?? 0)}, ${Number(r.metrics.impressions ?? 0)}, ${Number(r.metrics.conversions ?? 0)}, 'script', now())
        on conflict (day, channel, campaign_id, origin) do update set
          campaign_name = excluded.campaign_name, cost = excluded.cost, clicks = excluded.clicks,
          impressions = excluded.impressions, conversions = excluded.conversions, synced_at = now()`;
    }
  });
  return rows.length;
}
