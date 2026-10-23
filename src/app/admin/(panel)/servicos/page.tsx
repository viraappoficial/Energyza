import { createClient } from "@/lib/supabase/server";
import { saveService } from "../../actions";

export const dynamic = "force-dynamic";

function ServiceForm({ s }: { s?: { id: string; name: string; description: string; duration_minutes: number; active: boolean } }) {
  return (
    <form action={saveService} className="card space-y-3 p-4">
      {s && <input type="hidden" name="id" value={s.id} />}
      <div className="grid gap-3 sm:grid-cols-[1fr_8rem]">
        <input name="name" required placeholder="Nome do serviço" defaultValue={s?.name} className="input" />
        <input name="duration" type="number" min={15} max={480} step={15} defaultValue={s?.duration_minutes ?? 60} className="input" title="Duração em minutos" />
      </div>
      <textarea name="description" rows={2} placeholder="Descrição que aparece no site" defaultValue={s?.description} className="input" />
      <div className="flex items-center justify-between">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="active" defaultChecked={s?.active ?? true} /> Ativo no site
        </label>
        <button className="btn btn-outline !py-1.5 text-sm">{s ? "Salvar" : "Adicionar"}</button>
      </div>
    </form>
  );
}

export default async function ServicosPage() {
  const supabase = await createClient();
  const { data } = await supabase.from("services").select("*").order("sort_order");
  return (
    <>
      <h1 className="text-2xl font-bold">Serviços</h1>
      <p className="mb-6 mt-1 text-sm text-muted">Duração em minutos define o tamanho do bloco na agenda. Alterações aparecem no site.</p>
      <div className="space-y-3">
        {(data ?? []).map((s) => <ServiceForm key={s.id} s={s} />)}
        <h2 className="pt-4 text-lg font-semibold">Novo serviço</h2>
        <ServiceForm />
      </div>
    </>
  );
}
