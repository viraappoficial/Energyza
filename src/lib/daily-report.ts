import { sql } from "@/lib/db";
import { brl } from "@/lib/format";
import { addDays, dayKey, startOfDay } from "@/lib/dates";
import { allow } from "@/lib/rate-limit";
import { originOf } from "@/lib/traffic";
import { metaAdsConfigured, metaHealth } from "@/lib/meta-ads";
import { notifyOwnerWhatsApp, ownerPhone } from "@/lib/waha";

// Relatório diário para o WhatsApp do dono: reconhecimento (quem viu), conversão (quem pediu orçamento),
// alertas (saldo, limite, anúncio com problema) e uma dica. Só leitura: nunca mexe nas campanhas.

const TIPS = [
  "Peça uma avaliação no Google para o último cliente satisfeito. Poucas avaliações novas por semana já ajudam a aparecer no Maps.",
  "Poste hoje uma foto de obra concluída (com autorização do cliente). Quem vê o serviço pronto confia mais.",
  "Responda quem chamou pelo anúncio em até 10 minutos. Em serviço urgente, quem responde primeiro costuma fechar.",
  "Peça indicação ao cliente que acabou de pagar: um \"conhece alguém que precise?\" rende mais que anúncio.",
  "Confira o Perfil da Empresa no Google: horário, telefone e fotos atualizados.",
  "Atende urgência? Avise nos stories antes do fim de semana: quem fica sem luz no sábado procura rápido.",
  "Abra o Tráfego no painel e veja o que as pessoas digitaram no Google. O que não tem a ver com o serviço, é só negativar.",
];

type Day = { cost: number; clicks: number; impressions: number; conv: number };
const zero: Day = { cost: 0, clicks: 0, impressions: 0, conv: 0 };
const pct = (a: number, b: number) => (b > 0 ? `${((a / b) * 100).toFixed(1).replace(".", ",")}%` : "—");
const num = (n: number) => n.toLocaleString("pt-BR");

