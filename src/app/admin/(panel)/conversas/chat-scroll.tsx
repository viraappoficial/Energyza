"use client";

import { useEffect, useRef } from "react";

// Área de mensagens: abre no fim da conversa e acompanha mensagens novas
// (só desce sozinha se a pessoa já estava perto do fim, para não atrapalhar quem rola para cima).
export function ChatScroll({ children, count }: { children: React.ReactNode; count: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const first = useRef(true);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const nearEnd = el.scrollHeight - el.scrollTop - el.clientHeight < 160;
    if (first.current || nearEnd) el.scrollTop = el.scrollHeight;
    first.current = false;
  }, [count]);
  return (
    <div ref={ref} className="wa-bg min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-3 sm:px-[8%]">
      {children}
    </div>
  );
}
