import Link from "next/link";
import { MessageCircle } from "lucide-react";
import { sql } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { wahaConfigured } from "@/lib/waha";
import { fmtPhone, fmtWhen } from "@/lib/wa-format";
import { PageTitle } from "../page-title";
import { AutoRefresh } from "./auto-refresh";
import { NewChat } from "./new-chat";

export const dynamic = "force-dynamic";

type Chat = { chat_id: string; phone: string; name: string; last_body: string; last_at: string; unread: number };

export default async function ConversasPage() {
  await requireAdmin();
  const chats = await sql<Chat[]>`
    select chat_id, phone, name, last_body, last_at, unread from wa_chats
    order by last_at desc limit 100`;
  const totalUnread = chats.reduce((n, c) => n + c.unread, 0);

  return (
    <>
      <AutoRefresh />
      <PageTitle eyebrow="WhatsApp" title="Conversas">
        {totalUnread > 0 && <span className="rounded-full bg-gold px-3 py-1 text-sm font-bold text-black">{totalUnread} nova(s)</span>}
      </PageTitle>

      {!wahaConfigured() && (
        <p className="mt-4 rounded-xl border border-yellow-500/40 bg-yellow-500/10 p-4 text-sm text-yellow-200">
          O WhatsApp ainda não está ligado. Falta configurar <code>WAHA_URL</code>, <code>WAHA_API_KEY</code> e <code>WAHA_WEBHOOK_SECRET</code> na Vercel.
        </p>
      )}

      <div className="mt-6"><NewChat /></div>

      {chats.length === 0 ? (
        <p className="mt-6 rounded-xl border border-dashed border-border p-5 text-muted">Nenhuma conversa ainda. As mensagens dos clientes aparecem aqui.</p>
      ) : (
        <ul className="mt-6 space-y-3">
          {chats.map((c) => (
            <li key={c.chat_id}>
              <Link href={`/admin/conversas/${encodeURIComponent(c.chat_id)}`} className="edge-card flex min-h-16 items-center gap-3 p-4">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-gold/40 bg-gold/10 text-gold"><MessageCircle className="h-5 w-5" /></span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-baseline justify-between gap-2">
                    <span className="truncate font-semibold">{c.name || (c.phone ? fmtPhone(c.phone) : "Contato")}</span>
                    <span className="shrink-0 text-xs text-muted">{fmtWhen(c.last_at)}</span>
                  </span>
                  <span className="flex items-center justify-between gap-2">
                    <span className="truncate text-sm text-muted">{c.name && c.phone ? `${fmtPhone(c.phone)} · ` : ""}{c.last_body || "—"}</span>
                    {c.unread > 0 && <span className="grid h-6 min-w-6 shrink-0 place-items-center rounded-full bg-gold px-1.5 text-xs font-bold text-black">{c.unread}</span>}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
