"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { createBooking, fetchSlots, type BookingState } from "./actions";
import { whatsappLink } from "@/lib/config";
import { getAttribution, track } from "@/lib/analytics";

type Service = { id: string; name: string; description: string; duration_minutes: number };
type Slot = { start: string; end: string; label: string };

function todayStr() {
  // data "de hoje" em São Paulo
  return new Date(Date.now() - 3 * 3_600_000).toISOString().slice(0, 10);
}

export function BookingForm({
  services,
  bare = false,
  onClose,
}: {
  services: Service[];
  bare?: boolean; // dentro do modal: sem cartão/margem
  onClose?: () => void;
}) {
  const wrap = bare ? "" : "card mt-8 p-6";
  const [serviceId, setServiceId] = useState(services[0]?.id ?? "");
  const [date, setDate] = useState("");
  const [slots, setSlots] = useState<Slot[] | null>(null);
  const [start, setStart] = useState("");
  const [loading, startLoading] = useTransition();
  const [state, action, pending] = useActionState<BookingState, FormData>(
    async (prev, fd) => {
      fd.set("attribution", getAttribution());
      return createBooking(prev, fd);
    },
    { ok: false },
  );

  // conversão: agendamento enviado
  useEffect(() => {
    if (state.ok && state.summary) track("lead", { service: state.summary.service });
  }, [state.ok, state.summary]);
  const [min] = useState(todayStr);

  function loadSlots(sid: string, d: string) {
    setStart("");
    if (!sid || !d) {
      setSlots(null);
      return;
    }
    setSlots(null);
    startLoading(async () => {
      setSlots(await fetchSlots(sid, d));
    });
  }

  if (state.ok && state.summary) {
    return (
      <div className={wrap}>
        <h2 className="text-2xl font-bold text-gold">Pedido enviado! ✅</h2>
        <p className="mt-3">
          <strong>{state.summary.service}</strong>
          <br />
          {state.summary.when}
        </p>
        <p className="mt-3 text-muted">
          O eletricista vai confirmar seu horário em breve pelo WhatsApp.
        </p>
        <a
          href={whatsappLink(`Olá! Acabei de agendar ${state.summary.service} para ${state.summary.when}.`)}
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-gold mt-5"
        >
          Avisar no WhatsApp
        </a>
        {onClose && (
          <button type="button" onClick={onClose} className="btn btn-outline mt-3 ml-3">
            Fechar
          </button>
        )}
      </div>
    );
  }

  return (
    <form action={action} className={`${wrap} space-y-5`}>
      <input type="hidden" name="serviceId" value={serviceId} />
      <input type="hidden" name="start" value={start} />
      <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden />

      <div>
        <label className="label" htmlFor="service">1. Serviço</label>
        <select id="service" className="input" value={serviceId} onChange={(e) => {
            setServiceId(e.target.value);
            loadSlots(e.target.value, date);
          }}>
          {services.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
        <p className="mt-1 text-sm text-muted">
          {services.find((s) => s.id === serviceId)?.description}
        </p>
      </div>

      <div>
        <label className="label" htmlFor="date">2. Dia</label>
        <input id="date" type="date" className="input" min={min} value={date} onChange={(e) => {
            setDate(e.target.value);
            loadSlots(serviceId, e.target.value);
          }} />
      </div>

      {date && (
        <div>
          <span className="label">3. Horário</span>
          {loading || slots === null ? (
            <p className="text-muted">Buscando horários…</p>
          ) : slots.length === 0 ? (
            <p className="text-muted">Sem horários livres nesse dia. Tente outra data.</p>
          ) : (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {slots.map((s) => (
                <button
                  type="button"
                  key={s.start}
                  onClick={() => setStart(s.start)}
                  className={`rounded-lg border px-2 py-2 text-sm font-semibold ${
                    start === s.start ? "border-gold bg-gold text-black" : "border-border hover:border-gold"
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="name">Seu nome</label>
          <input id="name" name="name" required minLength={3} className="input" autoComplete="name" />
        </div>
        <div>
          <label className="label" htmlFor="phone">WhatsApp / telefone</label>
          <input id="phone" name="phone" type="tel" required className="input" autoComplete="tel" placeholder="(44) 99999-9999" />
        </div>
      </div>
      <div>
        <label className="label" htmlFor="address">Endereço do atendimento</label>
        <input id="address" name="address" required minLength={5} className="input" autoComplete="street-address" placeholder="Rua, número, bairro" />
      </div>
      <div>
        <label className="label" htmlFor="notes">O que você precisa? *</label>
        <textarea
          id="notes"
          name="notes"
          rows={4}
          required
          minLength={10}
          maxLength={1000}
          className="input"
          placeholder="Ex.: chuveiro não esquenta, quero trocar 3 tomadas, disjuntor desarmando…"
        />
      </div>

      {state.error && <p className="rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-300">{state.error}</p>}

      <button className="btn btn-gold w-full" disabled={pending || !start}>
        {pending ? "Enviando…" : start ? "Agendar orçamento" : "Escolha um horário"}
      </button>
    </form>
  );
}
