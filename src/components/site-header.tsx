import Image from "next/image";
import Link from "next/link";
import { whatsappLink } from "@/lib/config";
import { BookingButton } from "@/components/booking-modal";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-black/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-2">
        <Link href="/" aria-label="Energyza - início">
          <Image src="/logo.png" alt="Energyza Soluções em Elétrica" width={150} height={93} priority />
        </Link>
        <nav className="hidden items-center gap-6 text-sm text-muted md:flex">
          <Link href="/#servicos" className="hover:text-gold">Serviços</Link>
          <Link href="/#sobre" className="hover:text-gold">Sobre</Link>
          <Link href="/#contato" className="hover:text-gold">Contato</Link>
        </nav>
        <div className="flex items-center gap-2">
          <a href={whatsappLink("Olá! Gostaria de um orçamento.")} className="btn btn-outline hidden sm:inline-flex" target="_blank" rel="noopener noreferrer">
            WhatsApp
          </a>
          <BookingButton>Agendar orçamento</BookingButton>
        </div>
      </div>
    </header>
  );
}
