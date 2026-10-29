import { MessageCircle } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { PageTitle } from "../page-title";
import { ChatList, loadChats, loadLabels, Unconfigured } from "./chat-list";
import { NewChat } from "./new-chat";

export const dynamic = "force-dynamic";

export default async function ConversasPage() {
  await requireAdmin();
  const [chats, labels] = await Promise.all([loadChats(), loadLabels()]);
  const totalUnread = chats.filter((c) => !c.archived).reduce((n, c) => n + c.unread, 0);

  return (
    <>
      {/* computador: a lista fica no painel da esquerda; aqui só o convite para abrir uma conversa */}
      <div className="wa-bg wa-font hidden h-[calc(100dvh-4.5rem)] place-items-center rounded-xl border border-white/10 lg:grid">
        <div className="text-center">
          <span className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-[#202c33] text-[#00a884]"><MessageCircle className="h-10 w-10" /></span>
          <p className="mt-4 text-xl text-[#e9edef]">WhatsApp da Energyza</p>
          <p className="mt-1 text-sm text-[#8696a0]">Escolha uma conversa ao lado ou abra uma nova pelo telefone.</p>
          <div className="mx-auto mt-4 max-w-sm"><Unconfigured /></div>
        </div>
      </div>

      {/* celular */}
      <div className="lg:hidden">
        <PageTitle eyebrow="WhatsApp" title="Conversas">
          {totalUnread > 0 && <span className="rounded-full bg-[#00a884] px-3 py-1 text-sm font-bold text-[#111b21]">{totalUnread} nova(s)</span>}
        </PageTitle>
        <div className="mt-4"><Unconfigured /></div>
        <div className="mt-6"><NewChat /></div>
        <div className="mt-6 overflow-hidden rounded-xl border border-white/10 bg-[#111b21]">
          <ChatList chats={chats} labels={labels} />
        </div>
      </div>
    </>
  );
}
