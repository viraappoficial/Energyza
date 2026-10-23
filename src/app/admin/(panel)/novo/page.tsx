import { createClient } from "@/lib/supabase/server";
import { ManualForm } from "./manual-form";

export default async function NovoAgendamento() {
  const supabase = await createClient();
  const { data: services } = await supabase
    .from("services")
    .select("id,name")
    .eq("active", true)
    .order("sort_order");
  return (
    <>
      <h1 className="mb-6 text-2xl font-bold">Novo agendamento</h1>
      <ManualForm services={services ?? []} />
    </>
  );
}