export async function buildDailyReport(now = new Date()): Promise<string> {
  const hoje = dayKey(now);
  const ontem = addDays(hoje, -1);

  const [costs, leads, week, meta] = await Promise.all([
    sql<{ channel: string; cost: number; clicks: number; impressions: number; conv: number }[]>`
      select channel, sum(cost) as cost, sum(clicks)::int as clicks, sum(impressions)::int as impressions, sum(conversions) as conv
      from ad_costs where day = ${ontem} group by channel`,
    sql<{ attribution: Record<string, string> }[]>`
      select attribution from appointments
      where source = 'site' and status <> 'cancelado' and created_at >= ${startOfDay(ontem)} and created_at < ${startOfDay(hoje)}`,
    sql<{ clicks: number; leads: number }[]>`
      select (select coalesce(sum(clicks), 0)::int from ad_costs where day between ${addDays(hoje, -7)} and ${ontem}) as clicks,
             (select count(*)::int from appointments where source = 'site' and status <> 'cancelado' and created_at >= ${startOfDay(addDays(hoje, -7))} and created_at < ${startOfDay(hoje)}) as leads`,
    metaAdsConfigured() ? metaHealth() : Promise.resolve(null),
  ]);

  const g: Day = costs.find((c) => c.channel === "google") ?? zero;
  const m = costs.find((c) => c.channel === "meta") ?? zero;
  const paid = leads.filter((l) => originOf(l.attribution).paid).length;
  const fromMeta = leads.filter((l) => originOf(l.attribution).key === "meta_ads").length;
  const fromGoogle = leads.filter((l) => originOf(l.attribution).key === "google_ads").length;
  const contacts = Number(g.conv ?? 0) + (meta?.yesterday.conversions ?? Number(m.conv ?? 0)); // WhatsApp/telefone/agendamento registrados pelos anúncios
  const spend = Number(g.cost ?? 0) + (meta?.yesterday.spend ?? Number(m.cost ?? 0));

  const lines: string[] = [];
  lines.push(`📊 *Energyza · resumo de ontem*`, "");

  // alertas primeiro: é o que exige ação
  const alerts: string[] = [];
  if (meta) {
    if (meta.problems.length) alerts.push(`🚫 Anúncio com problema na Meta: ${meta.problems.join(", ")}. Abra o Gerenciador de Anúncios.`);
    if (meta.capLeft !== null && meta.capLeft <= 0.5) alerts.push("⛔ A Meta bateu o limite de gasto da conta: os anúncios estão *parados*, mesmo com saldo. Para voltar: aumente o *limite de gasto* em Configurações da conta de anúncios, no Gerenciador da Meta.");
    else if (meta.balance !== null && meta.balance <= 0.5) alerts.push("⛔ Saldo da Meta *zerado*: os anúncios pararam. Recarregue para voltar.");
    else if (meta.balance !== null && meta.balance < 12) alerts.push(`⚠️ Saldo da Meta baixo: ${brl(meta.balance)}. Dura pouco mais de ${Math.max(1, Math.floor(meta.balance / 10))} dia(s) a R$10/dia.`);
  }
  if (alerts.length) lines.push(...alerts, "");

  lines.push("👀 *Reconhecimento (quem viu)*");
  if (meta) lines.push(`Meta: ${num(meta.yesterday.reach)} pessoas alcançadas, ${num(meta.yesterday.clicks)} clicaram (${pct(meta.yesterday.clicks, meta.yesterday.impressions)})`);
  lines.push(`Google: ${num(g.impressions ?? 0)} vezes visto, ${num(g.clicks ?? 0)} cliques (${pct(g.clicks ?? 0, g.impressions ?? 0)})`, "");

  lines.push("📩 *Conversão (quem pediu)*");
  lines.push(`Pedidos de orçamento no site: ${leads.length}${leads.length ? ` (${paid} de anúncio${fromMeta ? `, ${fromMeta} da Meta` : ""}${fromGoogle ? `, ${fromGoogle} do Google` : ""})` : ""}`);
  lines.push(`Contatos registrados pelos anúncios: ${String(Math.round(contacts * 10) / 10).replace(".", ",")}`);
  if (spend > 0) lines.push(`Investido: ${brl(spend)}${leads.length ? ` · ${brl(spend / leads.length)} por pedido` : ""}`);
  lines.push("");

  // qual anúncio da Meta está ganhando (últimos 7 dias)
  const top = meta?.ads.filter((a) => a.clicks > 0).sort((a, b) => b.clicks - a.clicks)[0];
  const totalClicks = meta?.ads.reduce((s, a) => s + a.clicks, 0) ?? 0;
  if (top && totalClicks >= 10) lines.push(`🏆 Anúncio que mais atrai: "${top.name}" (${Math.round((top.clicks / totalClicks) * 100)}% dos cliques da semana)`, "");

  // dica do dia: regra pelos números; senão, a dica da semana
  let tip: string | null = null;
  if ((week[0]?.clicks ?? 0) >= 60 && (week[0]?.leads ?? 0) === 0) {
    tip = "Muita gente clica e ninguém pede orçamento ainda. Teste a página no seu celular como se fosse cliente e veja se algo trava. Pode ser hora de pôr o botão do WhatsApp mais à vista.";
  }
  lines.push(`💡 *Dica:* ${tip ?? TIPS[new Date(now.getTime() - 3 * 3_600_000).getUTCDay()]}`);
  return lines.join("\n");
}

// Guarda o relatório na conversa do dono no painel (se ela existir), para aparecer lá com o ✓/✓✓ de entrega.
// O recebimento do WhatsApp descarta a conversa com o dono, então sem isto o envio ficaria invisível.
async function recordInOwnerChat(id: string | null, text: string) {
  try {
    const tail = ownerPhone().slice(-8);
    if (!id || tail.length < 8) return;
    const [chat] = await sql<{ chat_id: string }[]>`
      select chat_id from wa_chats where right(regexp_replace(phone, '\\D', '', 'g'), 8) = ${tail} order by last_at desc limit 1`;
    if (!chat) return;
    await sql`insert into wa_messages (id, chat_id, from_me, body, at, ack) values (${id}, ${chat.chat_id}, true, ${text}, now(), 1) on conflict (id) do nothing`;
    await sql`update wa_chats set last_body = ${text.split("\n")[0]}, last_at = now() where chat_id = ${chat.chat_id}`;
  } catch (e) {
    console.error("[relatorio] não consegui registrar na conversa do dono:", (e as Error).message);
  }
}

// Manda o relatório. `manual` = botão do painel (limite próprio); o automático só sai uma vez por dia.
export async function sendDailyReport(manual = false): Promise<{ status: "enviado" | "ja-enviado" | "falhou"; error?: string }> {
  if (!(await allow(manual ? "report:manual" : "report:daily", manual ? 6 : 1, manual ? 3600 : 72_000))) return { status: "ja-enviado" };
  const text = await buildDailyReport();
  const r = await notifyOwnerWhatsApp(text);
  if (!r.ok) return { status: "falhou", error: r.error };
  await recordInOwnerChat(r.id, text);
  return { status: "enviado" };
}
