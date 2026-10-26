import { sql } from "@/lib/db";
import { wahaConfigured } from "@/lib/waha";
import { ChatRow, type ChatItem } from "./chat-row";
import { NewChat } from "./new-chat";

export async function loadChats() {
  return sql<ChatItem[]>`
    select chat_id, phone, name, last_body, last_at, unread from wa_chats
    order by last_at desc limit 100`;
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
export function ChatList({ chats }: { chats: ChatItem[] }) {
  if (chats.length === 0) {
    return <p className="p-5 text-sm text-[#8696a0]">Nenhuma conversa ainda. As mensagens dos clientes aparecem aqui.</p>;
  }
  return (
    <ul className="wa-font divide-y divide-white/5">
      {chats.map((c) => <li key={c.chat_id}><ChatRow c={c} /></li>)}
    </ul>
  );
}

// Painel da esquerda no computador (estilo WhatsApp Web)
export function SidePane({ chats }: { chats: ChatItem[] }) {
  const unread = chats.reduce((n, c) => n + c.unread, 0);
  return (
    <aside className="wa-font hidden h-[calc(100dvh-4.5rem)] flex-col overflow-hidden rounded-xl border border-white/10 bg-[#111b21] lg:flex">
      <div className="flex shrink-0 items-center justify-between bg-[#202c33] px-4 py-3">
        <h2 className="text-lg font-semibold text-[#e9edef]">Conversas</h2>
        {unread > 0 && <span className="rounded-full bg-[#00a884] px-2.5 py-0.5 text-xs font-bold text-[#111b21]">{unread} nova(s)</span>}
      </div>
      <div className="shrink-0 border-b border-white/5 p-3"><NewChat compact /></div>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        <ChatList chats={chats} />
      </div>
    </aside>
  );
}
