"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Pause, Play } from "lucide-react";

export type WorkItem = { id: string; title: string; description: string; src: string };

// Poucos trabalhos: ficam parados lado a lado. Muitos: carrossel que passa sozinho (e dá para arrastar).
export function WorksCarousel({ works }: { works: WorkItem[] }) {
  const track = useRef<HTMLUListElement>(null);
  const paused = useRef(false);
  const [scrollable, setScrollable] = useState(false);
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(true); // botão pausar/continuar
  const many = works.length > 2;

  const goTo = useCallback((i: number) => {
    const el = track.current;
    const card = el?.children[i] as HTMLElement | undefined;
    if (el && card) el.scrollTo({ left: card.offsetLeft - (el.children[0] as HTMLElement).offsetLeft, behavior: "smooth" });
  }, []);

  // anda de um cartão por vez; no fim volta ao começo (e vice-versa). O último cartão nem sempre chega à borda,
  // por isso o "fim" é medido pela rolagem e não pelo número do cartão.
  const step = useCallback((dir: 1 | -1) => {
    const el = track.current;
    if (!el || el.children.length < 2) return;
    const max = el.scrollWidth - el.clientWidth;
    const size = (el.children[1] as HTMLElement).offsetLeft - (el.children[0] as HTMLElement).offsetLeft;
    if (dir === 1) el.scrollTo({ left: el.scrollLeft >= max - 4 ? 0 : Math.min(max, el.scrollLeft + size), behavior: "smooth" });
    else el.scrollTo({ left: el.scrollLeft <= 4 ? max : Math.max(0, el.scrollLeft - size), behavior: "smooth" });
  }, []);

  // sabe se há o que rolar e qual cartão está à vista
  useEffect(() => {
    const el = track.current;
    if (!el || !many) return;
    const measure = () => setScrollable(el.scrollWidth - el.clientWidth > 8);
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const first = (el.children[0] as HTMLElement).offsetLeft;
        if (el.scrollLeft >= el.scrollWidth - el.clientWidth - 4) { setIndex(el.children.length - 1); return; }
        let best = 0;
        let dist = Infinity;
        Array.from(el.children).forEach((c, i) => {
          const d = Math.abs((c as HTMLElement).offsetLeft - first - el.scrollLeft);
          if (d < dist) { dist = d; best = i; }
        });
        setIndex(best);
      });
    };
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => { ro.disconnect(); el.removeEventListener("scroll", onScroll); cancelAnimationFrame(raf); };
  }, [many, works.length]);

  // passa sozinho a cada 5 s (pausa com o dedo/mouse em cima, com a aba escondida ou se a pessoa apertou pausar).
  // Com "reduzir animações" ligado no sistema, a troca continua, só que sem deslizar.
  useEffect(() => {
    if (!scrollable || !playing) return;
    const t = setInterval(() => {
      if (paused.current || document.visibilityState !== "visible") return;
      step(1);
    }, 5000);
    return () => clearInterval(t);
  }, [scrollable, playing, step]);

  const card = (w: WorkItem) => (
    <figure className="edge-card h-full p-2">
      <div className="overflow-hidden rounded-md">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={w.src} alt={w.title} loading="lazy" decoding="async" draggable={false} className="aspect-[4/3] w-full object-cover" />
      </div>
      <figcaption className="px-3 pb-3 pt-4">
        <p className="font-display text-2xl font-bold uppercase leading-none">{w.title}</p>
        {w.description && <p className="mt-1 text-sm text-muted">{w.description}</p>}
      </figcaption>
    </figure>
  );

  if (!many) {
    return <ul className="mt-10 grid gap-4 md:grid-cols-2">{works.map((w) => <li key={w.id}>{card(w)}</li>)}</ul>;
  }

  const sizes = works.length > 3 ? "lg:w-[calc((100%-2rem)/3)]" : "lg:w-[calc((100%-1rem)/2)]";
  return (
    <div
      className="relative mt-10"
      onPointerEnter={() => { paused.current = true; }}
      onPointerLeave={() => { paused.current = false; }}
      onTouchStart={() => { paused.current = true; }}
      onTouchEnd={() => { setTimeout(() => { paused.current = false; }, 6000); }}
      onFocus={(e) => { if (e.target.matches(":focus-visible")) paused.current = true; }} // só foco de teclado (clique no mouse não trava a troca)
      onBlur={() => { paused.current = false; }}
    >
      <ul ref={track} className="no-scrollbar flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth" aria-roledescription="carrossel">
        {works.map((w) => (
          <li key={w.id} className={`w-[85%] shrink-0 snap-start sm:w-[calc((100%-1rem)/2)] ${sizes}`}>{card(w)}</li>
        ))}
      </ul>
      {scrollable && (
        <div className="mt-5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2" role="tablist" aria-label="Trabalhos">
            {works.map((w, i) => (
              <button key={w.id} type="button" onClick={() => goTo(i)} aria-label={`Ir para ${w.title}`} aria-selected={i === index} role="tab" className="grid h-6 place-items-center px-0.5">
                <span className={`block h-2 rounded-full transition-all ${i === index ? "w-6 bg-gold" : "w-2 bg-white/25"}`} />
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={() => setPlaying((v) => !v)} aria-label={playing ? "Pausar a troca automática" : "Continuar a troca automática"} className="grid h-11 w-11 place-items-center rounded-lg border border-border text-gold hover:border-gold">
              {playing ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
            </button>
            <button type="button" onClick={() => step(-1)} aria-label="Anterior" className="grid h-11 w-11 place-items-center rounded-lg border border-border text-gold hover:border-gold"><ChevronLeft className="h-5 w-5" /></button>
            <button type="button" onClick={() => step(1)} aria-label="Próximo" className="grid h-11 w-11 place-items-center rounded-lg border border-border text-gold hover:border-gold"><ChevronRight className="h-5 w-5" /></button>
          </div>
        </div>
      )}
    </div>
  );
}
