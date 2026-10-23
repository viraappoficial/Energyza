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
import { listServices } from "@/app/agendar/actions";

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
  const [services, setServices] = useState<Service[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    listServices()
      .then((s) => alive && setServices(s))
      .catch(() => alive && setFailed(true));
    return () => {
      alive = false;
    };
  }, []);

  return (
    <div className="p-5 sm:p-6">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">
            Agendar <span className="text-gold">orçamento</span>
          </h2>
          <p className="mt-1 text-sm text-muted">
            Conte o que você precisa e escolha um horário. O eletricista confirma pelo WhatsApp.
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Fechar"
          className="rounded-lg border border-border px-3 py-1 text-lg leading-none text-muted hover:border-gold hover:text-foreground"
        >
          ✕
        </button>
      </div>
      {failed ? (
        <p className="text-muted">Não foi possível carregar. Tente pelo WhatsApp.</p>
      ) : services === null ? (
        <p className="text-muted">Carregando…</p>
      ) : services.length === 0 ? (
        <p className="text-muted">Agendamento indisponível no momento. Fale pelo WhatsApp.</p>
      ) : (
        <BookingForm services={services} bare onClose={onClose} initialServiceId={serviceId} />
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
        className="m-auto max-h-[92dvh] w-[min(100%-1.5rem,40rem)] overflow-y-auto rounded-xl border border-border bg-surface p-0 text-foreground backdrop:bg-black/75"
      >
        {isOpen && <ModalBody onClose={close} serviceId={serviceId} />}
      </dialog>
    </BookingContext.Provider>
  );
}
