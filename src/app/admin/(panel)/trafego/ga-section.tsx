import { Clock, Eye, Globe, MousePointerClick, Percent, Users } from "lucide-react";
import { GA_CHANNEL, ga4Configured, loadGa4, type GaData } from "@/lib/ga4";

const h2 = "font-display text-2xl font-bold uppercase";
const fmtDay = (d: string) => d.split("-").reverse().slice(0, 2).join("/");
const fmtDur = (s: number) => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, "0")}`;
const pct = (n: number) => `${(Math.round(n * 10) / 10).toString().replace(".", ",")}%`;

function Card({ children }: { children: React.ReactNode }) {
  return <section className="mt-8">{children}</section>;
}

// Visitas do site (Google Analytics). `leads` = agendamentos pelo site no mesmo período (vêm do nosso banco).
export async function AnalyticsSection({ from, to, leads }: { from: string; to: string; leads: number }) {
  if (!ga4Configured()) {
    return (
      <Card>
        <h2 className={h2}>Visitas do site</h2>
        <div className="edge-card mt-3 space-y-2 p-4 text-sm">
          <p className="font-semibold">Google Analytics ainda não conectado</p>
          <p className="text-muted">
            Conecte para ver aqui quantas pessoas visitam o site, de onde vêm e quantas viram agendamento. É só leitura: o painel
            não altera nada no Analytics. Passo a passo em <code>docs/analytics.md</code>: criar uma conta de serviço, dar acesso de
            “Leitor” a ela no Analytics e cadastrar <code>GA4_PROPERTY_ID</code> e <code>GOOGLE_SERVICE_ACCOUNT_JSON</code> na Vercel.
          </p>
        </div>
      </Card>
    );
  }

  let d: GaData;
  try {
    d = await loadGa4(from < "2023-01-01" ? "2023-01-01" : from, to);
  } catch (e) {
    const msg = (e as Error).message;
    const hint = /403|PERMISSION/i.test(msg)
      ? "O Google recusou o acesso: no Analytics, em Administrador → Acesso à propriedade, adicione o e-mail da conta de serviço como “Leitor”."
      : /401|token|invalid_grant/i.test(msg)
        ? "A chave da conta de serviço foi recusada. Confira o GOOGLE_SERVICE_ACCOUNT_JSON."
        : /404/.test(msg)
          ? "Propriedade não encontrada. Confira o GA4_PROPERTY_ID (é o número da propriedade, não o código G-…)."
          : "Tente de novo em instantes.";
    console.error("[ga4]", msg);
    return (
      <Card>
        <h2 className={h2}>Visitas do site</h2>
        <p className="mt-3 rounded-xl border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-300">Não consegui ler o Google Analytics agora. {hint}</p>
      </Card>
    );
  }

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

  const maxCh = Math.max(1, ...d.channels.map((c) => c.sessions));
  const maxPg = Math.max(1, ...d.pages.map((p) => p.views));
  const maxDay = Math.max(1, ...d.days.map((x) => x.sessions));
  const rate = d.sessions > 0 ? (leads / d.sessions) * 100 : 0;
  const contacts = d.events.contact ?? 0;

  return (
    <Card>
      <h2 className={h2}>Visitas do site</h2>
      <p className="mt-1 text-xs text-muted">Google Analytics. Só conta quem aceitou os cookies do site, então os números reais são um pouco maiores.</p>

      <div className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-3">
        {stat(<Users className="h-6 w-6" />, String(d.users), "Visitantes")}
        {stat(<Eye className="h-6 w-6" />, String(d.sessions), "Visitas", `${d.views} páginas vistas`)}
        {stat(<Clock className="h-6 w-6" />, d.sessions ? fmtDur(d.avgSeconds) : "—", "Tempo médio na visita")}
        {stat(<Percent className="h-6 w-6" />, d.sessions ? pct(rate) : "—", "Visitas que viram agendamento", `${leads} agendamento(s) no período`)}
        {stat(<MousePointerClick className="h-6 w-6" />, String(contacts), "Toques em WhatsApp/telefone")}
      </div>

      {d.sessions === 0 ? (
        <p className="mt-3 rounded-xl border border-dashed border-border p-4 text-sm text-muted">Nenhuma visita registrada neste período ainda.</p>
      ) : (
        <>
          <div className="edge-card mt-4 p-4">
            <p className="font-semibold">Visitas por dia</p>
            <div className="mt-3 flex h-24 items-end gap-px" role="img" aria-label="Visitas por dia">
              {d.days.map((x) => (
                <div key={x.day} className="flex h-full min-w-0 flex-1 flex-col justify-end" title={`${fmtDay(x.day)}: ${x.sessions} visita(s)`}>
                  <span className={`block rounded-t-sm ${x.sessions > 0 ? "bg-gold" : "bg-border"}`} style={{ height: `${Math.max(x.sessions > 0 ? 6 : 2, (x.sessions / maxDay) * 100)}%` }} />
                </div>
              ))}
            </div>
            <div className="mt-2 flex justify-between text-xs text-muted"><span>{fmtDay(d.days[0].day)}</span><span>{fmtDay(d.days[d.days.length - 1].day)}</span></div>
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <div className="edge-card p-4">
              <p className="flex items-center gap-2 font-semibold"><Globe className="h-4 w-4 text-gold" /> De onde vêm as visitas</p>
              <ul className="mt-3 space-y-3">
                {d.channels.map((c) => (
                  <li key={c.name}>
                    <div className="flex items-baseline justify-between gap-3 text-sm"><span className="min-w-0 truncate">{GA_CHANNEL[c.name] ?? c.name}</span><span className="shrink-0 font-semibold">{c.sessions} <span className="font-normal text-muted">({pct((c.sessions / d.sessions) * 100)})</span></span></div>
                    <div className="mt-1 h-1.5 rounded-full bg-border"><div className="h-full rounded-full bg-gold" style={{ width: `${(c.sessions / maxCh) * 100}%` }} /></div>
                  </li>
                ))}
              </ul>
            </div>
            <div className="edge-card p-4">
              <p className="font-semibold">Páginas mais vistas</p>
              <ul className="mt-3 space-y-3">
                {d.pages.map((p) => (
                  <li key={p.path}>
                    <div className="flex items-baseline justify-between gap-3 text-sm"><span className="min-w-0 truncate">{p.path === "/" ? "Página inicial" : p.path}</span><span className="shrink-0 font-semibold">{p.views}</span></div>
                    <div className="mt-1 h-1.5 rounded-full bg-border"><div className="h-full rounded-full bg-gold" style={{ width: `${(p.views / maxPg) * 100}%` }} /></div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </>
      )}
    </Card>
  );
}
