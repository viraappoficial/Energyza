import Image from "next/image";
import Link from "next/link";
import { CalendarCheck, MessageCircle, Phone } from "lucide-react";
import { business, whatsappLink } from "@/lib/config";
import { BookingButton } from "@/components/booking-modal";

export function SiteFooter() {
  return (
    <>
      <footer className="border-t border-border bg-black pb-28 pt-12 lg:pb-12">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 md:grid-cols-[1.2fr_1fr_1fr]">
          <div>
            <Image src="/logo.png" alt="Energyza Soluções em Elétrica" width={168} height={104} />
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-muted">
              Soluções em elétrica em {business.city}/{business.state} e região, com NR-10 e NR-35.
            </p>
          </div>
          <div className="text-sm">
            <p className="font-display text-lg font-bold uppercase text-gold">Contato</p>
            <ul className="mt-3 space-y-2 text-neutral-300">
              <li><a href={`tel:+${business.whatsapp}`} className="hover:text-gold">{business.phoneDisplay}</a></li>
              <li><a href={`mailto:${business.email}`} className="break-all hover:text-gold">{business.email}</a></li>
              <li className="text-muted">Atendimento no local do cliente</li>
            </ul>
          </div>
          <div className="text-sm">
            <p className="font-display text-lg font-bold uppercase text-gold">Navegue</p>
            <ul className="mt-3 space-y-1 text-neutral-300">
              <li><Link href="/#servicos" className="inline-block py-1 hover:text-gold">Serviços</Link></li>
              <li><Link href="/#como-funciona" className="inline-block py-1 hover:text-gold">Como funciona</Link></li>
              <li><Link href="/#duvidas" className="inline-block py-1 hover:text-gold">Dúvidas</Link></li>
              <li><Link href="/privacidade" className="inline-block py-1 hover:text-gold">Política de privacidade</Link></li>
            </ul>
          </div>
        </div>
        <p className="mx-auto mt-10 max-w-6xl border-t border-border px-4 pt-6 text-xs text-muted">
          © {new Date().getFullYear()} {business.legalName} · CNPJ {business.cnpj}
        </p>
      </footer>

      {/* barra fixa no celular: ligar, WhatsApp e agendar sempre à mão */}
      <nav aria-label="Ações rápidas" className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-3 gap-2 border-t border-white/10 bg-black/90 p-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] backdrop-blur-md lg:hidden">
        <a href={`tel:+${business.whatsapp}`} className="flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-lg border border-border text-xs font-semibold">
          <Phone className="h-5 w-5 text-gold" /> Ligar
        </a>
        <a href={whatsappLink("Olá! Gostaria de um orçamento.")} target="_blank" rel="noopener noreferrer" className="flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-lg border border-border text-xs font-semibold">
          <MessageCircle className="h-5 w-5 text-gold" /> WhatsApp
        </a>
        <BookingButton className="flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-lg bg-gold text-xs font-bold text-black">
          <CalendarCheck className="h-5 w-5" /> Agendar
        </BookingButton>
      </nav>
    </>
  );
}
