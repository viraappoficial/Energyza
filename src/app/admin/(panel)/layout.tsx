import Image from "next/image";
import Link from "next/link";
import { ExternalLink, LogOut } from "lucide-react";
import { sql } from "@/lib/db";
import { signOut } from "../actions";
import { BottomNav, SideNav } from "./panel-nav";

export const dynamic = "force-dynamic";

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  // bolinhas do menu: mensagens não lidas e agendamentos esperando confirmação
  const [[chat], [appt]] = await Promise.all([
    sql<{ n: number }[]>`select coalesce(sum(unread), 0)::int as n from wa_chats`,
    sql<{ n: number }[]>`select count(*)::int as n from appointments where status = 'pendente' and ends_at >= now()`,
  ]);
  const badges = { conversas: chat?.n ?? 0, agenda: appt?.n ?? 0 };
  return (
    <div className="flex flex-1 lg:grid lg:grid-cols-[15.5rem_minmax(0,1fr)]">
      {/* menu lateral (computador) */}
      <aside className="sticky top-0 hidden h-dvh flex-col border-r border-white/10 bg-[#050505] px-4 py-5 lg:flex">
        <Link href="/admin" aria-label="Início do painel">
          <Image src="/logo.png" alt="Energyza" width={150} height={93} priority />
        </Link>
        <p className="font-display mt-3 text-xs font-semibold uppercase tracking-[0.22em] text-gold">Painel</p>
        <SideNav badges={badges} />
        <div className="mt-auto space-y-1 border-t border-white/10 pt-4 text-sm">
          <Link href="/" target="_blank" className="flex min-h-11 items-center gap-3 rounded-lg px-3 text-neutral-400 hover:bg-white/5 hover:text-white">
            <ExternalLink className="h-4 w-4" /> Ver o site
          </Link>
          <form action={signOut}>
            <button className="flex min-h-11 w-full items-center gap-3 rounded-lg px-3 text-neutral-400 hover:bg-white/5 hover:text-white">
              <LogOut className="h-4 w-4" /> Sair
            </button>
          </form>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* topo (celular) */}
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-white/10 bg-black/90 px-4 py-2 backdrop-blur-md lg:hidden">
          <Link href="/admin" aria-label="Início do painel">
            <Image src="/logo.png" alt="Energyza" width={96} height={60} priority />
          </Link>
          <span className="font-display text-xs font-semibold uppercase tracking-[0.22em] text-gold">Painel</span>
        </header>
        <main className="bg-circuit-soft mx-auto w-full max-w-5xl flex-1 px-4 pb-28 pt-6 lg:px-8 lg:pb-10 lg:pt-8">{children}</main>
      </div>
      <BottomNav badges={badges} />
    </div>
  );
}
