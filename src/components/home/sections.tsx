import Image from "next/image";
import {
  ArrowUpRight, BadgeCheck, CalendarCheck, ClipboardCheck, FileText, HardHat, MapPin,
  MessageCircle, Phone, Plug, ScanSearch, ShieldCheck, Siren, ToggleRight, Wrench, Zap,
} from "lucide-react";
import { business, whatsappLink } from "@/lib/config";
import { BookingButton } from "@/components/booking-modal";
import { InstagramIcon } from "@/components/instagram-icon";
import { Reveal } from "@/components/ui/reveal";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { OpenNow, type Hours } from "@/components/home/open-now";

export type ServiceRow = { id: string; name: string; description: string };

const eyebrow = "font-display text-sm font-semibold uppercase tracking-[0.2em] text-gold";
const h2 = "font-display mt-2 text-4xl font-extrabold uppercase leading-[0.95] sm:text-5xl";

export function Hero({ hours }: { hours: Hours }) {
  return (
    <section className="relative isolate overflow-hidden border-b border-border">
      <div className="bg-circuit pointer-events-none absolute inset-0 -z-10" />
      <div className="pointer-events-none absolute -right-24 top-10 -z-10 h-[34rem] w-[34rem] rounded-full bg-[radial-gradient(circle,rgba(224,160,48,0.22),transparent_65%)]" style={{ animation: "glow-pulse 5s ease-in-out infinite" }} />
      <svg className="pointer-events-none absolute inset-0 -z-10 hidden h-full w-full opacity-40 lg:block" aria-hidden>
        <path d="M-20 520 L180 520 L220 470 L420 470 L460 430 L760 430" fill="none" stroke="#e0a030" strokeWidth="1.2" strokeDasharray="6 26" style={{ animation: "arc-dash 9s linear infinite" }} />
        <path d="M-20 600 L120 600 L160 560 L520 560 L560 520 L900 520" fill="none" stroke="#e0a030" strokeWidth="1" strokeDasharray="4 30" style={{ animation: "arc-dash 12s linear infinite" }} />
      </svg>

      {/* celular: marca discreta ao fundo, sem competir com o texto */}
      <Image src="/logo-mark.png" alt="" width={420} height={380} aria-hidden className="pointer-events-none absolute -right-8 top-2 -z-10 w-40 opacity-[0.2] lg:hidden" />
      <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 pb-14 pt-10 lg:grid-cols-[1.25fr_1fr] lg:pb-28 lg:pt-20">
        <div>
          <Reveal>
            <OpenNow hours={hours} />
            <p className={`${eyebrow} mt-6`}>Eletricista em {business.city}/{business.state}</p>
          </Reveal>
          <Reveal delay={0.08}>
            <h1 className="font-display mt-3 text-[3.4rem] font-extrabold uppercase leading-[0.9] sm:text-7xl lg:text-[5.6rem]">
              Elétrica feita <span className="gold-text">direito</span>
              <span className="text-gold">.</span>
            </h1>
          </Reveal>
          <Reveal delay={0.16}>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-neutral-300">
              Instalação, manutenção, quadros de luz e diagnóstico em {business.city} e região.
              Atendimento no local, <strong className="text-white">orçamento claro antes de começar</strong> e
              serviço feito dentro das normas.
            </p>
          </Reveal>
          <Reveal delay={0.24}>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <BookingButton className="btn btn-gold !px-7 !py-4 text-lg">
                <CalendarCheck className="h-5 w-5" /> Agendar orçamento
              </BookingButton>
              <a href={whatsappLink("Olá! Gostaria de um orçamento.")} target="_blank" rel="noopener noreferrer" className="btn btn-outline !px-7 !py-4 text-lg">
                <MessageCircle className="h-5 w-5" /> Chamar no WhatsApp
              </a>
            </div>
            <ul className="mt-7 flex flex-wrap gap-2 text-sm">
              {["NR-10", "NR-35", "Atendimento no local", "Orçamento em PDF"].map((c) => (
                <li key={c} className="flex items-center gap-1.5 rounded-full border border-gold/30 bg-gold/5 px-3 py-1.5 text-neutral-200">
                  <BadgeCheck className="h-4 w-4 text-gold" /> {c}
                </li>
              ))}
            </ul>
          </Reveal>
        </div>

        <Reveal delay={0.2} className="relative mx-auto hidden w-full max-w-[22rem] lg:block lg:max-w-none">
          <div className="relative mx-auto aspect-square w-[78%] sm:w-[70%] lg:w-full">
            <svg viewBox="0 0 200 200" className="absolute inset-[-9%] h-[118%] w-[118%]" aria-hidden style={{ animation: "ring-spin 40s linear infinite" }}>
              <circle cx="100" cy="100" r="96" fill="none" stroke="#e0a030" strokeOpacity="0.5" strokeWidth="0.6" strokeDasharray="2 7" />
              <circle cx="100" cy="100" r="86" fill="none" stroke="#e0a030" strokeOpacity="0.22" strokeWidth="0.6" />
            </svg>
            <div className="absolute inset-[12%] rounded-full bg-[radial-gradient(circle,rgba(224,160,48,0.28),transparent_70%)]" style={{ animation: "glow-pulse 4s ease-in-out infinite" }} />
            <Image src="/logo-mark.png" alt="Energyza" width={420} height={380} priority className="relative z-10 mx-auto h-full w-full object-contain p-[14%] drop-shadow-[0_0_40px_rgba(224,160,48,0.35)]" />
          </div>
        </Reveal>
      </div>
    </section>
  );
}

