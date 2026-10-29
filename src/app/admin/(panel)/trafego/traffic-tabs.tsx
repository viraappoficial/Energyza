"use client";

import { useState } from "react";

type Tab = "meta" | "google";

// Abas da rede de anúncios: as duas já vêm prontas do servidor e a troca é instantânea (sem recarregar a página).
export function TrafficTabs({
  initial,
  period,
  tabs,
  panes,
}: {
  initial: Tab;
  period: string;
  tabs: { key: Tab; label: string; sub: string }[];
  panes: Record<Tab, React.ReactNode>;
}) {
  const [tab, setTab] = useState<Tab>(initial);

  function pick(key: Tab) {
    setTab(key);
    // mantém o endereço certo (voltar/compartilhar) sem navegar
    window.history.replaceState(null, "", `/admin/trafego?p=${period}&rede=${key}`);
  }

  return (
    <>
      <div role="tablist" aria-label="Rede de anúncios" className="mt-10 flex gap-2 border-b border-border pb-3">
        {tabs.map(({ key, label, sub }) => (
          <button
            key={key}
            type="button"
            role="tab"
            id={`tab-${key}`}
            aria-selected={tab === key}
            aria-controls={`pane-${key}`}
            onClick={() => pick(key)}
            className={`flex min-h-11 flex-1 flex-col items-center justify-center rounded-xl border px-3 text-sm font-semibold sm:flex-none sm:px-8 ${
              tab === key ? "border-gold bg-gold text-black" : "border-border text-neutral-300 hover:border-gold/60"
            }`}
          >
            <span>{label}</span>
            <span className={`text-xs font-normal ${tab === key ? "text-black/70" : "text-muted"}`}>{sub}</span>
          </button>
        ))}
      </div>
      {tabs.map(({ key }) => (
        <div key={key} role="tabpanel" id={`pane-${key}`} aria-labelledby={`tab-${key}`} hidden={tab !== key}>
          {panes[key]}
        </div>
      ))}
    </>
  );
}
