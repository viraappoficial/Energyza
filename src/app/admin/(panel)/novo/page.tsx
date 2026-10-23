import { sql } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { ManualForm } from "./manual-form";

export default async function NovoAgendamento() {
  await requireAdmin();
  const services = await sql<{ id: string; name: string }[]>`
    select id, name from services where active order by sort_order`;
  return (
    <>
      <h1 className="mb-6 text-2xl font-bold">Novo agendamento</h1>
      <ManualForm services={services} />
    </>
  );
}
