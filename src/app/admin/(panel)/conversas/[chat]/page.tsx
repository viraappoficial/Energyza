import Link from "next/link";
import { notFound } from "next/navigation";
import { AlertCircle, ArrowLeft, CalendarClock, Check, CheckCheck, Clock, FilePlus2, Paperclip } from "lucide-react";
import { sql } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { fmtPhone, fmtHM, initials, waDay, waDayLabel } from "@/lib/wa-format";
import { fmtTime, dayKey, fmtLongDay } from "@/lib/dates";
import { AutoRefresh } from "../auto-refresh";
import { ChatScroll } from "../chat-scroll";
import { Composer, type QuoteOption, type ReceiptOption } from "../composer";
import { ForwardSheet, type ForwardChat } from "../forward";
import { MessageMenu } from "../message-menu";
import { WaText } from "@/lib/wa-text";
import { ChargeBar, type Charge, type OtherQuote } from "../charge-bar";

export const dynamic = "force-dynamic";

type Msg = { id: string; from_me: boolean; body: string; has_media: boolean; media_id: string | null; media_mime: string; media_name: string; media_note: string; at: string; ack: number; reply_to: string | null; reply_body: string; reply_from_me: boolean | null; deleted: boolean; edited: boolean; my_reaction: string; their_reaction: string };

// por que o arquivo não aparece (o motivo é gravado quando a mensagem chega)
function mediaNote(note: string) {
  if (note.startsWith("grande:")) return `Arquivo grande (${note.slice(7)}): veja no celular.`;
  if (note === "expirou") return "Arquivo antigo, removido para economizar espaço.";
  if (note === "invalido") return "Não foi possível abrir esse arquivo. Veja no celular.";
  return "Não foi possível baixar o arquivo. Veja no celular.";
}

// ✓ enviada, ✓✓ entregue, ✓✓ azul lida (como no WhatsApp)
function Ticks({ ack }: { ack: number }) {
  if (ack < 0) return <AlertCircle className="h-3.5 w-3.5 text-red-400" aria-label="Falhou ao enviar" />;
  if (ack === 0) return <Clock className="h-3 w-3" aria-label="Enviando" />;
  if (ack === 1) return <Check className="h-3.5 w-3.5" aria-label="Enviada" />;
  if (ack === 2) return <CheckCheck className="h-3.5 w-3.5" aria-label="Entregue" />;
  return <CheckCheck className="h-3.5 w-3.5 text-[#53bdeb]" aria-label="Lida" />;
}

