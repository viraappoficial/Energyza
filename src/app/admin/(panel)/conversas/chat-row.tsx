"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { fmtPhone, fmtWhen, initials } from "@/lib/wa-format";

export type ChatItem = { chat_id: string; phone: string; name: string; last_body: string; last_at: string; unread: number; archived: boolean; labels: { id: string; name: string; color: string }[] };

// Linha da lista de conversas (destaca a conversa aberta)
export function ChatRow({ c }: { c: ChatItem }) {
  const path = usePathname();
  const open = decodeURIComponent(path.split("/")[3] ?? "") === c.chat_id;
  const title = c.name || (c.phone ? fmtPhone(c.phone) : "Contato");
  return (
    <Link
      href={`/admin/conversas/${encodeURIComponent(c.chat_id)}`}
      aria-current={open ? "page" : undefined}
      className={`flex min-h-[4.5rem] items-center gap-3 px-4 py-3 hover:bg-[#202c33] ${open ? "bg-[#2a3942]" : ""}`}
    >
      <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-[#6a7175] text-lg font-medium text-white">{initials(title)}</span>
      <span className="min-w-0 flex-1">
        <span className="flex items-baseline justify-between gap-2">
          <span className="truncate text-[1.05rem] text-[#e9edef]">{title}{c.archived && <span className="ml-2 rounded bg-white/10 px-1.5 py-px align-middle text-[0.65rem] text-[#8696a0]">arquivada</span>}</span>
          <span className={`shrink-0 text-xs ${c.unread ? "text-[#00a884]" : "text-[#8696a0]"}`}>{fmtWhen(c.last_at)}</span>
        </span>
        <span className="flex items-center justify-between gap-2">
          <span className="truncate text-sm text-[#8696a0]">{c.last_body || "—"}</span>
          {c.unread > 0 && <span className="grid h-5 min-w-5 shrink-0 place-items-center rounded-full bg-[#00a884] px-1.5 text-xs font-bold text-[#111b21]">{c.unread}</span>}
        </span>
        {c.labels.length > 0 && (
          <span className="mt-1 flex flex-wrap gap-1">
            {c.labels.slice(0, 3).map((l) => (
              <span key={l.id} className="max-w-[9rem] truncate rounded-full px-2 py-px text-[0.68rem] font-semibold leading-4 text-[#111b21]" style={{ backgroundColor: l.color }}>{l.name}</span>
            ))}
            {c.labels.length > 3 && <span className="text-[0.68rem] leading-4 text-[#8696a0]">+{c.labels.length - 3}</span>}
          </span>
        )}
      </span>
    </Link>
  );
}
