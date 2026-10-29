import { sql } from "@/lib/db";
import { business } from "@/lib/config";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Contact, Faq, Hero, Process, Services, TrustStrip, Urgency, Works, type ServiceRow } from "@/components/home/sections";
import type { Hours } from "@/components/home/open-now";
import type { WorkItem } from "@/components/home/works-carousel";
import { listWorks } from "@/lib/works";

export const revalidate = 300;

const FALLBACK_SERVICES: ServiceRow[] = [
  { id: "1", name: "Instalações elétricas", description: "Instalações elétricas residenciais e comerciais: tomadas, interruptores, luminárias, chuveiros e ventiladores de teto." },
  { id: "2", name: "Manutenção elétrica", description: "Manutenção preventiva e corretiva: reparos, troca de componentes e correção de falhas elétricas." },
  { id: "3", name: "Quadros e disjuntores", description: "Instalação, substituição e manutenção de disjuntores e quadros elétricos." },
  { id: "4", name: "Diagnóstico elétrico", description: "Identificação de defeitos, curtos-circuitos e problemas em instalações." },
  { id: "5", name: "Iluminação e projetos elétricos", description: "Iluminação residencial e comercial e projetos elétricos, do ponto de luz ao planejamento da instalação." },
];
const FALLBACK_HOURS: Hours = [1, 2, 3, 4, 5].flatMap((weekday) => [
  { weekday, start: "08:00", end: "12:00" },
  { weekday, start: "13:00", end: "18:00" },
]);

async function loadData() {
  try {
    const [services, hours, works] = await Promise.all([
      sql<ServiceRow[]>`select id, name, description from services where active order by sort_order`,
      sql<{ weekday: number; start_time: string; end_time: string }[]>`
        select weekday, start_time::text, end_time::text from working_hours`,
      listWorks(true),
    ]);
    return {
      works,
      services: services.length > 0 ? services : FALLBACK_SERVICES,
      hours: hours.length > 0 ? hours.map((h) => ({ weekday: h.weekday, start: h.start_time.slice(0, 5), end: h.end_time.slice(0, 5) })) : FALLBACK_HOURS,
    };
  } catch {
    return { services: FALLBACK_SERVICES, hours: FALLBACK_HOURS, works: [] as WorkItem[] };
  }
}

export default async function Home() {
  const { services, hours, works } = await loadData();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Electrician",
    name: business.legalName,
    telephone: `+${business.whatsapp}`,
    email: business.email,
    sameAs: [business.instagram],
    areaServed: `${business.city}, ${business.state}`,
    address: { "@type": "PostalAddress", addressLocality: business.city, addressRegion: business.state, addressCountry: "BR" },
  };

  return (
    <>
      <SiteHeader />
      <main>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
        <Hero hours={hours} />
        <TrustStrip />
        <Services services={services} />
        <Works works={works} />
        <Urgency />
        <Process />
        <Faq />
        <Contact />
      </main>
      <SiteFooter />
    </>
  );
}