export default async function ChatPage({ params }: { params: Promise<{ chat: string }> }) {
  await requireAdmin();
  const chatId = decodeURIComponent((await params).chat);
  const [chat] = await sql<{ chat_id: string; phone: string; name: string }[]>`
    select chat_id, phone, name from wa_chats where chat_id = ${chatId}`;
  if (!chat) notFound();

  // abrir a conversa zera as não lidas
  await sql`update wa_chats set unread = 0 where chat_id = ${chatId} and unread > 0`;

  const last10 = chat.phone.replace(/\D/g, "").slice(-10);
  const [messages, appts, quotes, others, quoteOptions, receipts, forwardChats] = await Promise.all([
    sql<Msg[]>`select id, from_me, body, has_media, media_id, media_mime, media_name, media_note, at, ack, reply_to, reply_body, reply_from_me, deleted, edited, my_reaction, their_reaction from wa_messages
      where chat_id = ${chatId} order by at desc, created_at desc limit 200`,
    last10.length === 10
      ? sql<{ id: string; service_name: string; starts_at: string; status: string }[]>`
          select id, service_name, starts_at, status from appointments
          where right(regexp_replace(customer_phone, '[^0-9]', '', 'g'), 10) = ${last10} and status <> 'cancelado' and ends_at >= now() - interval '1 day'
          order by starts_at limit 3`
      : Promise.resolve([]),
    // orçamentos deste cliente: pelo telefone ou vinculados à mão a esta conversa
    sql<{ id: string; number: number; status: string; total: number; paid: number; due: string | null; manual: boolean }[]>`
      select q.id, q.number, q.status, q.due_date as due, (q.chat_id = ${chatId}) as manual,
        greatest(0, (select coalesce(sum(i.quantity * i.unit_price), 0) from quote_items i where i.quote_id = q.id) - q.discount + q.surcharge)::float8 as total,
        coalesce((select sum(p.amount) from quote_payments p where p.quote_id = q.id), 0)::float8 as paid
      from quotes q
      where q.status <> 'recusado' and (q.chat_id = ${chatId}
        or (${last10.length === 10} and right(regexp_replace(q.customer_phone, '[^0-9]', '', 'g'), 10) = ${last10}))
      order by q.number desc limit 6`,
    // outros orçamentos recentes, para vincular a esta conversa
    sql<OtherQuote[]>`
      select q.id, q.number, q.customer_name,
        greatest(0, (select coalesce(sum(i.quantity * i.unit_price), 0) from quote_items i where i.quote_id = q.id) - q.discount + q.surcharge)::float8 as total
      from quotes q
      where q.status <> 'recusado' and q.chat_id is distinct from ${chatId}
        and not (${last10.length === 10} and right(regexp_replace(q.customer_phone, '[^0-9]', '', 'g'), 10) = ${last10})
      order by q.number desc limit 40`,
    sql<QuoteOption[]>`
      select q.id, q.number, q.customer_name, q.status, q.valid_until,
        greatest(0, (select coalesce(sum(i.quantity * i.unit_price), 0) from quote_items i where i.quote_id = q.id) - q.discount + q.surcharge) as total,
        (${last10} <> '' and right(regexp_replace(q.customer_phone, '[^0-9]', '', 'g'), 10) = ${last10}) as mine
      from quotes q
      order by mine desc, q.number desc limit 60`,
    // pagamentos já registrados dos orçamentos deste cliente (para mandar o recibo)
    sql<ReceiptOption[]>`
      select * from (
        select p.id, p.amount::float8 as amount, p.paid_at, p.method, q.number,
          row_number() over (partition by p.quote_id order by p.paid_at, p.created_at)::int as seq
        from quote_payments p join quotes q on q.id = p.quote_id
        where q.status <> 'recusado' and (q.chat_id = ${chatId}
          or (${last10.length === 10} and right(regexp_replace(q.customer_phone, '[^0-9]', '', 'g'), 10) = ${last10}))
      ) x order by paid_at desc, seq desc limit 30`,
    // contatos para encaminhar mensagens
    sql<ForwardChat[]>`
      select chat_id, name, phone from wa_chats where chat_id <> ${chatId} order by last_at desc limit 150`,
  ]);
  const ordered = [...messages].reverse();
  const title = chat.name || (chat.phone ? fmtPhone(chat.phone) : "Contato");

  return (
    <>
      <AutoRefresh every={4000} />
      {/* celular: tela cheia; computador: ocupa a coluna do painel */}
      <div className="wa-font fixed inset-0 z-[45] flex flex-col bg-[#0b141a] lg:relative lg:z-auto lg:h-[calc(100dvh-4.5rem)] lg:overflow-hidden lg:rounded-xl lg:border lg:border-white/10">
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

        {appts.length > 0 && (
          <div className="no-scrollbar flex shrink-0 gap-2 overflow-x-auto bg-[#111b21] px-3 py-2 text-xs">
            {appts.map((a) => (
              <Link key={a.id} href={`/admin/agenda?dia=${dayKey(a.starts_at)}`} className="flex shrink-0 items-center gap-1.5 rounded-full bg-[#202c33] px-3 py-1.5 text-[#d1d7db]">
                <CalendarClock className="h-3.5 w-3.5 text-[#00a884]" /> {a.service_name} · {fmtLongDay(dayKey(a.starts_at))} {fmtTime(a.starts_at)}
              </Link>
            ))}
          </div>
        )}

        <ChargeBar
          chatId={chat.chat_id}
          first={(chat.name.split(" ")[0] ?? "").replace(/[^\p{L}]/gu, "")}
          pix={process.env.PIX_KEY ?? ""}
          pixName={process.env.PIX_NAME ?? ""}
          today={dayKey(new Date())}
          charges={quotes as Charge[]}
          others={others}
          receiptCount={receipts.length}
        />

        <ChatScroll count={ordered.length}>
          {ordered.length === 0 && <p className="mx-auto mt-6 w-fit max-w-xs rounded-lg bg-[#182229] px-4 py-2 text-center text-sm text-[#8696a0]">Nenhuma mensagem ainda. Escreva a primeira abaixo.</p>}
          <ul className="space-y-1">
            {ordered.map((m, i) => {
              const day = waDay(m.at);
              const prev = ordered[i - 1];
              const newDay = !prev || waDay(prev.at) !== day;
              const tail = !prev || prev.from_me !== m.from_me || newDay;
              return (
                <li key={m.id} id={`m-${m.id}`}>
                  {newDay && (
                    <p className="mx-auto my-3 w-fit rounded-lg bg-[#182229] px-3 py-1 text-xs uppercase text-[#8696a0] shadow">{waDayLabel(day)}</p>
                  )}
                  <div className={`flex items-center gap-1 ${m.from_me ? "justify-end" : "justify-start"} ${tail ? "mt-2" : ""} ${!m.deleted && (m.my_reaction || m.their_reaction) ? "mb-3" : ""}`}>
                    {m.from_me && !m.deleted && <MessageMenu id={m.id} fromMe who="Você" preview={m.body || m.media_name || "Arquivo"} text={m.body} myReaction={m.my_reaction} canForward={!!(m.body || m.media_id)} />}
                    <div
                      className={`relative max-w-[85%] px-2.5 py-1.5 text-[0.95rem] leading-snug text-[#e9edef] shadow-sm sm:max-w-[65%] ${
                        m.from_me ? "bg-[#005c4b]" : "bg-[#202c33]"
                      } rounded-lg ${tail ? (m.from_me ? "rounded-tr-none" : "rounded-tl-none") : ""}`}
                    >
                      {m.deleted ? (
                        <span className="italic text-[#ffffff99]">🚫 {m.from_me ? "Você apagou esta mensagem" : "Esta mensagem foi apagada"}</span>
                      ) : (
                        <>
                          {m.reply_to && (
                            <a href={ordered.some((x) => x.id === m.reply_to) ? `#m-${m.reply_to}` : undefined}
                              className={`mb-1 block overflow-hidden rounded-md border-l-4 bg-black/20 px-2 py-1 text-sm ${m.reply_from_me ? "border-[#06cf9c]" : "border-[#53bdeb]"}`}>
                              <span className={`block text-xs font-semibold ${m.reply_from_me ? "text-[#06cf9c]" : "text-[#53bdeb]"}`}>{m.reply_from_me ? "Você" : m.reply_from_me === false ? title : "Mensagem"}</span>
                              <span className="line-clamp-2 break-words text-[#ffffffb3]">{m.reply_body || "Mensagem"}</span>
                            </a>
                          )}
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
                              <p className="mb-1 text-xs text-[#8696a0]">📎 {mediaNote(m.media_note)}</p>
                            )
                          )}
                          {m.body && <span className="whitespace-pre-wrap break-words"><WaText text={m.body} /></span>}
                        </>
                      )}
                      <span className="float-right ml-3 mt-1.5 flex items-center gap-0.5 text-[11px] leading-none text-[#ffffff99]">
                        {m.edited && !m.deleted && <span className="mr-0.5">editada</span>}
                        {fmtHM(m.at)}
                        {m.from_me && !m.deleted && <Ticks ack={m.ack} />}
                      </span>
                      <span className="clear-both block" />
                      {!m.deleted && (m.my_reaction || m.their_reaction) && (
                        <span className={`absolute -bottom-3 flex items-center gap-0.5 rounded-full bg-[#202c33] px-1.5 py-0.5 text-sm shadow ring-2 ring-[#0b141a] ${m.from_me ? "right-2" : "left-2"}`}>
                          {m.their_reaction}{m.my_reaction}
                        </span>
                      )}
                    </div>
                    {!m.from_me && !m.deleted && <MessageMenu id={m.id} fromMe={false} who={title} preview={m.body || m.media_name || "Arquivo"} text={m.body} myReaction={m.my_reaction} canForward={!!(m.body || m.media_id)} />}
                  </div>
                </li>
              );
            })}
          </ul>
        </ChatScroll>

        <ForwardSheet chats={forwardChats} />
        <Composer chatId={chat.chat_id} quotes={quoteOptions} receipts={receipts} firstName={(chat.name.split(" ")[0] ?? "").replace(/[^\p{L}]/gu, "")} />
      </div>
    </>
  );
}
