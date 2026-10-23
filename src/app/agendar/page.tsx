import type { Metadata } from "next";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { createClient } from "@/lib/supabase/server";
import { BookingForm } from "./booking-form";

export const metadata: Metadata = {
  title: "Agendar visita",
  description: "Escolha o serviço, o dia e o horário e agende seu eletricista online.",
};

export const dynamic = "force-dynamic";

export default async function AgendarPage() {
  const supabase = await createClient();
  const { data: services } = await supabase
    .from("services")
    .select("id,name,description,duration_minutes")
    .eq("active", true)
    .order("sort_order");

  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-10">
        <h1 className="text-3xl font-bold">Agendar visita</h1>
        <p className="mt-2 text-muted">
          Escolha o serviço e um horário livre. O eletricista confirma pelo WhatsApp.
        </p>
        <BookingForm services={services ?? []} />
      </main>
      <SiteFooter />
    </>
  );
}
