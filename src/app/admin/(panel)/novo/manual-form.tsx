"use client";

import { useActionState } from "react";
import { createManualAppointment } from "../../actions";

export function ManualForm({
  services,
  defaultDate = "",
}: {
  services: { id: string; name: string }[];
  defaultDate?: string;
}) {
  const [state, action, pending] = useActionState(createManualAppointment, {} as { error?: string });
  return (
    <form action={action} className="edge-card max-w-2xl space-y-4 p-6">
      <div>
        <label className="label" htmlFor="serviceId">Serviço</label>
        <select id="serviceId" name="serviceId" className="input" required>
          {services.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="date">Data</label>
          <input id="date" name="date" type="date" required defaultValue={defaultDate} className="input" />
        </div>
        <div>
          <label className="label" htmlFor="time">Hora</label>
          <input id="time" name="time" type="time" required className="input" />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="name">Cliente</label>
          <input id="name" name="name" required className="input" />
        </div>
        <div>
          <label className="label" htmlFor="phone">Telefone</label>
          <input id="phone" name="phone" type="tel" className="input" />
        </div>
      </div>
      <div>
        <label className="label" htmlFor="address">Endereço</label>
        <input id="address" name="address" className="input" />
      </div>
      <div>
        <label className="label" htmlFor="notes">Observações</label>
        <textarea id="notes" name="notes" rows={3} className="input" />
      </div>
      {state.error && <p className="text-sm text-red-300">{state.error}</p>}
      <button className="btn btn-gold" disabled={pending}>{pending ? "Salvando…" : "Salvar na agenda"}</button>
    </form>
  );
}