const works = [
  { src: "/obras/letreiro-led-fachada.jpg", w: 790, h: 720, alt: "Letreiro iluminado em LED da Prime Barbearia, em Maringá", title: "Iluminação de fachada em LED", place: "Prime Barbearia · Maringá/PR" },
  { src: "/obras/fachada-iluminada-noite.jpg", w: 840, h: 630, alt: "Fachada da Prime Barbearia iluminada à noite", title: "Fachada pronta e iluminada", place: "Prime Barbearia · Maringá/PR" },
];

// Fotos de serviços já feitos (prova de trabalho real)
export function Works() {
  return (
    <section id="trabalhos" className="mx-auto max-w-6xl scroll-mt-20 px-4 pb-20">
      <Reveal>
        <p className={eyebrow}>Trabalhos realizados</p>
        <h2 className={h2}>Serviço feito, <span className="gold-text">resultado à vista</span></h2>
      </Reveal>
      <div className="mt-10 grid gap-4 md:grid-cols-2">
        {works.map((w, i) => (
          <Reveal key={w.src} delay={i * 0.1}>
            <figure className="edge-card h-full p-2">
              <div className="overflow-hidden rounded-md">
                <Image src={w.src} alt={w.alt} width={w.w} height={w.h} sizes="(min-width: 768px) 560px, 100vw" className="aspect-[4/3] w-full object-cover" />
              </div>
              <figcaption className="px-3 pb-3 pt-4">
                <p className="font-display text-2xl font-bold uppercase leading-none">{w.title}</p>
                <p className="mt-1 text-sm text-muted">{w.place}</p>
              </figcaption>
            </figure>
          </Reveal>
        ))}
      </div>
      <Reveal delay={0.1}>
        <p className="mt-8 flex flex-wrap items-center gap-x-4 gap-y-2 text-muted">
          Quer um serviço assim no seu espaço?
          <BookingButton className="inline-flex min-h-11 items-center gap-1.5 font-semibold text-gold hover:text-gold-strong">
            Agendar orçamento <ArrowUpRight className="h-4 w-4" />
          </BookingButton>
        </p>
      </Reveal>
    </section>
  );
}

const trust = [
  { icon: ShieldCheck, t: "NR-10", d: "Segurança em instalações e serviços em eletricidade" },
  { icon: HardHat, t: "NR-35", d: "Habilitado para trabalho em altura" },
  { icon: FileText, t: "Orçamento claro", d: "Valores e validade em PDF, antes de começar" },
  { icon: MapPin, t: "No local", d: `Atendimento na sua casa ou empresa em ${business.city} e região` },
];

