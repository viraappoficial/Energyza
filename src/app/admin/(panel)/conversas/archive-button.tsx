"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Archive, ArchiveRestore } from "lucide-react";
import { setChatArchived } from "../../actions";

// arquivar tira a conversa da lista principal; ela volta sozinha quando chegar mensagem nova
export function ArchiveButton({ chatId, archived }: { chatId: string; archived: boolean }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <button
      type="button"
      disabled={pending}
      aria-label={archived ? "Desarquivar conversa" : "Arquivar conversa"}
      title={archived ? "Desarquivar" : "Arquivar"}
      onClick={() => start(async () => { const r = await setChatArchived(chatId, !archived); if (r.ok) { if (!archived) router.push("/admin/conversas"); else router.refresh(); } })}
      className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-[#d1d7db] hover:bg-white/10 disabled:opacity-50"
    >
      {archived ? <ArchiveRestore className="h-5 w-5" /> : <Archive className="h-5 w-5" />}
    </button>
  );
}
