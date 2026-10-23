import Link from "next/link";
import { ChevronRight, Clock, ExternalLink, LogOut, Wrench } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { signOut } from "../../actions";
import { PageTitle } from "../page-title";

const items = [
  { href: "/admin/servicos", label: "Serviços", hint: "Nomes, descrições e duração", icon: Wrench },
  { href: "/admin/horarios", label: "Horários e folgas", hint: "Quando você atende e dias bloqueados", icon: Clock },
];

export default async function MaisPage() {
  await requireAdmin();
  return (
    <>
      <PageTitle eyebrow="Painel" title="Mais" />
      <ul className="mt-6 space-y-3">
        {items.map(({ href, label, hint, icon: Icon }) => (
          <li key={href}>
            <Link href={href} className="edge-card flex min-h-16 items-center gap-4 p-4">
              <span className="grid h-11 w-11 place-items-center rounded-lg border border-gold/40 bg-gold/10 text-gold"><Icon className="h-5 w-5" /></span>
              <span className="flex-1">
                <span className="block font-semibold">{label}</span>
                <span className="block text-sm text-muted">{hint}</span>
              </span>
              <ChevronRight className="h-5 w-5 text-muted" />
            </Link>
          </li>
        ))}
        <li>
          <Link href="/" target="_blank" className="edge-card flex min-h-16 items-center gap-4 p-4">
            <span className="grid h-11 w-11 place-items-center rounded-lg border border-border text-neutral-300"><ExternalLink className="h-5 w-5" /></span>
            <span className="flex-1 font-semibold">Ver o site</span>
          </Link>
        </li>
        <li>
          <form action={signOut}>
            <button className="edge-card flex min-h-16 w-full items-center gap-4 p-4 text-left">
              <span className="grid h-11 w-11 place-items-center rounded-lg border border-red-500/40 text-red-300"><LogOut className="h-5 w-5" /></span>
              <span className="flex-1 font-semibold text-red-300">Sair</span>
            </button>
          </form>
        </li>
      </ul>
    </>
  );
}
