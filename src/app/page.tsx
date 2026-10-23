import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { business, whatsappLink } from "@/lib/config";
import { BookingButton } from "@/components/booking-modal";
import { sql } from "@/lib/db";

export const revalidate = 300;

const FALLBACK_SERVICES = [
  { id: "1", name: "Instalações elétricas", description: "Instalação de tomadas, interruptores, luminárias, chuveiros e ventiladores de teto." },
  { id: "2", name: "Manutenção elétrica", description: "Reparos, substituição de componentes e correção de falhas elétricas." },
  { id: "3", name: "Quadros e disjuntores", description: "Instalação, substituição e manutenção de disjuntores e quadros elétricos." },
  { id: "4", name: "Diagnóstico elétrico", description: "Identificação de defeitos, curtos-circuitos e problemas em instalações." },
];

async function loadServices() {
  try {
    const rows = await sql<{ id: string; name: string; description: string }[]>`
      select id, name, description from services where active order by sort_order`;
    return rows.length > 0 ? rows : FALLBACK_SERVICES;
  } catch {
    return FALLBACK_SERVICES;
  }
}

const steps = [
  { n: "1", t: "Conte o que precisa", d: "Escolha o serviço e descreva o problema." },
  { n: "2", t: "Marque dia e horário", d: "Veja os horários livres em tempo real." },
  { n: "3", t: "Receba o atendimento", d: "Vamos até você, no local, com segurança." },
];

export default async function Home() {
  const services = await loadServices();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Electrician",
    name: business.legalName,
    telephone: `+${business.whatsapp}`,
    email: business.email,
    areaServed: `${business.city}, ${business.state}`,
    address: { "@type": "PostalAddress", addressLocality: business.city, addressRegion: business.state, addressCountry: "BR" },
  };

  return (
    <>
      <SiteHeader />
      <main>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

        <section className="relative overflow-hidden border-b border-border">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(224,160,48,0.18),transparent_55%)]" />
          <div className="relative mx-auto max-w-6xl px-4 py-20 md:py-28">
            <p className="mb-4 inline-block rounded-full border border-gold/40 px-3 py-1 text-xs uppercase tracking-widest text-gold">
              {business.city} e região
            </p>
            <h1 className="max-w-3xl text-4xl font-bold leading-tight md:text-6xl">
              Soluções em elétrica com <span className="text-gold">segurança</span> e profissionalismo.
            </h1>
            <p className="mt-5 max-w-xl text-lg text-muted">
              Instalações, manutenção, quadros de luz e diagnóstico. Atendimento
              no local, por profissional certificado {business.certifications.join(" e ")}.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <BookingButton>Agendar orçamento</BookingButton>
              <a href={whatsappLink("Olá! Gostaria de um orçamento.")} target="_blank" rel="noopener noreferrer" className="btn btn-outline">
                Pedir orçamento no WhatsApp
              </a>
            </div>
          </div>
        </section>

        <section id="servicos" className="mx-auto max-w-6xl scroll-mt-16 px-4 py-16">
          <h2 className="text-3xl font-bold">Serviços</h2>
          <p className="mt-2 text-muted">O que fazemos para a sua casa ou empresa.</p>
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {services.map((s) => (
              <article key={s.id} className="card p-6 transition-colors hover:border-gold">
                <h3 className="text-xl font-semibold text-gold">{s.name}</h3>
                <p className="mt-2 text-muted">{s.description}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="border-y border-border bg-surface">
          <div className="mx-auto max-w-6xl px-4 py-16">
            <h2 className="text-3xl font-bold">Como funciona</h2>
            <div className="mt-8 grid gap-4 md:grid-cols-3">
              {steps.map((s) => (
                <div key={s.n} className="card p-6">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gold font-bold text-black">{s.n}</span>
                  <h3 className="mt-4 text-lg font-semibold">{s.t}</h3>
                  <p className="mt-1 text-muted">{s.d}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="sobre" className="mx-auto max-w-6xl scroll-mt-16 px-4 py-16">
          <h2 className="text-3xl font-bold">Sobre a Energyza</h2>
          <p className="mt-3 max-w-2xl text-muted">
            Trabalho com foco em segurança, qualidade e transparência: orçamento
            claro antes de começar e serviço feito dentro das normas.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            {business.certifications.map((c) => (
              <span key={c} className="rounded-lg border border-gold/50 px-4 py-2 font-semibold text-gold">
                {c}
              </span>
            ))}
          </div>
        </section>

        <section id="contato" className="scroll-mt-16 border-t border-border bg-surface">
          <div className="mx-auto max-w-6xl px-4 py-16">
            <h2 className="text-3xl font-bold">Fale com a gente</h2>
            <div className="mt-6 flex flex-wrap items-center gap-4">
              <a href={whatsappLink("Olá! Gostaria de um orçamento.")} target="_blank" rel="noopener noreferrer" className="btn btn-gold">
                WhatsApp {business.phoneDisplay}
              </a>
              <a href={`mailto:${business.email}`} className="btn btn-outline">{business.email}</a>
              <BookingButton className="btn btn-outline">Agendar orçamento</BookingButton>
            </div>
            <p className="mt-6 text-sm text-muted">
              Atendimento no local do cliente em {business.city}/{business.state} e região.
            </p>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