export function TrustStrip() {
  return (
    <section className="border-b border-border bg-[#070707]">
      <ul className="mx-auto grid max-w-6xl grid-cols-2 gap-px bg-border lg:grid-cols-4">
        {trust.map(({ icon: Icon, t, d }) => (
          <li key={t} className="flex flex-col gap-2 bg-[#070707] p-5 sm:p-6">
            <Icon className="h-7 w-7 text-gold" />
            <p className="font-display text-2xl font-bold uppercase leading-none">{t}</p>
            <p className="text-sm leading-snug text-muted">{d}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}

function iconFor(name: string) {
  const n = name.toLowerCase();
  if (n.includes("quadro") || n.includes("disjuntor")) return ToggleRight;
  if (n.includes("diagn")) return ScanSearch;
  if (n.includes("manuten")) return Wrench;
  if (n.includes("instal")) return Plug;
  return Zap;
}

export function Services({ services }: { services: ServiceRow[] }) {
  return (
    <section id="servicos" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-20">
      <Reveal>
        <p className={eyebrow}>Serviços</p>
        <h2 className={h2}>O que a Energyza <span className="gold-text">resolve</span></h2>
      </Reveal>
      <div className="mt-10 grid gap-4 sm:grid-cols-2">
        {services.map((s, i) => {
          const Icon = iconFor(s.name);
          return (
            <Reveal key={s.id} delay={i * 0.07}>
              <article className="edge-card flex h-full flex-col p-6">
                <div className="flex items-start justify-between">
                  <span className="grid h-12 w-12 place-items-center rounded-lg border border-gold/40 bg-gold/10 text-gold">
                    <Icon className="h-6 w-6" />
                  </span>
                  <span className="font-display text-5xl font-extrabold leading-none text-white/10">{String(i + 1).padStart(2, "0")}</span>
                </div>
                <h3 className="font-display mt-5 text-3xl font-bold uppercase leading-none">{s.name}</h3>
                <p className="mt-3 flex-1 leading-relaxed text-muted">{s.description}</p>
                <BookingButton serviceId={s.id} className="mt-6 inline-flex min-h-11 items-center gap-1.5 self-start font-semibold text-gold hover:text-gold-strong">
                  Agendar este serviço <ArrowUpRight className="h-4 w-4" />
                </BookingButton>
              </article>
            </Reveal>
          );
        })}
      </div>
    </section>
  );
}

export function Urgency() {
  return (
    <section className="relative overflow-hidden border-y border-gold/30 bg-gradient-to-r from-[#1a1204] via-[#2a1c05] to-[#1a1204]">
      <div className="mx-auto flex max-w-6xl flex-col items-start gap-5 px-4 py-10 md:flex-row md:items-center md:justify-between">
        <div className="flex items-start gap-4">
          <Siren className="mt-1 h-9 w-9 shrink-0 text-gold" />
          <div>
            <p className="font-display text-3xl font-extrabold uppercase leading-none sm:text-4xl">Disjuntor desarmando? Sem energia?</p>
            <p className="mt-2 text-neutral-300">Cheiro de queimado, choque ou fio esquentando: não espere piorar. Fale agora.</p>
          </div>
        </div>
        <a href={whatsappLink("Olá! Preciso de atendimento elétrico com urgência.")} target="_blank" rel="noopener noreferrer" className="btn btn-gold !px-7 !py-4 text-lg">
          <MessageCircle className="h-5 w-5" /> Falar agora
        </a>
      </div>
    </section>
  );
}

const steps = [
  { icon: CalendarCheck, t: "Você agenda", d: "Escolha o serviço, o dia e conte o que precisa. Leva 1 minuto." },
  { icon: ScanSearch, t: "Visita e diagnóstico", d: "Avaliamos no local para entender o problema de verdade." },
  { icon: FileText, t: "Orçamento claro", d: "Chega em PDF no seu WhatsApp, com valores e validade, antes de começar." },
  { icon: ClipboardCheck, t: "Serviço dentro das normas", d: "Execução com NR-10 e NR-35, do jeito que tem que ser." },
];

export function Process() {
  return (
    <section id="como-funciona" className="border-t border-border bg-[#070707] py-20">
      <div className="mx-auto max-w-6xl px-4">
        <Reveal>
          <p className={eyebrow}>Como funciona</p>
          <h2 className={h2}>Do agendamento ao <span className="gold-text">serviço pronto</span></h2>
        </Reveal>
        <ol className="relative mt-12 grid gap-8 md:grid-cols-4 md:gap-5">
          <div className="absolute left-[1.35rem] top-2 hidden h-[calc(100%-1rem)] w-px bg-gradient-to-b from-gold/60 to-transparent max-md:block" aria-hidden />
          <div className="absolute left-0 right-0 top-[1.35rem] hidden h-px bg-gradient-to-r from-gold/60 via-gold/20 to-transparent md:block" aria-hidden />
          {steps.map(({ icon: Icon, t, d }, i) => (
            <Reveal key={t} delay={i * 0.08}>
              <li className="relative pl-16 md:pl-0 md:pt-16">
                <span className="absolute left-0 top-0 grid h-11 w-11 place-items-center rounded-full border border-gold bg-black text-gold">
                  <Icon className="h-5 w-5" />
                </span>
                <p className="font-display text-sm font-semibold tracking-widest text-gold">PASSO {String(i + 1).padStart(2, "0")}</p>
                <h3 className="font-display mt-1 text-2xl font-bold uppercase leading-none">{t}</h3>
                <p className="mt-2 leading-relaxed text-muted">{d}</p>
              </li>
            </Reveal>
          ))}
        </ol>
      </div>
    </section>
  );
}

const faqs = [
  { q: "Como funciona o orçamento?", a: "Você agenda a visita pelo site e descreve o que precisa. Depois da avaliação, o orçamento detalhado chega em PDF no seu WhatsApp, com valores e validade, antes de qualquer serviço começar." },
  { q: "Vocês atendem na minha casa ou empresa?", a: `Sim. O atendimento é sempre no local do cliente, em ${business.city}/${business.state} e região.` },
  { q: "Quais serviços vocês fazem?", a: "Instalação de tomadas, interruptores, luminárias, chuveiros e ventiladores de teto; manutenção e correção de falhas; instalação e troca de quadros e disjuntores; e diagnóstico de defeitos e curtos-circuitos." },
  { q: "O profissional é habilitado?", a: "Sim. Possui NR-10 (segurança em instalações e serviços em eletricidade) e NR-35 (trabalho em altura)." },
  { q: "Como faço para agendar?", a: "Toque em “Agendar orçamento”, escolha o serviço e um horário livre e descreva o que precisa. A confirmação vem pelo WhatsApp." },
];

export function Faq() {
  return (
    <section id="duvidas" className="mx-auto grid max-w-6xl gap-10 px-4 py-20 lg:grid-cols-[1fr_1.4fr]">
      <Reveal>
        <p className={eyebrow}>Dúvidas</p>
        <h2 className={h2}>Perguntas <span className="gold-text">frequentes</span></h2>
        <p className="mt-4 max-w-sm text-muted">Não achou o que procurava? Chame no WhatsApp que a gente responde.</p>
        <a href={whatsappLink("Olá! Tenho uma dúvida.")} target="_blank" rel="noopener noreferrer" className="btn btn-outline mt-6">
          <MessageCircle className="h-5 w-5" /> Tirar uma dúvida
        </a>
      </Reveal>
      <Reveal delay={0.1}>
        <Accordion type="single" collapsible defaultValue="item-0" className="border-t border-border">
          {faqs.map((f, i) => (
            <AccordionItem key={f.q} value={`item-${i}`}>
              <AccordionTrigger>{f.q}</AccordionTrigger>
              <AccordionContent>{f.a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </Reveal>
    </section>
  );
}

export function Contact() {
  return (
    <section id="contato" className="relative isolate scroll-mt-20 overflow-hidden border-t border-border bg-[#070707]">
      <div className="bg-circuit pointer-events-none absolute inset-0 -z-10 opacity-60" />
      <div className="mx-auto max-w-6xl px-4 py-20">
        <Reveal>
          <p className={eyebrow}>Contato</p>
          <h2 className={`${h2} max-w-3xl`}>Precisa de um eletricista em {business.city}? <span className="gold-text">Chame a Energyza.</span></h2>
        </Reveal>
        <Reveal delay={0.1}>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <BookingButton className="btn btn-gold !px-7 !py-4 text-lg">
              <CalendarCheck className="h-5 w-5" /> Agendar orçamento
            </BookingButton>
            <a href={whatsappLink("Olá! Gostaria de um orçamento.")} target="_blank" rel="noopener noreferrer" className="btn btn-outline !px-7 !py-4 text-lg">
              <MessageCircle className="h-5 w-5" /> WhatsApp {business.phoneDisplay}
            </a>
            <a href={`tel:+${business.whatsapp}`} className="btn btn-outline !px-7 !py-4 text-lg">
              <Phone className="h-5 w-5" /> Ligar
            </a>
            <a href={business.instagram} target="_blank" rel="noopener noreferrer" className="btn btn-outline !px-7 !py-4 text-lg">
              <InstagramIcon className="h-5 w-5" /> Instagram
            </a>
          </div>
          <p className="mt-6 text-sm text-muted">
            {business.email} · Atendimento no local em {business.city}/{business.state} e região.
          </p>
        </Reveal>
      </div>
    </section>
  );
}
