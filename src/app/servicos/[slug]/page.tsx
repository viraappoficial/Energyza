import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BadgeCheck, CalendarCheck, MessageCircle, Phone } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { BookingButton } from "@/components/booking-modal";
import { business, whatsappLink } from "@/lib/config";
import { getServicePage, servicePages } from "@/lib/service-pages";

export function generateStaticParams() {
  return servicePages.map((s) => ({ slug: s.slug }));
}

export async function generateMetadata({ params }: PageProps<"/servicos/[slug]">): Promise<Metadata> {
  const s = getServicePage((await params).slug);
  if (!s) return {};
  return {
    title: s.title,
    description: s.description,
    alternates: { canonical: `/servicos/${s.slug}` },
    openGraph: { title: `${s.title} | Energyza`, description: s.description, images: ["/logo.png"] },
  };
}

export default async function ServicoPage({ params }: PageProps<"/servicos/[slug]">) {
  const s = getServicePage((await params).slug);
  if (!s) notFound();
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "Service",
      name: s.name,
      description: s.description,
      areaServed: { "@type": "City", name: business.city },
      provider: { "@type": "Electrician", name: business.legalName, telephone: `+${business.whatsapp}`, url: base },
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: s.faqs.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
    },
  ];

  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-12">
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
        <nav className="text-sm text-muted">
          <Link href="/" className="hover:text-gold">Início</Link> / <Link href="/#servicos" className="hover:text-gold">Serviços</Link>
        </nav>
        <h1 className="font-display mt-4 text-4xl font-extrabold uppercase leading-[0.95] sm:text-5xl">{s.title}</h1>
        <p className="mt-5 text-lg leading-relaxed text-neutral-300">{s.intro}</p>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <BookingButton className="btn btn-gold !px-7 !py-4 text-lg"><CalendarCheck className="h-5 w-5" /> Agendar orçamento</BookingButton>
          <a href={whatsappLink(`Olá! Gostaria de um orçamento de ${s.name.toLowerCase()}.`)} target="_blank" rel="noopener noreferrer" className="btn btn-outline !px-7 !py-4 text-lg">
            <MessageCircle className="h-5 w-5" /> WhatsApp
          </a>
        </div>

        <h2 className="font-display mt-12 text-3xl font-bold uppercase text-gold">O que fazemos</h2>
        <ul className="mt-4 space-y-2">
          {s.items.map((i) => (
            <li key={i} className="flex items-start gap-3 text-neutral-300"><BadgeCheck className="mt-0.5 h-5 w-5 shrink-0 text-gold" /> {i}</li>
          ))}
        </ul>

        <h2 className="font-display mt-12 text-3xl font-bold uppercase text-gold">Quando chamar</h2>
        <ul className="mt-4 list-disc space-y-2 pl-5 text-neutral-300">
          {s.when.map((i) => <li key={i}>{i}</li>)}
        </ul>

        <h2 className="font-display mt-12 text-3xl font-bold uppercase text-gold">Como funciona</h2>
        <p className="mt-4 leading-relaxed text-neutral-300">
          Você agenda pelo site, avaliamos no local em {business.city}/{business.state} e região, e o orçamento chega em PDF no seu
          WhatsApp antes de começar. Execução com NR-10 e NR-35.
        </p>

        <h2 className="font-display mt-12 text-3xl font-bold uppercase text-gold">Dúvidas</h2>
        <div className="mt-4 space-y-5">
          {s.faqs.map((f) => (
            <div key={f.q}><h3 className="font-semibold">{f.q}</h3><p className="mt-1 text-muted">{f.a}</p></div>
          ))}
        </div>

        <h2 className="font-display mt-12 text-3xl font-bold uppercase text-gold">Outros serviços</h2>
        <ul className="mt-4 flex flex-wrap gap-2">
          {servicePages.filter((x) => x.slug !== s.slug).map((x) => (
            <li key={x.slug}><Link href={`/servicos/${x.slug}`} className="inline-flex min-h-10 items-center rounded-full border border-gold/40 px-4 text-sm text-gold hover:bg-gold/10">{x.name}</Link></li>
          ))}
        </ul>

        <p className="mt-10 flex items-center gap-2 text-sm text-muted"><Phone className="h-4 w-4 text-gold" /> {business.phoneDisplay} · {business.email}</p>
      </main>
      <SiteFooter />
    </>
  );
}
