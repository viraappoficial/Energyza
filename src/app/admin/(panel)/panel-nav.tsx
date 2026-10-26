"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  CalendarDays, CalendarPlus, Clock, MessageCircle, FileText, FilePlus2, LayoutDashboard, Menu, Plus, TrendingUp, Wrench, X,
} from "lucide-react";

const main = [
  { href: "/admin", label: "Início", icon: LayoutDashboard, exact: true },
  { href: "/admin/agenda", label: "Agenda", icon: CalendarDays },
  { href: "/admin/orcamentos", label: "Orçamentos", icon: FileText },
  { href: "/admin/conversas", label: "Conversas", icon: MessageCircle },
  { href: "/admin/trafego", label: "Tráfego", icon: TrendingUp },
  { href: "/admin/servicos", label: "Serviços", icon: Wrench },
  { href: "/admin/horarios", label: "Horários", icon: Clock },
];

function useActive() {
  const path = usePathname();
  return (href: string, exact?: boolean) => (exact ? path === href : path === href || path.startsWith(href + "/"));
}

// Menu lateral (computador)
export function SideNav() {
  const active = useActive();
  return (
    <nav className="mt-6 flex flex-col gap-1">
      {main.map(({ href, label, icon: Icon, exact }) => {
        const on = active(href, exact);
        return (
          <Link
            key={href}
            href={href}
            aria-current={on ? "page" : undefined}
            className={`flex min-h-11 items-center gap-3 rounded-lg border-l-2 px-3 text-[0.95rem] font-medium transition-colors ${
              on ? "border-gold bg-gold/10 text-gold" : "border-transparent text-neutral-300 hover:bg-white/5 hover:text-white"
            }`}
          >
            <Icon className="h-5 w-5" /> {label}
          </Link>
        );
      })}
    </nav>
  );
}

// Barra de baixo (celular): Início, Agenda, [+], Orçamentos, Mais
export function BottomNav() {
  const active = useActive();
  const [sheet, setSheet] = useState(false);
  const path = usePathname();
  // dentro de uma conversa a tela é cheia, como no WhatsApp
  const inChat = /^\/admin\/conversas\/.+/.test(path);
  const moreOn = active("/admin/mais") || active("/admin/conversas") || active("/admin/trafego") || active("/admin/servicos") || active("/admin/horarios");

  const tab = (href: string, label: string, Icon: typeof FileText, on: boolean) => (
    <Link
      href={href}
      aria-current={on ? "page" : undefined}
      className={`flex min-h-14 flex-col items-center justify-center gap-0.5 text-[11px] font-semibold ${on ? "text-gold" : "text-neutral-400"}`}
    >
      <Icon className="h-5 w-5" /> {label}
    </Link>
  );

  if (inChat) return null;

  return (
    <>
      {sheet && (
        <div className="fixed inset-0 z-40 lg:hidden" onClick={() => setSheet(false)}>
          <div className="absolute inset-0 bg-black/70" />
          <div className="absolute inset-x-3 bottom-[5.5rem]" onClick={(e) => e.stopPropagation()}>
            <div className="edge-card space-y-2 !border-gold/40 bg-[#0d0d0d] p-3">
              <Link href="/admin/orcamentos/novo" onClick={() => setSheet(false)} className="flex min-h-14 items-center gap-3 rounded-lg bg-gold px-4 font-bold text-black">
                <FilePlus2 className="h-6 w-6" /> Novo orçamento
              </Link>
              <Link href="/admin/novo" onClick={() => setSheet(false)} className="flex min-h-14 items-center gap-3 rounded-lg border border-border px-4 font-semibold">
                <CalendarPlus className="h-6 w-6 text-gold" /> Novo agendamento
              </Link>
            </div>
          </div>
        </div>
      )}
      <nav aria-label="Menu" className="fixed inset-x-0 bottom-0 z-50 grid grid-cols-5 border-t border-white/10 bg-black/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md lg:hidden">
        {tab("/admin", "Início", LayoutDashboard, active("/admin", true))}
        {tab("/admin/agenda", "Agenda", CalendarDays, active("/admin/agenda"))}
        <div className="relative flex items-center justify-center">
          <button
            type="button"
            onClick={() => setSheet((v) => !v)}
            aria-label={sheet ? "Fechar" : "Criar novo"}
            className="-mt-6 grid h-14 w-14 place-items-center rounded-full bg-gold text-black shadow-[0_8px_24px_-6px_rgba(224,160,48,0.7)]"
          >
            {sheet ? <X className="h-7 w-7" /> : <Plus className="h-7 w-7" />}
          </button>
        </div>
        {tab("/admin/orcamentos", "Orçamentos", FileText, active("/admin/orcamentos"))}
        {tab("/admin/mais", "Mais", Menu, moreOn)}
      </nav>
    </>
  );
}
