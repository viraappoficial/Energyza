"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { BookingForm } from "@/app/agendar/booking-form";
import { listBookingConfig } from "@/app/agendar/actions";

type Service = { id: string; name: string; description: string; duration_minutes: number };

const BookingContext = createContext<{ open: (serviceId?: string) => void }>({ open: () => {} });
export const useBooking = () => useContext(BookingContext);

// Botão que abre o modal "Agendar orçamento" em qualquer página.
export function BookingButton({
  className = "btn btn-gold",
  children = "Agendar orçamento",
  serviceId,
}: {
  className?: string;
  children?: React.ReactNode;
  serviceId?: string;
}) {
  const { open } = useBooking();
  return (
    <button type="button" className={className} onClick={() => open(serviceId)}>
      {children}
    </button>
  );
}

function ModalBody({ onClose, serviceId }: { onClose: () => void; serviceId?: string }) {
  const [config, setConfig] = useState<{ services: Service[]; openWeekdays: number[] } | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    listBookingConfig()
      .then((c) => alive && setConfig(c))
      .catch(() => alive && setFailed(true));
    return () => {
      alive = false;
    };
  }, []);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex shrink-0 items-start justify-between gap-4 border-b border-border px-5 py-4 [@media(max-height:700px)]:py-2.5">
        <div>
          <h2 className="font-display text-3xl font-extrabold uppercase leading-none">
            Agendar <span className="gold-text">orçamento</span>
          </h2>
          <p className="mt-1 text-sm text-muted [@media(max-height:700px)]:hidden">O eletricista confirma pelo WhatsApp.</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Fechar"
          className="grid h-11 w-11 shrink-0 place-items-center rounded-lg border border-border text-lg text-muted hover:border-gold hover:text-foreground"
        >
          ✕
        </button>
      </div>
      {failed ? (
        <p className="p-5 text-muted">Não foi possível carregar. Tente pelo WhatsApp.</p>
      ) : config === null ? (
        <p className="p-5 text-muted">Carregando…</p>
      ) : config.services.length === 0 ? (
        <p className="p-5 text-muted">Agendamento indisponível no momento. Fale pelo WhatsApp.</p>
      ) : (
        <BookingForm services={config.services} openWeekdays={config.openWeekdays} bare onClose={onClose} initialServiceId={serviceId} />
      )}
    </div>
  );
}

export function BookingProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [serviceId, setServiceId] = useState<string | undefined>();
  const dialogRef = useRef<HTMLDialogElement>(null);

  const open = useCallback((id?: string) => {
    setServiceId(id);
    setIsOpen(true);
  }, []);
  const close = useCallback(() => {
    setIsOpen(false);
    if (window.location.hash === "#agendar") {
      history.replaceState(null, "", window.location.pathname + window.location.search);
    }
  }, []);

  // abre/fecha o <dialog> nativo (foco preso, Esc fecha, fundo bloqueado)
  useEffect(() => {
    const d = dialogRef.current;
    if (!d) return;
    if (isOpen && !d.open) d.showModal();
    if (!isOpen && d.open) d.close();
  }, [isOpen]);

  // links com #agendar (anúncios, botões) abrem o modal
  useEffect(() => {
    const check = () => {
      if (window.location.hash === "#agendar") setIsOpen(true);
    };
    const t = setTimeout(check, 0);
    window.addEventListener("hashchange", check);
    return () => {
      clearTimeout(t);
      window.removeEventListener("hashchange", check);
    };
  }, []);

  return (
    <BookingContext.Provider value={{ open }}>
      {children}
      <dialog
        ref={dialogRef}
        onClose={close}
        onClick={(e) => {
          if (e.target === dialogRef.current) close(); // clique no fundo
        }}
        className="m-0 h-dvh max-h-none w-screen max-w-none overflow-hidden border-0 bg-surface p-0 text-foreground backdrop:bg-black/80 sm:m-auto sm:h-[min(46rem,92dvh)] sm:w-[min(100%-1.5rem,38rem)] sm:rounded-xl sm:border sm:border-border"
      >
        {isOpen && <ModalBody onClose={close} serviceId={serviceId} />}
      </dialog>
    </BookingContext.Provider>
  );
}
