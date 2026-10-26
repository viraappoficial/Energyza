import Image from "next/image";
import Link from "next/link";
import { Phone } from "lucide-react";
import { business } from "@/lib/config";
import { BookingButton } from "@/components/booking-modal";

const links = [
  { href: "/#servicos", label: "Serviços" },
  { href: "/#como-funciona", label: "Como funciona" },
  { href: "/#duvidas", label: "Dúvidas" },
  { href: "/#contato", label: "Contato" },
];

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-white/10 bg-black/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-2">
        <Link href="/" aria-label="Energyza - início" className="shrink-0">
          <Image src="/logo.png" alt="Energyza Soluções em Elétrica" width={132} height={82} priority />
        </Link>
        <nav className="hidden items-center gap-7 text-[0.95rem] font-medium text-neutral-300 lg:flex">
          {links.map((l) => (
            <Link key={l.href} href={l.href} className="inline-flex min-h-10 items-center transition-colors hover:text-gold">{l.label}</Link>
          ))}
        </nav>
        <div className="flex items-center gap-3">
          <a href="tel:+5544988437653" className="hidden min-h-10 items-center gap-2 text-[0.95rem] font-semibold text-neutral-200 hover:text-gold xl:flex">
            <Phone className="h-4 w-4 text-gold" /> {business.phoneDisplay}
          </a>
          <BookingButton className="btn btn-gold !px-5 !py-2.5">Agendar orçamento</BookingButton>
        </div>
      </div>
    </header>
  );
}
