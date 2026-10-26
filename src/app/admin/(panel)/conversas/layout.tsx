import { requireAdmin } from "@/lib/auth";
import { AutoRefresh } from "./auto-refresh";
import { loadChats, SidePane } from "./chat-list";

export const dynamic = "force-dynamic";

// Computador: lista à esquerda e conversa à direita. Celular: uma tela de cada vez.
export default async function ConversasLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  const chats = await loadChats();
  return (
    <>
      <AutoRefresh />
      <div className="lg:relative lg:left-1/2 lg:grid lg:w-[min(calc(100vw-20.5rem),84rem)] lg:-translate-x-1/2 lg:grid-cols-[22rem_minmax(0,1fr)] lg:gap-4">
        <SidePane chats={chats} />
        <div className="min-w-0">{children}</div>
      </div>
    </>
  );
}
