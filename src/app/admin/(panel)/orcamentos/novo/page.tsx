import { sql } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { dayKey } from "@/lib/dates";
import { QuoteForm, type CatalogItem, type QuoteInitial } from "../quote-form";
import { PageTitle } from "../../page-title";

export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-f-]{36}$/i;

export default async function NovoOrcamento({
  searchParams,
}: {
  searchParams: Promise<{ agendamento?: string; nome?: string; telefone?: string }>;
}) {
  await requireAdmin();
  const { agendamento, nome, telefone } = await searchParams;

  const catalog = await sql<CatalogItem[]>`
    select id, description, unit_price from quote_catalog order by description`;

  const initial: QuoteInitial = {
    name: "", phone: "", email: "", document: "", address: "", zip: "",
    neighborhood: "", city: "Maringá", state: "PR",
    discount: 0, surcharge: 0, validUntil: "", notes: "", items: [],
  };

  // vindo da agenda: já preenche com os dados do agendamento
  if (agendamento && UUID_RE.test(agendamento)) {
    const [a] = await sql<
      { id: string; service_name: string; customer_name: string; customer_phone: string; address: string; notes: string }[]
    >`select id, service_name, customer_name, customer_phone, address, notes from appointments where id = ${agendamento}`;
    if (a) {
      initial.appointmentId = a.id;
      initial.name = a.customer_name;
      initial.phone = a.customer_phone;
      initial.address = a.address;
      initial.items = [{ description: a.service_name, quantity: 1, unit_price: 0 }];
    }
  }

  // vindo da conversa do WhatsApp: já preenche nome e telefone
  if (!initial.name && nome) initial.name = nome.slice(0, 120);
  if (!initial.phone && telefone) initial.phone = telefone.replace(/\D/g, "").slice(0, 15);

  return (
    <>
      <div className="mb-6"><PageTitle eyebrow="Orçamentos" title="Novo orçamento" /></div>
      <QuoteForm initial={initial} catalog={catalog} today={dayKey(new Date())} />
    </>
  );
}
