"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, X } from "lucide-react";

// Busca, datas e ordem da lista de orçamentos. Tudo vai para o endereço (?q=…&de=…), então voltar, recarregar e compartilhar funcionam.
export function Filtros({ q, de, ate, ord, personalizado }: { q: string; de: string; ate: string; ord: string; personalizado: boolean }) {
  const router = useRouter();
  const params = useSearchParams();
  const [busca, setBusca] = useState(q);
  const [pending, start] = useTransition();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // se o endereço mudar por fora (limpar filtros, voltar), a caixa acompanha
  const [qAntes, setQAntes] = useState(q);
  if (q !== qAntes) {
    setQAntes(q);
    setBusca(q);
  }

  function ir(mudar: Record<string, string>) {
    const next = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(mudar)) {
      if (v) next.set(k, v);
      else next.delete(k);
    }
    next.delete("lim"); // filtro novo volta para a primeira página
    start(() => router.replace(`/admin/orcamentos${next.toString() ? `?${next}` : ""}`, { scroll: false }));
  }

  function digitar(v: string) {
    setBusca(v);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => ir({ q: v.trim() }), 350);
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted" />
          <input
            value={busca}
            onChange={(e) => digitar(e.target.value)}
            type="search"
            inputMode="search"
            enterKeyHint="search"
            placeholder="Buscar por número, cliente ou telefone"
            aria-label="Buscar orçamento"
            className="input !pl-10 !pr-10"
          />
          {busca && (
            <button type="button" onClick={() => { setBusca(""); ir({ q: "" }); }} aria-label="Limpar busca" className="absolute right-1 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center text-muted hover:text-foreground">
              <X className="h-5 w-5" />
            </button>
          )}
        </div>
        <select id="ord" aria-label="Ordenar" value={ord} onChange={(e) => ir({ ord: e.target.value === "recentes" ? "" : e.target.value })} className="input sm:!w-48">
          <option value="recentes">Mais recentes</option>
          <option value="antigos">Mais antigos</option>
          <option value="valor">Maior valor</option>
          <option value="nome">Cliente (A–Z)</option>
        </select>
      </div>

      {personalizado && (
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="label" htmlFor="de">De</label>
            <input id="de" type="date" value={de} max={ate || undefined} onChange={(e) => ir({ p: "custom", de: e.target.value })} className="input !w-auto" />
          </div>
          <div>
            <label className="label" htmlFor="ate">Até</label>
            <input id="ate" type="date" value={ate} min={de || undefined} onChange={(e) => ir({ p: "custom", ate: e.target.value })} className="input !w-auto" />
          </div>
        </div>
      )}
      {pending && <p className="text-xs text-muted" role="status">Atualizando…</p>}
    </div>
  );
}
