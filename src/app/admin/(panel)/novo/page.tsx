import { sql } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { ManualForm } from "./manual-form";
import { PageTitle } from "../page-title";

export default async function NovoAgendamento({
  searchParams,
}: {
  searchParams: Promise<{ data?: string }>;
}) {
  await requireAdmin();
  const { data } = await searchParams;
  const services = await sql<{ id: string; name: string }[]>`
    select id, name from services where active order by sort_order`;
  return (
    <>
      <div className="mb-6"><PageTitle eyebrow="Agenda" title="Novo agendamento" /></div>
      <ManualForm
        services={services}
        defaultDate={data && /^\d{4}-\d{2}-\d{2}$/.test(data) ? data : ""}
      />
    </>
  );
}
