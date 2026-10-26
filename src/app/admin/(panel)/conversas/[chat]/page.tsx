import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarClock, Check, FilePlus2, FileText, Paperclip } from "lucide-react";
import { sql } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { brl } from "@/lib/format";
import { fmtPhone, fmtHM, initials, waDay, waDayLabel } from "@/lib/wa-format";
import { fmtTime, dayKey, fmtLongDay } from "@/lib/dates";
import { AutoRefresh } from "../auto-refresh";
import { ChatScroll } from "../chat-scroll";
import { Composer } from "../composer";

export const dynamic = "force-dynamic";

type Msg = { id: string; from_me: boolean; body: string; has_media: boolean; media_id: string | null; media_mime: string; media_name: string; at: string };

export default async function ChatPage({ params }: { params: Promise<{ chat: string }> }) {
  await requireAdmin();
  const chatId = decodeURIComponent((await params).chat);
  const [chat] = await sql<{ chat_id: string; phone: string; name: string }[]>`
    select chat_id, phone, name from wa_chats where chat_id = ${chatId}`;
  if (!chat) notFound();

  // abrir a conversa zera as não lidas
  await sql`update wa_chats set unread = 0 where chat_id = ${chatId} and unread > 0`;

  const last10 = chat.phone.replace(/\D/g, "").slice(-10);
  const [messages, appts, quotes] = await Promise.all([
    sql<Msg[]>`select id, from_me, body, has_media, media_id, media_mime, media_name, at from wa_messages
      where chat_id = ${chatId} order by at desc limit 200`,
    last10.length === 10
      ? sql<{ id: string; service_name: string; starts_at: string; status: string }[]>`
          select id, service_name, starts_at, status from appointments
          where right(regexp_replace(customer_phone, '\D', '', 'g'), 10) = ${last10} and status <> 'cancelado' and ends_at >= now() - interval '1 day'
          order by starts_at limit 3`
      : Promise.resolve([]),
    last10.length === 10
      ? sql<{ id: string; number: number; status: string; total: number }[]>`
          select q.id, q.number, q.status,
            greatest(0, (select coalesce(sum(i.quantity * i.unit_price), 0) from quote_items i where i.quote_id = q.id) - q.discount + q.surcharge) as total
          from quotes q where right(regexp_replace(q.customer_phone, '\D', '', 'g'), 10) = ${last10}
          order by q.number desc limit 3`
      : Promise.resolve([]),
  ]);
  const ordered = [...messages].reverse();
  const title = chat.name || (chat.phone ? fmtPhone(chat.phone) : "Contato");
  const hasContext = appts.length > 0 || quotes.length > 0 || !!chat.phone;

  return (
    <>
      <AutoRefresh every={4000} />
      {/* celular: tela cheia; computador: ocupa a coluna do painel */}
      <div className="wa-font fixed inset-0 z-[45] flex flex-col bg-[#0b141a] lg:static lg:z-auto lg:h-[calc(100dvh-4.5rem)] lg:overflow-hidden lg:rounded-xl lg:border lg:border-white/10">
        <header className="flex shrink-0 items-center gap-2 bg-[#202c33] px-2 py-2">
          <Link href="/admin/conversas" aria-label="Voltar" className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-[#d1d7db] hover:bg-white/10 lg:hidden"><ArrowLeft className="h-6 w-6" /></Link>
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#6a7175] font-medium text-white">{initials(title)}</span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[1.05rem] leading-tight text-[#e9edef]">{title}</p>
            {chat.name && chat.phone && <p className="truncate text-xs text-[#8696a0]">{fmtPhone(chat.phone)}</p>}
          </div>
          {chat.phone && (
            <Link href={`/admin/orcamentos/novo?nome=${encodeURIComponent(chat.name)}&telefone=${chat.phone}`} className="flex shrink-0 items-center gap-1.5 rounded-full bg-[#00a884] px-3 py-2 text-sm font-semibold text-[#111b21]">
              <FilePlus2 className="h-4 w-4" /> <span className="hidden sm:inline">Novo </span>orçamento
            </Link>
          )}
        </header>

        {hasContext && (appts.length > 0 || quotes.length > 0) && (
          <div className="no-scrollbar flex shrink-0 gap-2 overflow-x-auto bg-[#111b21] px-3 py-2 text-xs">
            {appts.map((a) => (
              <Link key={a.id} href={`/admin/agenda?dia=${dayKey(a.starts_at)}`} className="flex shrink-0 items-center gap-1.5 rounded-full bg-[#202c33] px-3 py-1.5 text-[#d1d7db]">
                <CalendarClock className="h-3.5 w-3.5 text-[#00a884]" /> {a.service_name} · {fmtLongDay(dayKey(a.starts_at))} {fmtTime(a.starts_at)}
              </Link>
            ))}
            {quotes.map((q) => (
              <Link key={q.id} href={`/admin/orcamentos/${q.id}`} className="flex shrink-0 items-center gap-1.5 rounded-full bg-[#202c33] px-3 py-1.5 text-[#d1d7db]">
                <FileText className="h-3.5 w-3.5 text-[#00a884]" /> #{String(q.number).padStart(4, "0")} · {brl(q.total)} · {q.status}
              </Link>
            ))}
          </div>
        )}

        <ChatScroll count={ordered.length}>
          {ordered.length === 0 && <p className="mx-auto mt-6 w-fit max-w-xs rounded-lg bg-[#182229] px-4 py-2 text-center text-sm text-[#8696a0]">Nenhuma mensagem ainda. Escreva a primeira abaixo.</p>}
          <ul className="space-y-1">
            {ordered.map((m, i) => {
              const day = waDay(m.at);
              const prev = ordered[i - 1];
              const newDay = !prev || waDay(prev.at) !== day;
              const tail = !prev || prev.from_me !== m.from_me || newDay;
              return (
                <li key={m.id}>
                  {newDay && (
                    <p className="mx-auto my-3 w-fit rounded-lg bg-[#182229] px-3 py-1 text-xs uppercase text-[#8696a0] shadow">{waDayLabel(day)}</p>
                  )}
                  <div className={`flex ${m.from_me ? "justify-end" : "justify-start"} ${tail ? "mt-2" : ""}`}>
                    <div
                      className={`max-w-[85%] px-2.5 py-1.5 text-[0.95rem] leading-snug text-[#e9edef] shadow-sm sm:max-w-[65%] ${
                        m.from_me ? "bg-[#005c4b]" : "bg-[#202c33]"
                      } rounded-lg ${tail ? (m.from_me ? "rounded-tr-none" : "rounded-tl-none") : ""}`}
                    >
                      {m.has_media && (
                        m.media_id ? (
                          m.media_mime.startsWith("image/") ? (
                            <a href={`/admin/conversas/media/${m.media_id}`} target="_blank" rel="noopener noreferrer">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={`/admin/conversas/media/${m.media_id}`} alt="Imagem" className="mb-1 max-h-72 w-full rounded-md object-cover" />
                            </a>
                          ) : m.media_mime.startsWith("audio/") ? (
                            <audio controls src={`/admin/conversas/media/${m.media_id}`} className="mb-1 h-10 max-w-full" />
                          ) : (
                            <a href={`/admin/conversas/media/${m.media_id}`} target="_blank" rel="noopener noreferrer" className="mb-1 flex items-center gap-2 rounded-md bg-black/20 p-2.5">
                              <Paperclip className="h-5 w-5 shrink-0 text-[#8696a0]" /> <span className="truncate">{m.media_name || "Arquivo"}</span>
                            </a>
                          )
                        ) : (
                          <p className="mb-1 text-xs text-[#8696a0]">📎 Arquivo não baixado. Veja no celular.</p>
                        )
                      )}
                      {m.body && <span className="whitespace-pre-wrap break-words">{m.body}</span>}
                      <span className="float-right ml-3 mt-1.5 flex items-center gap-0.5 text-[11px] leading-none text-[#ffffff99]">
                        {fmtHM(m.at)}
                        {m.from_me && <Check className="h-3.5 w-3.5" aria-label="Enviada" />}
                      </span>
                      <span className="clear-both block" />
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </ChatScroll>

        <Composer chatId={chat.chat_id} />
      </div>
    </>
  );
}
