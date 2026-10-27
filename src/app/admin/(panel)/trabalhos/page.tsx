import { requireAdmin } from "@/lib/auth";
import { listWorks, MAX_WORKS } from "@/lib/works";
import { PageTitle } from "../page-title";
import { WorkForm } from "./work-form";
import { WorkRow } from "./work-row";

export const dynamic = "force-dynamic";

export default async function TrabalhosPage() {
  await requireAdmin();
  const works = await listWorks(false);
  return (
    <>
      <PageTitle eyebrow="Site" title="Trabalhos" />
      <p className="mt-2 text-sm text-muted">
        Fotos de serviços já feitos. Aparecem na página inicial do site, em “Trabalhos realizados”, num carrossel que passa sozinho.
        Use o título e a descrição para dizer o que foi feito e onde.
      </p>

      <section className="mt-6">
        <h2 className="font-display text-2xl font-bold uppercase">Adicionar trabalho</h2>
        <div className="edge-card mt-3 p-4"><WorkForm /></div>
      </section>

      <section className="mt-8">
        <h2 className="font-display text-2xl font-bold uppercase">No site ({works.length}/{MAX_WORKS})</h2>
        {works.length === 0 ? (
          <p className="mt-3 rounded-xl border border-dashed border-border p-5 text-muted">Nenhum trabalho ainda. Adicione o primeiro acima.</p>
        ) : (
          <ul className="mt-3 space-y-3">
            {works.map((w, i) => <WorkRow key={w.id} w={w} first={i === 0} last={i === works.length - 1} />)}
          </ul>
        )}
      </section>
    </>
  );
}
