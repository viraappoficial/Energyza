"use client";

import { useState } from "react";

type Aba = "resumo" | "receber" | "entradas" | "despesas";

// Abas do Caixa: todas já vêm prontas do servidor e a troca é instantânea (sem recarregar a página).
export function CaixaTabs({
  initial,
  period,
  tabs,
  panes,
}: {
  initial: Aba;
  period: string;
  tabs: { key: Aba; label: string; badge?: string }[];
  panes: Record<Aba, React.ReactNode>;
}) {
  const [tab, setTab] = useState<Aba>(initial);

  function pick(key: Aba) {
    setTab(key);
    window.history.replaceState(null, "", `/admin/caixa?p=${period}&aba=${key}`);
  }

  return (
    <>
      <div role="tablist" aria-label="Seções do caixa" className="-mx-4 mt-7 flex gap-2 overflow-x-auto border-b border-border px-4 pb-3 [scrollbar-width:none]">
        {tabs.map(({ key, label, badge }) => (
          <button
            key={key}
            type="button"
            role="tab"
            id={`aba-${key}`}
            aria-selected={tab === key}
            aria-controls={`painel-${key}`}
            onClick={() => pick(key)}
            className={`flex min-h-11 shrink-0 items-center gap-2 rounded-xl border px-4 text-sm font-semibold ${
              tab === key ? "border-gold bg-gold text-black" : "border-border text-neutral-300 hover:border-gold/60"
            }`}
          >
            {label}
            {badge && <span className={`rounded-full px-2 py-0.5 text-xs ${tab === key ? "bg-black/15 text-black" : "bg-white/10 text-muted"}`}>{badge}</span>}
          </button>
        ))}
      </div>
      {tabs.map(({ key }) => (
        <div key={key} role="tabpanel" id={`painel-${key}`} aria-labelledby={`aba-${key}`} hidden={tab !== key}>
          {panes[key]}
        </div>
      ))}
    </>
  );
}
