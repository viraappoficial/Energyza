import Link from "next/link";
import { headers } from "next/headers";
import { CircleDollarSign, FileCheck2, MousePointerClick, TrendingUp, Users, Wallet } from "lucide-react";
import { sql } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { addDays, dayKey, startOfDay } from "@/lib/dates";
import { brl } from "@/lib/format";
import { CHANNEL_LABEL, PERIODS, originOf, periodRange, safe, type PeriodKey } from "@/lib/traffic";
import { deleteManualSpend, syncAdsNow } from "../../actions";
import { googleAdsConfigured } from "@/lib/google-ads";
import { metaAdsConfigured, metaOverview } from "@/lib/meta-ads";
import { SubmitButton } from "@/components/submit-button";
import { SearchTermRow, type TermItem } from "./search-term-row";
import { PageTitle } from "../page-title";
import { AnalyticsSection } from "./ga-section";
import { CopyBox } from "./copy-box";
import { SpendForm } from "./spend-form";

export const dynamic = "force-dynamic";

const TRACKING_TEMPLATE =
  "{lpurl}?utm_source=google&utm_medium=cpc&utm_campaign={campaignid}&utm_content={adgroupid}&utm_term={keyword}";

const fmtDay = (d: string) => d.split("-").reverse().slice(0, 2).join("/");

function adsScript(url: string) {
  return `// Energyza: envia custos e cliques do Google Ads para o painel (rode a cada hora)
var TOKEN = "COLE_AQUI_O_TOKEN";
var URL = "${url}";

function main() {
  var query =
    "SELECT segments.date, campaign.id, campaign.name, metrics.cost_micros, " +
    "metrics.clicks, metrics.impressions, metrics.conversions " +
    "FROM campaign WHERE segments.date DURING LAST_30_DAYS";
  var rows = [];
  var it = AdsApp.search(query);
  while (it.hasNext()) {
    var r = it.next();
    rows.push({
      day: r.segments.date,
      campaignId: String(r.campaign.id),
      campaignName: r.campaign.name,
      cost: Number(r.metrics.costMicros) / 1000000,
      clicks: Number(r.metrics.clicks),
      impressions: Number(r.metrics.impressions),
      conversions: Number(r.metrics.conversions)
    });
  }
  var res = UrlFetchApp.fetch(URL, {
    method: "post",
    contentType: "application/json",
    headers: { Authorization: "Bearer " + TOKEN },
    payload: JSON.stringify({ channel: "google", rows: rows }),
    muteHttpExceptions: true
  });
  Logger.log(res.getResponseCode() + " " + res.getContentText());
}`;
}

const META_STATUS: Record<string, { label: string; cls: string }> = {
  ACTIVE: { label: "No ar", cls: "border-emerald-400/50 text-emerald-300" },
  IN_PROCESS: { label: "Em análise", cls: "border-yellow-400/50 text-yellow-300" },
  PENDING_REVIEW: { label: "Em análise", cls: "border-yellow-400/50 text-yellow-300" },
  PAUSED: { label: "Pausado", cls: "border-border text-muted" },
  CAMPAIGN_PAUSED: { label: "Pausado", cls: "border-border text-muted" },
  ADSET_PAUSED: { label: "Pausado", cls: "border-border text-muted" },
  DISAPPROVED: { label: "Reprovado", cls: "border-red-400/60 text-red-300" },
  WITH_ISSUES: { label: "Com problema", cls: "border-red-400/60 text-red-300" },
};

