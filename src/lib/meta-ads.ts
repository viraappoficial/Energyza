import { sql } from "@/lib/db";

// Leitura da API de Marketing da Meta (gasto, cliques e conversões por dia e campanha).
const API = "https://graph.facebook.com/v23.0";

const cfg = () => ({
  token: process.env.META_ACCESS_TOKEN ?? "",
  account: (process.env.META_AD_ACCOUNT_ID ?? "").replace(/\D/g, ""),
});

export function metaAdsConfigured() {
  const c = cfg();
  return Boolean(c.token && c.account);
}

type Action = { action_type: string; value: string };
type Row = {
  date_start: string;
  campaign_id: string;
  campaign_name?: string;
  spend?: string;
  impressions?: string;
  inline_link_clicks?: string;
  actions?: Action[];
};
type Page = { data?: Row[]; paging?: { next?: string }; error?: { message?: string; code?: number } };

// contato pedido pelo site: agendamento (Lead) ou clique no WhatsApp/telefone (Contact)
const isConversion = (t: string) => /(^|\.)(lead|contact)$/.test(t);

async function get(url: string): Promise<Page> {
  const res = await fetch(url, { headers: { Authorization: `Bearer ${cfg().token}` }, cache: "no-store" });
  const json = (await res.json()) as Page;
  if (!res.ok || json.error) {
    const e = json.error;
    throw new Error(e?.code === 190 ? "A Meta recusou o token (expirado ou revogado). Gere um novo token." : (e?.message ?? `Meta respondeu ${res.status}`));
  }
  return json;
}

// Busca os últimos 30 dias e grava em ad_costs (o mesmo dia atualiza o valor, nunca duplica).
export async function syncMetaAds() {
  const fields = "campaign_id,campaign_name,spend,impressions,inline_link_clicks,actions";
  let url: string | undefined = `${API}/act_${cfg().account}/insights?level=campaign&time_increment=1&date_preset=last_30d&fields=${fields}&limit=500`;
  const rows: Row[] = [];
  for (let i = 0; url && i < 10; i++) {
    const page = await get(url);
    rows.push(...(page.data ?? []));
    url = page.paging?.next;
  }
  await sql.begin(async (tx) => {
    for (const r of rows) {
      const conv = (r.actions ?? []).filter((a) => isConversion(a.action_type)).reduce((s, a) => s + Number(a.value || 0), 0);
      await tx`
        insert into ad_costs (day, channel, campaign_id, campaign_name, cost, clicks, impressions, conversions, origin, synced_at)
        values (${r.date_start}, 'meta', ${r.campaign_id}, ${r.campaign_name ?? ""}, ${Number(r.spend ?? 0)},
                ${Number(r.inline_link_clicks ?? 0)}, ${Number(r.impressions ?? 0)}, ${conv}, 'script', now())
        on conflict (day, channel, campaign_id, origin) do update set
          campaign_name = excluded.campaign_name, cost = excluded.cost, clicks = excluded.clicks,
          impressions = excluded.impressions, conversions = excluded.conversions, synced_at = now()`;
    }
  });
  return rows.length;
}

export type MetaAd = {
  id: string;
  name: string;
  status: string; // ACTIVE, PAUSED, IN_PROCESS, WITH_ISSUES, DISAPPROVED...
  image: string | null;
  spend: number;
  impressions: number;
  clicks: number;
  conversions: number;
};

export type MetaOverview = { balance: string | null; ads: MetaAd[] };

type AdRow = {
  id: string;
  name: string;
  effective_status: string;
  creative?: { image_url?: string; thumbnail_url?: string };
  insights?: { data?: Row[] };
};

// Retrato atual da conta: saldo e cada anúncio com a arte e os números dos últimos 30 dias.
// Chamado ao abrir a tela (guarda 5 minutos para não pesar); falha vira "indisponível", nunca derruba a tela.
export async function metaOverview(): Promise<MetaOverview | null> {
  if (!metaAdsConfigured()) return null;
  const { account } = cfg();
  const headers = { Authorization: `Bearer ${cfg().token}` };
  const opts = { headers, next: { revalidate: 300 } } as const;
  try {
    const adFields = "name,effective_status,creative{image_url,thumbnail_url},insights.date_preset(last_30d){spend,impressions,inline_link_clicks,actions}";
    const [acc, ads] = await Promise.all([
      fetch(`${API}/act_${account}?fields=funding_source_details`, opts).then((r) => r.json() as Promise<{ funding_source_details?: { display_string?: string } }>),
      fetch(`${API}/act_${account}/ads?fields=${encodeURIComponent(adFields)}&limit=50`, opts).then((r) => r.json() as Promise<{ data?: AdRow[]; error?: unknown }>),
    ]);
    if (!ads.data) return null;
    return {
      balance: acc.funding_source_details?.display_string ?? null,
      ads: ads.data.map((a) => {
        const i = a.insights?.data?.[0];
        return {
          id: a.id,
          name: a.name,
          status: a.effective_status,
          image: a.creative?.image_url ?? a.creative?.thumbnail_url ?? null,
          spend: Number(i?.spend ?? 0),
          impressions: Number(i?.impressions ?? 0),
          clicks: Number(i?.inline_link_clicks ?? 0),
          conversions: (i?.actions ?? []).filter((x) => isConversion(x.action_type)).reduce((s, x) => s + Number(x.value || 0), 0),
        };
      }),
    };
  } catch (e) {
    console.error("[meta-ads] retrato da conta falhou:", (e as Error).message);
    return null;
  }
}
