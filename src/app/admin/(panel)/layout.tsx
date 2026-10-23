import Link from "next/link";
import { signOut } from "../actions";

const links = [
  { href: "/admin", label: "Agenda" },
  { href: "/admin/orcamentos", label: "Orçamentos" },
  { href: "/admin/servicos", label: "Serviços" },
  { href: "/admin/horarios", label: "Horários" },
];

export default function PanelLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b border-border bg-surface">
        <div className="mx-auto max-w-5xl px-4">
          <div className="flex items-center justify-between py-2">
            <span className="font-bold text-gold">Energyza · Painel</span>
            <form action={signOut}>
              <button className="px-2 py-2 text-sm text-muted hover:text-gold">Sair</button>
            </form>
          </div>
          <nav className="-mx-4 flex gap-1 overflow-x-auto px-4 pb-2 text-sm text-muted [scrollbar-width:none]">
            {links.map((l) => (
              <Link key={l.href} href={l.href} className="shrink-0 rounded-lg px-3 py-2 hover:bg-surface-2 hover:text-gold">{l.label}</Link>
            ))}
            <Link href="/" className="shrink-0 rounded-lg px-3 py-2 hover:bg-surface-2 hover:text-gold" target="_blank">Ver site ↗</Link>
          </nav>
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">{children}</main>
    </div>
  );
}
