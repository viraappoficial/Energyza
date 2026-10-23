import type { Metadata } from "next";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { sql } from "@/lib/db";
import { BookingForm } from "./booking-form";

export const metadata: Metadata = {
  title: "Agendar orçamento",
  description: "Escolha o serviço, o dia e o horário e agende seu eletricista online.",
};

export const dynamic = "force-dynamic";

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
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-10">
        <h1 className="text-3xl font-bold">Agendar orçamento</h1>
        <p className="mt-2 text-muted">
          Conte o que você precisa e escolha um horário livre. O eletricista confirma pelo WhatsApp.
        </p>
        <BookingForm services={services} openWeekdays={days.map((d) => d.weekday)} />
      </main>
      <SiteFooter />
    </>
  );
}
