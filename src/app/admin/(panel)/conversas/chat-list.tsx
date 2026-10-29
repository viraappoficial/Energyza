import { sql } from "@/lib/db";
import { wahaConfigured } from "@/lib/waha";
import type { ChatItem } from "./chat-row";
import { ChatListView, type LabelCount } from "./chat-list-view";
import { NewChat } from "./new-chat";

export async function loadChats() {
  return sql<ChatItem[]>`
    select c.chat_id, c.phone, c.name, c.last_body, c.last_at, c.unread,
      coalesce((select json_agg(json_build_object('id', l.id, 'name', l.name, 'color', l.color) order by l.sort_order)
        from wa_chat_labels cl join wa_labels l on l.id = cl.label_id where cl.chat_id = c.chat_id), '[]'::json) as labels
    from wa_chats c order by c.last_at desc limit 100`;
}

export async function loadLabels() {
  return sql<LabelCount[]>`
    select l.id, l.name, l.color, count(cl.chat_id)::int as count
    from wa_labels l left join wa_chat_labels cl on cl.label_id = l.id
    group by l.id order by l.sort_order, l.created_at`;
}

export function Unconfigured() {
  if (wahaConfigured()) return null;
  return (
    <p className="rounded-xl border border-yellow-500/40 bg-yellow-500/10 p-4 text-sm text-yellow-200">
      O WhatsApp ainda não está ligado. Falta configurar <code>WAHA_URL</code>, <code>WAHA_API_KEY</code> e <code>WAHA_WEBHOOK_SECRET</code> na Vercel.
    </p>
  );
}

// Lista de conversas (usada na tela do celular e no painel da esquerda no computador)
export function ChatList({ chats, labels }: { chats: ChatItem[]; labels: LabelCount[] }) {
  return <ChatListView chats={chats} labels={labels} />;
}

// Painel da esquerda no computador (estilo WhatsApp Web)
export function SidePane({ chats, labels }: { chats: ChatItem[]; labels: LabelCount[] }) {
  const unread = chats.reduce((n, c) => n + c.unread, 0);
  return (
    <aside className="wa-font hidden h-[calc(100dvh-4.5rem)] flex-col overflow-hidden rounded-xl border border-white/10 bg-[#111b21] lg:flex">
      <div className="flex shrink-0 items-center justify-between bg-[#202c33] px-4 py-3">
        <h2 className="text-lg font-semibold text-[#e9edef]">Conversas</h2>
        {unread > 0 && <span className="rounded-full bg-[#00a884] px-2.5 py-0.5 text-xs font-bold text-[#111b21]">{unread} nova(s)</span>}
      </div>
      <div className="shrink-0 border-b border-white/5 p-3"><NewChat compact /></div>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        <ChatList chats={chats} labels={labels} />
      </div>
    </aside>
  );
}
