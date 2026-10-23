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
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
          <span className="font-bold text-gold">Energyza · Painel</span>
          <nav className="flex flex-1 flex-wrap gap-4 text-sm text-muted">
            {links.map((l) => (
              <Link key={l.href} href={l.href} className="hover:text-gold">{l.label}</Link>
            ))}
            <Link href="/" className="hover:text-gold" target="_blank">Ver site ↗</Link>
          </nav>
          <form action={signOut}>
            <button className="text-sm text-muted hover:text-gold">Sair</button>
          </form>
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">{children}</main>
    </div>
  );
}
