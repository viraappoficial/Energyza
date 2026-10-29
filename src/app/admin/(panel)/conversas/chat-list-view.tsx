"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { ChatRow, type ChatItem } from "./chat-row";
import { fmtPhone } from "@/lib/wa-format";

export type LabelCount = { id: string; name: string; color: string; count: number };

// Lista com busca por nome/telefone e filtro por etiqueta ou "não lidas"
export function ChatListView({ chats, labels }: { chats: ChatItem[]; labels: LabelCount[] }) {
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<string>("all"); // all | unread | id da etiqueta

  const list = useMemo(() => {
    const term = q.trim().toLowerCase();
    const digits = term.replace(/\D/g, "");
    return chats.filter((c) => {
      if (filter === "unread" && c.unread === 0) return false;
      if (filter !== "all" && filter !== "unread" && !c.labels.some((l) => l.id === filter)) return false;
      if (!term) return true;
      return c.name.toLowerCase().includes(term) || fmtPhone(c.phone).toLowerCase().includes(term) || (digits.length >= 3 && c.phone.includes(digits));
    });
  }, [chats, q, filter]);

  const unread = chats.filter((c) => c.unread > 0).length;
  const chip = (id: string, label: string, color?: string, n?: number) => (
    <button
      key={id}
      type="button"
      onClick={() => setFilter(filter === id ? "all" : id)}
      aria-pressed={filter === id}
      className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-sm ${filter === id ? "bg-[#00a884] font-semibold text-[#111b21]" : "bg-[#202c33] text-[#d1d7db]"}`}
    >
      {color && <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />}
      {label}{n !== undefined && n > 0 ? ` ${n}` : ""}
    </button>
  );

  return (
    <div>
      <div className="space-y-2 border-b border-white/5 p-3">
        <label className="flex items-center gap-2 rounded-lg bg-[#202c33] px-3">
          <Search className="h-4 w-4 shrink-0 text-[#8696a0]" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar nome ou telefone" aria-label="Buscar conversa" className="min-h-10 w-full bg-transparent text-base text-[#e9edef] outline-none placeholder:text-[#8696a0]" />
        </label>
        <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1">
          {chip("all", "Todas")}
          {unread > 0 && chip("unread", "Não lidas", undefined, unread)}
          {labels.filter((l) => l.count > 0).map((l) => chip(l.id, l.name, l.color, l.count))}
        </div>
      </div>
      {list.length === 0 ? (
        <p className="p-5 text-sm text-[#8696a0]">{chats.length === 0 ? "Nenhuma conversa ainda. As mensagens dos clientes aparecem aqui." : "Nenhuma conversa encontrada."}</p>
      ) : (
        <ul className="wa-font divide-y divide-white/5">
          {list.map((c) => <li key={c.chat_id}><ChatRow c={c} /></li>)}
        </ul>
      )}
    </div>
  );
}
