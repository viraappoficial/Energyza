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

// chamada à API do Google Ads (leitura e escrita)
async function ads<T>(path: string, body: unknown): Promise<T> {
  const c = cfg();
  const token = await accessToken();
  const res = await fetch(`${API}/customers/${c.customerId}/${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(c.loginCustomerId ? { "login-customer-id": c.loginCustomerId } : {}),
    },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  const json = (await res.json()) as T & { error?: { message?: string } };
  if (!res.ok) throw new Error(json.error?.message ?? `Google Ads respondeu ${res.status}`);
  return json;
}

const search = async <T>(query: string) => ((await ads<{ results?: T[] }>("googleAds:search", { query })).results ?? []);

// Busca os últimos 30 dias e grava em ad_costs (o mesmo dia atualiza o valor, nunca duplica).
export async function syncGoogleAds() {
  const rows = await search<Row>(
    "SELECT segments.date, campaign.id, campaign.name, metrics.cost_micros, metrics.clicks, metrics.impressions, metrics.conversions " +
      "FROM campaign WHERE segments.date DURING LAST_30_DAYS",
  );
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
  // os termos de pesquisa não podem derrubar a atualização dos custos
  await syncSearchTerms().catch((e) => console.error("[google-ads] termos de pesquisa falharam:", (e as Error).message));
  return rows.length;
}

type TermRow = Row & { adGroup?: { id?: string }; searchTermView: { searchTerm: string } };

// termos digitados no Google (campanhas de Pesquisa), por dia
export async function syncSearchTerms() {
  const rows = await search<TermRow>(
    "SELECT segments.date, campaign.id, campaign.name, ad_group.id, search_term_view.search_term, metrics.cost_micros, metrics.clicks, metrics.impressions, metrics.conversions " +
      "FROM search_term_view WHERE segments.date DURING LAST_30_DAYS",
  );
  await sql.begin(async (tx) => {
    for (const r of rows) {
      await tx`
        insert into ad_search_terms (day, campaign_id, campaign_name, ad_group_id, term, impressions, clicks, cost, conversions, synced_at)
        values (${r.segments.date}, ${String(r.campaign.id)}, ${r.campaign.name ?? ""}, ${String(r.adGroup?.id ?? "")}, ${r.searchTermView.searchTerm.slice(0, 200)},
                ${Number(r.metrics.impressions ?? 0)}, ${Number(r.metrics.clicks ?? 0)}, ${Number(r.metrics.costMicros ?? 0) / 1e6}, ${Number(r.metrics.conversions ?? 0)}, now())
        on conflict (day, campaign_id, ad_group_id, term) do update set
          campaign_name = excluded.campaign_name, impressions = excluded.impressions, clicks = excluded.clicks,
          cost = excluded.cost, conversions = excluded.conversions, synced_at = now()`;
    }
  });
  return rows.length;
}

// Palavra negativa na campanha (o termo deixa de disparar o anúncio). Devolve o endereço para poder desfazer.
export async function addNegativeKeyword(campaignId: string, text: string, match: "PHRASE" | "EXACT") {
  const customer = `customers/${cfg().customerId}`;
  const r = await ads<{ results?: { resourceName?: string }[] }>("campaignCriteria:mutate", {
    operations: [{ create: { campaign: `${customer}/campaigns/${campaignId}`, negative: true, keyword: { text, matchType: match } } }],
  });
  const rn = r.results?.[0]?.resourceName;
  if (!rn) throw new Error("O Google não devolveu o endereço da negativa");
  return rn;
}

export async function removeNegativeKeyword(resourceName: string) {
  await ads("campaignCriteria:mutate", { operations: [{ remove: resourceName }] });
}
