"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { CalendarCheck, ChevronLeft, ChevronRight, CheckCircle2 } from "lucide-react";
import { createBooking, fetchSlots, type BookingState } from "./actions";
import { MAX_DAYS_AHEAD, whatsappLink } from "@/lib/config";
import { getAttribution, track } from "@/lib/analytics";
import { addDays, dayKey } from "@/lib/dates";
import { WhatsAppHandoff } from "./whatsapp-handoff";

type Service = { id: string; name: string; description: string; duration_minutes: number };
type Slot = { start: string; end: string; label: string };

const todayKey = () => dayKey(new Date());
const WEEKDAYS = ["D", "S", "T", "Q", "Q", "S", "S"];
const STEPS = ["O que precisa", "Dia e horário", "Seus dados"];

const weekdayOf = (key: string) => new Date(`${key}T12:00:00Z`).getUTCDay();

// Mini-calendário (no lugar do campo de data nativo, que estoura a largura no iPhone)
function Calendar({
  today,
  openWeekdays,
  selected,
  onPick,
}: {
  today: string;
  openWeekdays: number[];
  selected: string;
  onPick: (key: string) => void;
}) {
  const maxKey = addDays(today, MAX_DAYS_AHEAD);
  const [month, setMonth] = useState((selected || today).slice(0, 7));
  const [y, m] = month.split("-").map(Number);
  const offset = new Date(Date.UTC(y, m - 1, 1)).getUTCDay();
  const total = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const label = new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString("pt-BR", { month: "long", year: "numeric", timeZone: "UTC" });
  const shift = (d: number) => {
    const n = new Date(Date.UTC(y, m - 1 + d, 1));
    setMonth(`${n.getUTCFullYear()}-${String(n.getUTCMonth() + 1).padStart(2, "0")}`);
  };

  return (
    <div>
      <div className="mb-2 flex items-center justify-between [@media(max-height:700px)]:mb-1">
        <button type="button" onClick={() => shift(-1)} disabled={month <= today.slice(0, 7)} aria-label="Mês anterior" className="grid h-10 w-10 place-items-center rounded-lg border border-border disabled:opacity-30 [@media(max-height:700px)]:h-9 [@media(max-height:700px)]:w-9">
          <ChevronLeft className="h-5 w-5" />
        </button>
        <span className="font-display text-xl font-bold uppercase">{label}</span>
        <button type="button" onClick={() => shift(1)} disabled={month >= maxKey.slice(0, 7)} aria-label="Próximo mês" className="grid h-10 w-10 place-items-center rounded-lg border border-border disabled:opacity-30 [@media(max-height:700px)]:h-9 [@media(max-height:700px)]:w-9">
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-xs text-muted">
        {WEEKDAYS.map((w, i) => <span key={i} className="py-1">{w}</span>)}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: offset }, (_, i) => <span key={`b${i}`} />)}
        {Array.from({ length: total }, (_, i) => {
          const key = `${month}-${String(i + 1).padStart(2, "0")}`;
          const off = key < today || key > maxKey || !openWeekdays.includes(weekdayOf(key));
          const on = key === selected;
          return (
            <button
              type="button"
              key={key}
              disabled={off}
              onClick={() => onPick(key)}
              aria-pressed={on}
              className={`h-10 rounded-lg text-sm font-semibold transition-colors [@media(max-height:700px)]:h-8 [@media(max-height:600px)]:h-7 [@media(max-height:520px)]:h-6 ${
                on ? "bg-gold text-black" : off ? "text-neutral-700" : key === today ? "border border-gold/60 text-gold" : "border border-border hover:border-gold"
              }`}
            >
              {i + 1}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function BookingForm({
  services,
  openWeekdays,
  bare = false,
  onClose,
  initialServiceId,
}: {
  services: Service[];
  openWeekdays: number[];
  bare?: boolean; // dentro do modal: ocupa a altura inteira do popup
  onClose?: () => void;
  initialServiceId?: string;
}) {
  const [step, setStep] = useState(1);
  const [today] = useState(todayKey);
  const [serviceId, setServiceId] = useState(
    services.find((s) => s.id === initialServiceId)?.id ?? services[0]?.id ?? "",
  );
  const [notes, setNotes] = useState("");
  const [date, setDate] = useState("");
  const [slots, setSlots] = useState<Slot[] | null>(null);
  const [editingDay, setEditingDay] = useState(false); // telas baixas: reabre o calendário
  const [start, setStart] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
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

  const service = services.find((s) => s.id === serviceId);
  const canNext = step === 1 ? notes.trim().length >= 10 : step === 2 ? !!start : true;
  const when = start
    ? new Date(start).toLocaleString("pt-BR", { weekday: "long", day: "2-digit", month: "long", hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" })
    : "";

  function pickDay(key: string) {
    setDate(key);
    setEditingDay(false);
    setStart("");
    setSlots(null);
    startLoading(async () => {
      setSlots(await fetchSlots(serviceId, key));
    });
  }
  function changeService(id: string) {
    setServiceId(id);
    // outro serviço = outra duração: refaz a escolha do horário
    setDate("");
    setStart("");
    setSlots(null);
  }

  const shell = bare ? "flex min-h-0 flex-1 flex-col" : "edge-card mt-8 flex min-h-[34rem] flex-col";

  if (state.ok && state.summary) {
    // mensagem pronta para a Energyza: serviço, horário e quem é o cliente
    const msg = [
      "Olá! Acabei de agendar pelo site.",
      "",
      `*Serviço:* ${state.summary.service}`,
      `*Quando:* ${state.summary.when}`,
      `*Nome:* ${name}`,
      `*Endereço:* ${address}`,
      "",
      "Pode confirmar meu horário?",
    ].join("\n");
    return (
      <div className={`${shell} items-stretch justify-between`}>
        <div className="flex-1 overflow-y-auto p-5">
          <CheckCircle2 className="h-12 w-12 text-gold" />
          <h2 className="font-display mt-3 text-4xl font-extrabold uppercase leading-none">Pedido <span className="gold-text">enviado!</span></h2>
          <p className="mt-4 text-lg font-semibold">{state.summary.service}</p>
          <p className="text-neutral-300 first-letter:uppercase">{state.summary.when}</p>
          <p className="mt-4 rounded-lg border border-gold/40 bg-gold/10 p-3 text-[0.95rem]">
            <strong>Último passo:</strong> envie a mensagem no WhatsApp para a Energyza confirmar o seu horário.
          </p>
        </div>
        <div className="grid shrink-0 gap-2 border-t border-border p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <WhatsAppHandoff href={whatsappLink(msg)} />
          {onClose && <button type="button" onClick={onClose} className="btn btn-outline !py-3">Fechar</button>}
        </div>
      </div>
    );
  }

  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (step < 3) {
          e.preventDefault();
          if (canNext) setStep(step + 1);
        }
      }}
      className={shell}
    >
      <input type="hidden" name="serviceId" value={serviceId} />
      <input type="hidden" name="start" value={start} />
      <input type="hidden" name="notes" value={notes} />
      <input type="hidden" name="name" value={name} />
      <input type="hidden" name="phone" value={phone} />
      <input type="hidden" name="address" value={address} />
      <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden />

      {/* progresso */}
      <div className="shrink-0 px-5 pb-1 pt-3 [@media(max-height:600px)]:pt-2">
        <div className="flex gap-1.5" aria-hidden>
          {STEPS.map((_, i) => <span key={i} className={`h-1 flex-1 rounded-full ${i < step ? "bg-gold" : "bg-border"}`} />)}
        </div>
        <p className="mt-2 text-sm text-muted [@media(max-height:600px)]:mt-1">Passo {step} de 3 · <span className="font-semibold text-foreground">{STEPS[step - 1]}</span></p>
      </div>

      <div className="min-h-0 flex-1 space-y-4 overflow-x-hidden overflow-y-auto px-5 py-3 [@media(max-height:600px)]:space-y-2 [@media(max-height:600px)]:py-2">
        {step === 1 && (
          <div className="flex min-h-full flex-col gap-4 [@media(max-height:520px)]:grid [@media(max-height:520px)]:grid-cols-2 [@media(max-height:520px)]:items-start">
            <div>
              <label className="label" htmlFor="service">Serviço</label>
              <select id="service" className="input" value={serviceId} onChange={(e) => changeService(e.target.value)}>
                {services.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
              {service && <p className="mt-1.5 text-sm text-muted">{service.description}</p>}
            </div>
            <div className="flex flex-1 flex-col [@media(max-height:520px)]:h-full">
              <label className="label" htmlFor="notes">O que você precisa? *</label>
              <textarea
                id="notes"
                maxLength={1000}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="input min-h-24 flex-1 resize-none [@media(max-height:520px)]:min-h-28"
                placeholder="Ex.: chuveiro não esquenta, quero trocar 3 tomadas, disjuntor desarmando…"
              />
              <p className="mt-1 text-xs text-muted">{notes.trim().length < 10 ? "Descreva com pelo menos 10 letras." : "Ótimo!"}</p>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4 [@media(max-height:520px)]:grid [@media(max-height:520px)]:grid-cols-2 [@media(max-height:520px)]:items-start [@media(max-height:520px)]:gap-4 [@media(max-height:520px)]:space-y-0">
            {/* telas baixas: depois de escolher o dia, o calendário vira uma linha e sobra espaço para os horários */}
            <div className={date && !editingDay ? "[@media(max-height:700px)]:hidden" : ""}>
              <Calendar today={today} openWeekdays={openWeekdays} selected={date} onPick={pickDay} />
            </div>
            {date && !editingDay && (
              <div className="hidden items-center justify-between gap-3 rounded-lg border border-gold/30 bg-gold/5 px-3 py-2 text-sm [@media(max-height:700px)]:flex">
                <span className="font-semibold first-letter:uppercase">
                  {new Date(`${date}T12:00:00Z`).toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long", timeZone: "UTC" })}
                </span>
                <button type="button" onClick={() => setEditingDay(true)} className="min-h-9 shrink-0 px-2 font-semibold text-gold underline">Trocar dia</button>
              </div>
            )}
            <div>
              {!date ? (
                <p className="text-sm text-muted">Toque em um dia para ver os horários livres.</p>
              ) : loading || slots === null ? (
                <p className="text-sm text-muted">Buscando horários…</p>
              ) : slots.length === 0 ? (
                <p className="text-sm text-muted">Sem horários livres nesse dia. Escolha outro.</p>
              ) : (
                <div className="grid grid-cols-4 gap-2 sm:grid-cols-6 [@media(max-height:520px)]:grid-cols-4">
                  {slots.map((sl) => (
                    <button
                      type="button"
                      key={sl.start}
                      onClick={() => setStart(sl.start)}
                      aria-pressed={start === sl.start}
                      className={`h-10 rounded-lg border text-sm font-semibold [@media(max-height:700px)]:h-9 [@media(max-height:600px)]:h-8 ${start === sl.start ? "border-gold bg-gold text-black" : "border-border hover:border-gold"}`}
                    >
                      {sl.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4 [@media(max-height:620px)]:space-y-2.5 [@media(max-height:520px)]:grid [@media(max-height:520px)]:grid-cols-2 [@media(max-height:520px)]:items-start [@media(max-height:520px)]:gap-x-4 [@media(max-height:520px)]:space-y-0 [@media(max-height:520px)]:gap-y-2">
            <div className="rounded-lg border border-gold/30 bg-gold/5 p-3 text-sm">
              <p className="font-semibold">{service?.name}</p>
              <p className="text-neutral-300 first-letter:uppercase">{when}</p>
            </div>
            <div>
              <label className="label" htmlFor="name">Seu nome</label>
              <input id="name" required minLength={3} value={name} onChange={(e) => setName(e.target.value)} className="input" autoComplete="name" />
            </div>
            <div>
              <label className="label" htmlFor="phone">WhatsApp / telefone</label>
              <input id="phone" type="tel" required value={phone} onChange={(e) => setPhone(e.target.value)} className="input" autoComplete="tel" placeholder="(44) 99999-9999" />
            </div>
            <div>
              <label className="label" htmlFor="address">Endereço do atendimento</label>
              <input id="address" required minLength={5} value={address} onChange={(e) => setAddress(e.target.value)} className="input" autoComplete="street-address" placeholder="Rua, número, bairro" />
            </div>
          </div>
        )}
      </div>

      {state.error && <p className="mx-5 mb-2 rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-300">{state.error}</p>}

      <div className="flex shrink-0 gap-3 border-t border-border p-4 pb-[max(1rem,env(safe-area-inset-bottom))] [@media(max-height:600px)]:p-2.5 [@media(max-height:600px)]:pb-[max(0.625rem,env(safe-area-inset-bottom))]">
        {step > 1 && (
          <button type="button" onClick={() => setStep(step - 1)} className="btn btn-outline !px-5 !py-3.5" aria-label="Voltar">
            <ChevronLeft className="h-5 w-5" /> Voltar
          </button>
        )}
        {step < 3 ? (
          <button type="button" disabled={!canNext} onClick={() => setStep(step + 1)} className="btn btn-gold flex-1 !py-3.5">
            Continuar <ChevronRight className="h-5 w-5" />
          </button>
        ) : (
          <button className="btn btn-gold flex-1 !py-3.5" disabled={pending}>
            <CalendarCheck className="h-5 w-5" /> {pending ? "Enviando…" : "Agendar orçamento"}
          </button>
        )}
      </div>
    </form>
  );
}
