import "server-only";
import { importPKCS8, SignJWT } from "jose";

// Leitura do Google Analytics 4 (API de dados) com uma conta de serviço: o painel só LÊ os números.
// Variáveis: GA4_PROPERTY_ID (número da propriedade, não o "G-...") e GOOGLE_SERVICE_ACCOUNT_JSON (chave da conta de serviço).

type Account = { client_email: string; private_key: string; token_uri?: string };

const DEFAULT_TOKEN_URI = "https://oauth2.googleapis.com/token";
const apiBase = () => (process.env.GA4_API_BASE ?? "https://analyticsdata.googleapis.com").replace(/\/$/, "");

function account(): Account | null {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON?.trim();
  if (!raw) return null;
  try {
    const json = raw.startsWith("{") ? raw : Buffer.from(raw, "base64").toString("utf8");
    const a = JSON.parse(json) as Account;
    return a.client_email && a.private_key ? a : null;
  } catch {
    return null;
  }
}

const propertyId = () => (process.env.GA4_PROPERTY_ID ?? "").replace(/\D/g, "");
export const ga4Configured = () => !!propertyId() && !!account();

let token: { value: string; exp: number } | null = null;
async function accessToken(a: Account) {
  if (token && token.exp > Date.now() + 60_000) return token.value;
  const uri = a.token_uri ?? DEFAULT_TOKEN_URI;
  const key = await importPKCS8(a.private_key, "RS256");
  const jwt = await new SignJWT({ scope: "https://www.googleapis.com/auth/analytics.readonly" })
    .setProtectedHeader({ alg: "RS256", typ: "JWT" })
    .setIssuer(a.client_email)
    .setAudience(uri)
    .setIssuedAt()
    .setExpirationTime("55m")
    .sign(key);
  const r = await fetch(uri, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: jwt }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!r.ok) throw new Error(`token ${r.status}`);
  const j = (await r.json()) as { access_token: string; expires_in?: number };
  token = { value: j.access_token, exp: Date.now() + (j.expires_in ?? 3600) * 1000 };
  return token.value;
}

type Row = { dimensionValues?: { value: string }[]; metricValues?: { value: string }[] };
type Report = { rows?: Row[] };

export type GaData = {
  users: number;
  sessions: number;
  views: number;
  avgSeconds: number;
  channels: { name: string; sessions: number }[];
  pages: { path: string; views: number }[];
  days: { day: string; sessions: number }[];
  events: Record<string, number>;
};

const num = (r: Row | undefined, i: number) => Number(r?.metricValues?.[i]?.value ?? 0);
const dim = (r: Row, i = 0) => r.dimensionValues?.[i]?.value ?? "";

const cache = new Map<string, { at: number; data: GaData }>();

// Busca os números do período (guarda 5 minutos para não gastar a cota do Google a cada abertura da tela)
export async function loadGa4(from: string, to: string): Promise<GaData> {
  const key = `${from}|${to}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < 5 * 60_000) return hit.data;

  const a = account();
  const id = propertyId();
  if (!a || !id) throw new Error("não configurado");
  const dateRanges = [{ startDate: from, endDate: to }];
  const r = await fetch(`${apiBase()}/v1beta/properties/${id}:batchRunReports`, {
    method: "POST",
    headers: { Authorization: `Bearer ${await accessToken(a)}`, "Content-Type": "application/json" },
    signal: AbortSignal.timeout(15_000),
    body: JSON.stringify({
      requests: [
        { dateRanges, metrics: [{ name: "activeUsers" }, { name: "sessions" }, { name: "screenPageViews" }, { name: "averageSessionDuration" }] },
        { dateRanges, dimensions: [{ name: "sessionDefaultChannelGroup" }], metrics: [{ name: "sessions" }], orderBys: [{ metric: { metricName: "sessions" }, desc: true }], limit: 8 },
        { dateRanges, dimensions: [{ name: "pagePath" }], metrics: [{ name: "screenPageViews" }], orderBys: [{ metric: { metricName: "screenPageViews" }, desc: true }], limit: 8 },
        { dateRanges, dimensions: [{ name: "date" }], metrics: [{ name: "sessions" }], orderBys: [{ dimension: { dimensionName: "date" } }], limit: 120 },
        { dateRanges, dimensions: [{ name: "eventName" }], metrics: [{ name: "eventCount" }], dimensionFilter: { filter: { fieldName: "eventName", inListFilter: { values: ["generate_lead", "contact"] } } } },
      ],
    }),
  });
  if (!r.ok) {
    const t = await r.text();
    throw new Error(`ga4 ${r.status}: ${t.slice(0, 160)}`);
  }
  const { reports } = (await r.json()) as { reports: Report[] };
  const [tot, ch, pg, dy, ev] = reports;
  const t = tot?.rows?.[0];
  const data: GaData = {
    users: num(t, 0),
    sessions: num(t, 1),
    views: num(t, 2),
    avgSeconds: num(t, 3),
    channels: (ch?.rows ?? []).map((x) => ({ name: dim(x), sessions: num(x, 0) })),
    pages: (pg?.rows ?? []).map((x) => ({ path: dim(x), views: num(x, 0) })),
    days: (dy?.rows ?? []).map((x) => {
      const d = dim(x); // AAAAMMDD
      return { day: `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}`, sessions: num(x, 0) };
    }),
    events: Object.fromEntries((ev?.rows ?? []).map((x) => [dim(x), num(x, 0)])),
  };
  cache.set(key, { at: Date.now(), data });
  return data;
}

// nomes dos canais do Google em português
export const GA_CHANNEL: Record<string, string> = {
  Direct: "Direto (digitou o endereço)",
  "Organic Search": "Busca no Google (sem anúncio)",
  "Paid Search": "Anúncios no Google",
  "Organic Social": "Redes sociais",
  "Paid Social": "Anúncios em redes sociais",
  Referral: "Link em outro site",
  Email: "E-mail",
  Display: "Banners",
  "Cross-network": "Campanha automática do Google",
  Unassigned: "Não identificado",
  "Organic Maps": "Google Maps",
  "Organic Video": "Vídeos",
};
