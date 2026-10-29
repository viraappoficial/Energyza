import type { Metadata } from "next";
import { BadgeCheck, Clock, MapPin, MessageCircle } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { sql } from "@/lib/db";
import { business, whatsappLink } from "@/lib/config";
import { BookingForm } from "./booking-form";

export const metadata: Metadata = {
  title: "Agendar orçamento",
  description: "Escolha o serviço, o dia e o horário e agende seu eletricista online.",
};

export const dynamic = "force-dynamic";

const trust = [
  { icon: BadgeCheck, text: "NR-10 e NR-35" },
  { icon: Clock, text: "Sem compromisso" },
  { icon: MapPin, text: `${business.city} e região` },
];

export default async function AgendarPage() {
  const [services, days] = await Promise.all([
    sql<
      { id: string; name: string; description: string; duration_minutes: number }[]
    >`select id, name, description, duration_minutes from services where active order by sort_order`,
    sql<{ weekday: number }[]>`select distinct weekday from working_hours`,
  ]);

  return (
    <>
      <SiteHeader />
      <main className="relative isolate flex-1 overflow-hidden">
        <div className="bg-circuit pointer-events-none absolute inset-0 -z-10" />
        <div className="pointer-events-none absolute -right-24 -top-10 -z-10 h-[28rem] w-[28rem] rounded-full bg-[radial-gradient(circle,rgba(224,160,48,0.2),transparent_65%)]" />

        <div className="mx-auto w-full max-w-2xl px-4 pb-12 pt-8 sm:pt-12">
          <p className="font-display text-sm font-semibold uppercase tracking-[0.2em] text-gold">
            Eletricista em {business.city}/{business.state}
          </p>
          <h1 className="font-display mt-2 text-[2.9rem] font-extrabold uppercase leading-[0.92] sm:text-6xl">
            Peça seu <span className="gold-text">orçamento</span>
            <span className="text-gold">.</span>
          </h1>
          <p className="mt-4 max-w-md text-lg leading-relaxed text-neutral-300">
            Leva <strong className="text-white">1 minuto</strong>: conte o que precisa, escolha um horário livre e a gente confirma pelo WhatsApp.
          </p>

          <ul className="mt-5 flex flex-wrap gap-2 text-sm">
            {trust.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-1.5 rounded-full border border-gold/40 bg-gold/5 px-3 py-1.5 font-semibold text-gold">
                <Icon className="h-4 w-4" /> {text}
              </li>
            ))}
          </ul>

          <BookingForm services={services} openWeekdays={days.map((d) => d.weekday)} />

          <p className="mt-6 text-center text-sm text-muted">
            Prefere falar agora?{" "}
            <a
              href={whatsappLink("Olá! Gostaria de um orçamento.")}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 font-semibold text-gold underline"
            >
              <MessageCircle className="h-4 w-4" /> Chamar no WhatsApp
            </a>
          </p>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