export default async function TrafegoPage({ searchParams }: { searchParams: Promise<{ p?: string; sync?: string; rede?: string }> }) {
  await requireAdmin();
  const sp = await searchParams;
  const period: PeriodKey = (PERIODS.some((x) => x.key === sp.p) ? sp.p : "30") as PeriodKey;
  const { from, to } = periodRange(period);
  const fromTs = startOfDay(from);
  const toTs = startOfDay(addDays(to, 1));

  const [leads, revenueRows, byChannel, byCampaign, daily, manual, lastSync, terms] = await Promise.all([
    sql<{ id: string; attribution: Record<string, string>; created_at: Date }[]>`
      select id, attribution, created_at from appointments
      where source = 'site' and created_at >= ${fromTs} and created_at < ${toTs}`,
    sql<{ appointment_id: string; total: number }[]>`
      select q.appointment_id,
        greatest(0, coalesce((select sum(i.quantity * i.unit_price) from quote_items i where i.quote_id = q.id), 0) - q.discount + q.surcharge) as total
      from quotes q where q.status in ('aprovado', 'concluido') and q.appointment_id is not null`,
    sql<{ channel: string; cost: number; clicks: number; conversions: number }[]>`
      select channel, sum(cost) as cost, sum(clicks)::int as clicks, sum(conversions) as conversions
      from ad_costs where day between ${from} and ${to} group by channel`,
    sql<{ channel: string; campaign_id: string; name: string; cost: number; clicks: number; conv: number }[]>`
      select channel, campaign_id, max(campaign_name) as name, sum(cost) as cost, sum(clicks)::int as clicks, sum(conversions) as conv
      from ad_costs where day between ${from} and ${to} and campaign_id <> ''
      group by channel, campaign_id order by sum(cost) desc limit 12`,
    sql<{ day: string; cost: number }[]>`
      select day::text, sum(cost) as cost from ad_costs where day between ${from} and ${to} group by day order by day`,
    sql<{ id: string; day: string; channel: string; campaign_name: string; cost: number }[]>`
      select id, day::text, channel, campaign_name, cost from ad_costs
      where origin = 'manual' order by day desc, synced_at desc limit 6`,
    sql<{ last: Date | null }[]>`select max(synced_at) as last from ad_costs where origin = 'script'`,
    sql<TermItem[]>`
      select t.campaign_id, max(t.campaign_name) as campaign, t.term, sum(t.impressions)::int as imp, sum(t.clicks)::int as clicks,
        sum(t.cost)::float8 as cost, sum(t.conversions)::float8 as conv,
        (select n.id from ad_negatives n where n.campaign_id = t.campaign_id and lower(n.text) = lower(t.term) and n.removed_at is null limit 1) as neg_id
      from ad_search_terms t where t.day between ${from} and ${to}
      group by t.campaign_id, t.term order by sum(t.cost) desc, sum(t.clicks) desc limit 60`,
  ]);

  // ---- números ----
  const revenueByAppt = new Map(revenueRows.map((r) => [r.appointment_id, r.total]));
  const spendBy = (ch: string) => byChannel.find((c) => c.channel === ch)?.cost ?? 0;
  const metaSpend = spendBy("meta");
  const googleSpend = spendBy("google");
  // aba aberta: a que o usuário escolheu; sem escolha, a rede que mais gastou (empate = Meta)
  const tab: "meta" | "google" = sp.rede === "meta" || sp.rede === "google" ? sp.rede : googleSpend > metaSpend ? "google" : "meta";
  const campaignsOfTab = byCampaign.filter((c) => c.channel === tab);
  const meta = tab === "meta" ? await metaOverview() : null;
  const tabTotals = byChannel.find((c) => c.channel === tab);
  const spend = byChannel.reduce((s, c) => s + c.cost, 0);
  const clicks = byChannel.reduce((s, c) => s + c.clicks, 0);

  type Row = { label: string; paid: boolean; channel: string | null; leads: number; approved: number; revenue: number };
  const origins = new Map<string, Row>();
  const leadsByDay = new Map<string, number>();
  const leadsByCampaign = new Map<string, number>();
  let paidLeads = 0;
  let paidRevenue = 0;
  let paidApproved = 0;
  for (const l of leads) {
    const o = originOf(l.attribution);
    const rev = revenueByAppt.get(l.id);
    const row = origins.get(o.key) ?? { label: o.label, paid: o.paid, channel: o.channel, leads: 0, approved: 0, revenue: 0 };
    row.leads++;
    if (rev !== undefined) { row.approved++; row.revenue += rev; }
    origins.set(o.key, row);
    if (o.paid) {
      paidLeads++;
      if (rev !== undefined) { paidApproved++; paidRevenue += rev; }
      const k = dayKey(l.created_at);
      leadsByDay.set(k, (leadsByDay.get(k) ?? 0) + 1);
    }
    const camp = l.attribution?.utm_campaign;
    if (camp) leadsByCampaign.set(camp.toLowerCase(), (leadsByCampaign.get(camp.toLowerCase()) ?? 0) + 1);
  }
  const tabLeads = origins.get(tab === "meta" ? "meta_ads" : "google_ads")?.leads ?? 0;
  const originList = [...origins.values()].sort((a, b) => b.leads - a.leads);
  const cpl = safe(spend, paidLeads);
  const roi = safe(paidRevenue, spend);

  // ---- gráfico dos últimos dias ----
  const nDays = period === "7" ? 7 : 30;
  const chartDays = Array.from({ length: nDays }, (_, i) => addDays(to, i - (nDays - 1)));
  const costByDay = new Map(daily.map((d) => [d.day, d.cost]));
  const maxCost = Math.max(1, ...chartDays.map((d) => costByDay.get(d) ?? 0));

  // ---- configuração do script ----
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const origin = process.env.NEXT_PUBLIC_SITE_URL ?? `${h.get("x-forwarded-proto") ?? "https"}://${host}`;
  const tokenOk = (process.env.ADS_INGEST_TOKEN ?? "").length >= 24;
  const last = lastSync[0]?.last;

  const stat = (icon: React.ReactNode, value: string, label: string, hint?: string) => (
    <div className="edge-card flex min-h-28 flex-col justify-between p-4">
      <span className="text-gold">{icon}</span>
      <div>
        <p className="font-display text-3xl font-extrabold leading-none sm:text-4xl">{value}</p>
        <p className="mt-1 text-sm text-muted">{label}</p>
        {hint && <p className="text-xs text-gold">{hint}</p>}
      </div>
    </div>
  );
  const h2 = "font-display text-2xl font-bold uppercase";

  return (
    <>
      <PageTitle eyebrow="Painel" title="Tráfego" />

      <div className="-mx-4 mt-5 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
        {PERIODS.map((x) => (
          <Link
            key={x.key}
            href={`/admin/trafego?p=${x.key}`}
            className={`flex min-h-10 shrink-0 items-center rounded-full border px-4 text-sm font-semibold ${
              period === x.key ? "border-gold bg-gold text-black" : "border-border text-neutral-300 hover:border-gold/60"
            }`}
          >
            {x.label}
          </Link>
        ))}
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-3">
        {stat(<Wallet className="h-6 w-6" />, brl(spend), "Investido")}
        {stat(<Users className="h-6 w-6" />, String(paidLeads), "Leads de anúncio", `${leads.length} no total (todas as origens)`)}
        {stat(<CircleDollarSign className="h-6 w-6" />, paidLeads ? brl(cpl) : "—", "Custo por lead")}
        {stat(<MousePointerClick className="h-6 w-6" />, String(clicks), "Cliques nos anúncios")}
        {stat(<FileCheck2 className="h-6 w-6" />, brl(paidRevenue), "Orçamentos aprovados", paidApproved ? `${paidApproved} fechado(s) vindo de anúncio` : "dos leads de anúncio")}
        {stat(<TrendingUp className="h-6 w-6" />, spend > 0 && paidRevenue > 0 ? `${roi.toFixed(1).replace(".", ",")}x` : "—", "Retorno", spend > 0 && paidRevenue > 0 ? "cada R$ 1 investido volta" : undefined)}
      </div>
      {spend === 0 && (
        <p className="mt-3 rounded-xl border border-dashed border-border p-4 text-sm text-muted">
          Ainda não há gasto neste período. Lance o gasto à mão abaixo ou conecte o Google Ads/Meta para ele chegar sozinho.
        </p>
      )}

      {/* visitas do site (Google Analytics) */}
      <AnalyticsSection from={from} to={to} leads={leads.length} />

      {/* por origem */}
      <section className="mt-8">
        <h2 className={h2}>De onde vêm os clientes</h2>
        {originList.length === 0 ? (
          <p className="mt-3 rounded-xl border border-dashed border-border p-5 text-muted">Nenhum agendamento pelo site neste período.</p>
        ) : (
          <ul className="mt-3 space-y-3">
            {originList.map((o) => {
              const sp = o.channel ? spendBy(o.channel) : 0;
              return (
                <li key={o.label} className="edge-card p-4">
                  <div className="flex items-start justify-between gap-3">
                    <p className="font-semibold">{o.label}{o.paid && <span className="ml-2 rounded-full border border-gold/50 px-2 py-0.5 text-[11px] font-normal text-gold">pago</span>}</p>
                    <p className="font-display text-3xl font-extrabold leading-none">{o.leads}<span className="ml-1 font-sans text-sm font-normal text-muted">lead(s)</span></p>
                  </div>
                  <p className="mt-2 text-sm text-muted">
                    {o.approved} aprovado(s) · {brl(o.revenue)}
                    {o.paid && sp > 0 && <> · investido {brl(sp)} · <span className="text-foreground">{brl(safe(sp, o.leads))} por lead</span></>}
                  </p>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="mt-8">
        <h2 className={h2}>Investimento por dia</h2>
        <div className="edge-card mt-3 p-4">
          <div className="flex h-28 items-end gap-px" role="img" aria-label="Investimento diário">
            {chartDays.map((d) => {
              const v = costByDay.get(d) ?? 0;
              const l = leadsByDay.get(d) ?? 0;
              return (
                <div key={d} className="flex h-full min-w-0 flex-1 flex-col justify-end" title={`${fmtDay(d)}: ${brl(v)} · ${l} lead(s)`}>
                  {l > 0 && <span className="mb-0.5 h-1.5 rounded-full bg-emerald-400" />}
                  <span className={`block rounded-t-sm ${v > 0 ? "bg-gold" : "bg-border"}`} style={{ height: `${Math.max(v > 0 ? 6 : 2, (v / maxCost) * 100)}%` }} />
                </div>
              );
            })}
          </div>
          <div className="mt-2 flex justify-between text-xs text-muted"><span>{fmtDay(chartDays[0])}</span><span>{fmtDay(chartDays[chartDays.length - 1])}</span></div>
          <p className="mt-2 text-xs text-muted"><span className="text-gold">▮</span> gasto do dia · <span className="text-emerald-400">●</span> dia com lead de anúncio</p>
        </div>
      </section>

      {/* abas: o que muda embaixo é só a rede de anúncios */}
      <nav aria-label="Rede de anúncios" className="mt-10 flex gap-2 border-b border-border pb-3">
        {([["meta", "Meta", metaSpend], ["google", "Google", googleSpend]] as const).map(([key, label, v]) => (
          <Link
            key={key}
            href={`/admin/trafego?p=${period}&rede=${key}`}
            scroll={false}
            aria-current={tab === key ? "page" : undefined}
            className={`flex min-h-11 flex-1 flex-col items-center justify-center rounded-xl border px-3 text-sm font-semibold sm:flex-none sm:px-8 ${
              tab === key ? "border-gold bg-gold text-black" : "border-border text-neutral-300 hover:border-gold/60"
            }`}
          >
            <span>{label}</span>
            <span className={`text-xs font-normal ${tab === key ? "text-black/70" : "text-muted"}`}>{brl(v)} no período</span>
          </Link>
        ))}
      </nav>

      <dl className="mt-4 grid grid-cols-4 gap-2 text-center">
        {[
          ["Gasto", brl(tabTotals?.cost ?? 0)],
          ["Cliques", String(tabTotals?.clicks ?? 0)],
          ["Conversões", String(tabTotals?.conversions ?? 0).replace(".", ",")],
          ["Leads no site", String(tabLeads)],
        ].map(([label, value]) => (
          <div key={label} className="rounded-xl border border-border bg-surface px-1 py-2.5">
            <dd className="font-display text-xl font-extrabold leading-none">{value}</dd>
            <dt className="mt-1 text-[0.7rem] leading-tight text-muted">{label}</dt>
          </div>
        ))}
      </dl>

      {tab === "meta" && (
        <>
      {/* meta ads */}
      {metaAdsConfigured() && (
        <section className="mt-8">
          <h2 className={h2}>Anúncios</h2>
          {meta?.balance && (
            <p className="mt-2 text-sm text-muted">
              Saldo na Meta: <strong className="text-foreground">{meta.balance.replace(/^Saldo dispon[ií]vel\s*\(?/i, "").replace(/\)$/, "").replace(/\s*BRL$/i, "")}</strong>
            </p>
          )}
          {meta && meta.ads.length > 0 && (
            <ul className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
              {meta.ads.map((a) => {
                const st = META_STATUS[a.status] ?? { label: a.status, cls: "border-border text-muted" };
                const ctr = a.impressions > 0 ? (a.clicks / a.impressions) * 100 : 0;
                return (
                  <li key={a.id} className="edge-card overflow-hidden">
                    {a.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={a.image} alt={a.name} referrerPolicy="no-referrer" loading="lazy" className="aspect-[4/5] w-full object-cover" />
                    ) : (
                      <div className="grid aspect-[4/5] w-full place-items-center bg-surface-2 text-xs text-muted">sem imagem</div>
                    )}
                    <div className="p-3">
                      <span className={`inline-block rounded-full border px-2 py-0.5 text-[0.7rem] font-semibold ${st.cls}`}>{st.label}</span>
                      <p className="mt-1.5 line-clamp-2 text-sm font-semibold leading-tight">{a.name.replace(/^An[uú]ncio \d+ \| /, "")}</p>
                      <dl className="mt-2 grid grid-cols-2 gap-x-2 gap-y-1 text-xs">
                        <dt className="text-muted">Gasto</dt><dd className="text-right font-semibold text-gold">{brl(a.spend)}</dd>
                        <dt className="text-muted">Viram</dt><dd className="text-right">{a.impressions.toLocaleString("pt-BR")}</dd>
                        <dt className="text-muted">Cliques</dt><dd className="text-right">{a.clicks}{a.impressions > 0 && <span className="text-muted"> ({ctr.toFixed(1).replace(".", ",")}%)</span>}</dd>
                        <dt className="text-muted">Por clique</dt><dd className="text-right">{a.clicks > 0 ? brl(a.spend / a.clicks) : "—"}</dd>
                        <dt className="text-muted">Contatos</dt><dd className="text-right">{String(a.conversions).replace(".", ",")}</dd>
                      </dl>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
          {meta && meta.ads.length > 0 && <p className="mt-2 text-xs text-muted">Números dos últimos 30 dias, direto da Meta (atualiza a cada poucos minutos).</p>}
          {!meta && <p className="mt-3 text-sm text-yellow-300">Não consegui ler os anúncios da Meta agora. Os totais acima continuam valendo.</p>}
        </section>
      )}

      {/* campanhas */}
      {campaignsOfTab.length > 0 && (
        <section className="mt-6">
          <h2 className={h2}>Campanhas</h2>
          <ul className="mt-3 space-y-3">
            {campaignsOfTab.map((c) => {
              const l = c.channel === "meta" ? (origins.get("meta_ads")?.leads ?? 0) : (leadsByCampaign.get(c.campaign_id.toLowerCase()) ?? 0);
              return (
                <li key={c.channel + c.campaign_id} className="edge-card p-4">
                  <div className="flex items-start justify-between gap-3">
                    <p className="min-w-0 font-semibold">{c.name || c.campaign_id}<span className="ml-2 text-xs font-normal text-muted">{CHANNEL_LABEL[c.channel]}</span></p>
                    <p className="shrink-0 font-semibold text-gold">{brl(c.cost)}</p>
                  </div>
                  <p className="mt-2 text-sm text-muted">
                    {c.channel === "google" || c.channel === "meta" ? (
                      <>
                        {c.clicks} cliques · {String(c.conv).replace(".", ",")} conversões {c.channel === "google" ? "no Google" : "na Meta"} · <span className="text-foreground">{l} lead(s) no site</span>
                        {l > 0 && <> · {brl(safe(c.cost, l))} por lead</>}
                      </>
                    ) : (
                      "Gasto lançado à mão"
                    )}
                  </p>
                </li>
              );
            })}
          </ul>
        </section>
      )}

        <section className="mt-6">
          <div className="edge-card flex flex-wrap items-center justify-between gap-3 p-4">
            <p className="text-sm">
              <strong className="text-emerald-300">Conexão direta com a Meta ativa.</strong>{" "}
              <span className="text-muted">Gasto, cliques e conversões do Facebook e Instagram entram sozinhos todo dia.</span>
              {sp.sync === "ok" && <span className="mt-1 block text-emerald-300">✓ Atualizado agora.</span>}
              {sp.sync === "erro" && <span role="alert" className="mt-1 block text-red-300">Não consegui atualizar. Tente de novo em instantes.</span>}
            </p>
            <form action={syncAdsNow}>
              <SubmitButton className="btn btn-gold" pendingText="Atualizando…">Atualizar agora</SubmitButton>
            </form>
          </div>
        </section>
        </>
      )}

      {tab === "google" && (
        <>
      {/* campanhas */}
      {campaignsOfTab.length > 0 && (
        <section className="mt-6">
          <h2 className={h2}>Campanhas</h2>
          <ul className="mt-3 space-y-3">
            {campaignsOfTab.map((c) => {
              const l = c.channel === "meta" ? (origins.get("meta_ads")?.leads ?? 0) : (leadsByCampaign.get(c.campaign_id.toLowerCase()) ?? 0);
              return (
                <li key={c.channel + c.campaign_id} className="edge-card p-4">
                  <div className="flex items-start justify-between gap-3">
                    <p className="min-w-0 font-semibold">{c.name || c.campaign_id}<span className="ml-2 text-xs font-normal text-muted">{CHANNEL_LABEL[c.channel]}</span></p>
                    <p className="shrink-0 font-semibold text-gold">{brl(c.cost)}</p>
                  </div>
                  <p className="mt-2 text-sm text-muted">
                    {c.channel === "google" || c.channel === "meta" ? (
                      <>
                        {c.clicks} cliques · {String(c.conv).replace(".", ",")} conversões {c.channel === "google" ? "no Google" : "na Meta"} · <span className="text-foreground">{l} lead(s) no site</span>
                        {l > 0 && <> · {brl(safe(c.cost, l))} por lead</>}
                      </>
                    ) : (
                      "Gasto lançado à mão"
                    )}
                  </p>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {/* termos de pesquisa (Google) */}
      {terms.length > 0 && (
        <section className="mt-8">
          <h2 className={h2}>O que as pessoas digitaram</h2>
          <p className="mt-1 text-sm text-muted">
            Buscas no Google que levaram ao seu anúncio. Gastou e não trouxe contato? Toque em <strong>Negativar</strong> para parar de pagar por isso.
            {(() => {
              const wasted = terms.filter((t) => t.conv === 0 && !t.neg_id).reduce((n, t) => n + t.cost, 0);
              return wasted > 0 ? <> Hoje, <strong className="text-yellow-300">{brl(wasted)}</strong> foram para buscas sem nenhuma conversão.</> : null;
            })()}
          </p>
          <ul className="edge-card mt-3 divide-y divide-white/10 px-4">
            {terms.map((t) => <SearchTermRow key={`${t.campaign_id}-${t.term}`} t={t} />)}
          </ul>
        </section>
      )}

      {/* conectar google ads */}
      <section className="mt-8">
        <h2 className={h2}>Conectar o Google Ads</h2>
        <p className="mt-1 text-sm text-muted">
          {last ? <>Última atualização automática: {last.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", dateStyle: "short", timeStyle: "short" })}.</> : "Ainda não chegou nenhum dado automático."}{" "}
          Token no servidor: <strong className={tokenOk ? "text-emerald-300" : "text-yellow-300"}>{tokenOk ? "configurado" : "falta configurar"}</strong>.
        </p>
        {googleAdsConfigured() && (
          <div className="edge-card mt-3 flex flex-wrap items-center justify-between gap-3 p-4">
            <p className="text-sm">
              <strong className="text-emerald-300">Conexão direta com o Google Ads ativa.</strong>{" "}
              <span className="text-muted">Os custos e cliques entram sozinhos todo dia.</span>
              {sp.sync === "ok" && <span className="mt-1 block text-emerald-300">✓ Atualizado agora.</span>}
              {sp.sync === "erro" && <span role="alert" className="mt-1 block text-red-300">Não consegui atualizar. Tente de novo em instantes.</span>}
            </p>
            <form action={syncAdsNow}>
              <SubmitButton className="btn btn-gold" pendingText="Atualizando…">Atualizar agora</SubmitButton>
            </form>
          </div>
        )}
        <details className="edge-card mt-3 p-4" open={!last && !googleAdsConfigured()}>
          <summary className="min-h-11 cursor-pointer select-none py-2 font-semibold">Passo a passo (3 etapas)</summary>
          <ol className="mt-3 list-decimal space-y-4 pl-5 text-sm text-neutral-300">
            <li>
              <strong>Token de segurança.</strong> Na Vercel, em <em>Settings → Environment Variables</em>, crie <code className="text-gold">ADS_INGEST_TOKEN</code> com um texto secreto comprido (24+ caracteres) e faça um <em>Redeploy</em>. Esse mesmo texto vai no script.
            </li>
            <li>
              <strong>Script no Google Ads.</strong> Em <em>Ferramentas → Ações em massa → Scripts → Novo script</em>, cole o código abaixo, troque <code className="text-gold">COLE_AQUI_O_TOKEN</code> pelo token, autorize e agende para rodar <em>a cada hora</em>.
              <div className="mt-3"><CopyBox label="Script (copie e cole no Google Ads)" text={adsScript(`${origin}/api/ads/ingest`)} rows={9} /></div>
            </li>
            <li>
              <strong>Rastreamento dos cliques.</strong> Em <em>Configurações da conta → Configurações de acompanhamento → Modelo de acompanhamento</em>, cole a linha abaixo. Assim cada agendamento guarda de qual campanha veio.
              <div className="mt-3"><CopyBox label="Modelo de acompanhamento" text={TRACKING_TEMPLATE} rows={3} /></div>
            </li>
          </ol>
        </details>
      </section>
        </>
      )}

      {/* gasto manual */}
      <details className="mt-8">
        <summary className={`${h2} cursor-pointer select-none`}>Lançar gasto à mão</summary>
        <p className="mt-1 text-sm text-muted">Para quando o gasto não chega sozinho (boleto, etc.). Lançar de novo no mesmo dia soma ao valor.</p>
        <div className="edge-card mt-3 p-4"><SpendForm today={to} /></div>
        {manual.length > 0 && (
          <ul className="mt-3 divide-y divide-border rounded-xl border border-border">
            {manual.map((m) => (
              <li key={m.id} className="flex items-center justify-between gap-3 px-4 py-2 text-sm">
                <span className="min-w-0 truncate">{fmtDay(m.day)} · {CHANNEL_LABEL[m.channel]}{m.campaign_name ? ` · ${m.campaign_name}` : ""}</span>
                <span className="flex shrink-0 items-center gap-2">
                  <strong>{brl(m.cost)}</strong>
                  <form action={deleteManualSpend}>
                    <input type="hidden" name="id" value={m.id} />
                    <button className="px-2 py-2 text-red-300" aria-label="Remover lançamento">✕</button>
                  </form>
                </span>
              </li>
            ))}
          </ul>
        )}
      </details>

    </>
  );
}
