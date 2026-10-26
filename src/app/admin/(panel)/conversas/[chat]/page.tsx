import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarClock, FilePlus2, FileText, Paperclip } from "lucide-react";
import { sql } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { brl } from "@/lib/format";
import { fmtPhone, fmtWhen } from "@/lib/wa-format";
import { fmtTime, dayKey, fmtLongDay } from "@/lib/dates";
import { AutoRefresh } from "../auto-refresh";
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

  return (
    <>
      <AutoRefresh every={4000} />
      <div className="flex items-center gap-3">
        <Link href="/admin/conversas" aria-label="Voltar" className="grid h-11 w-11 shrink-0 place-items-center rounded-lg border border-border text-gold"><ArrowLeft className="h-5 w-5" /></Link>
        <div className="min-w-0">
          <h1 className="font-display truncate text-3xl font-extrabold uppercase leading-none">{title}</h1>
          {chat.name && chat.phone && <p className="text-sm text-muted">{fmtPhone(chat.phone)}</p>}
        </div>
      </div>

      {(appts.length > 0 || quotes.length > 0 || chat.phone) && (
        <div className="mt-4 flex flex-wrap gap-2 text-sm">
          {appts.map((a) => (
            <Link key={a.id} href={`/admin/agenda?dia=${dayKey(a.starts_at)}`} className="flex items-center gap-2 rounded-full border border-border px-3 py-1.5 hover:border-gold">
              <CalendarClock className="h-4 w-4 text-gold" /> {a.service_name} · {fmtLongDay(dayKey(a.starts_at))} {fmtTime(a.starts_at)}
            </Link>
          ))}
          {quotes.map((q) => (
            <Link key={q.id} href={`/admin/orcamentos/${q.id}`} className="flex items-center gap-2 rounded-full border border-border px-3 py-1.5 hover:border-gold">
              <FileText className="h-4 w-4 text-gold" /> #{String(q.number).padStart(4, "0")} · {brl(q.total)} · {q.status}
            </Link>
          ))}
          {chat.phone && (
            <Link href={`/admin/orcamentos/novo?nome=${encodeURIComponent(chat.name)}&telefone=${chat.phone}`} className="flex items-center gap-2 rounded-full border border-gold/50 bg-gold/10 px-3 py-1.5 font-semibold text-gold">
              <FilePlus2 className="h-4 w-4" /> Novo orçamento
            </Link>
          )}
        </div>
      )}

      <ul className="mt-5 space-y-2">
        {ordered.length === 0 && <li className="rounded-xl border border-dashed border-border p-5 text-muted">Nenhuma mensagem ainda. Escreva a primeira abaixo.</li>}
        {ordered.map((m) => (
          <li key={m.id} className={`flex ${m.from_me ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-[0.95rem] ${m.from_me ? "rounded-br-sm bg-gold text-black" : "rounded-bl-sm border border-border bg-[#111]"}`}>
              {m.has_media && (
                m.media_id ? (
                  m.media_mime.startsWith("image/") ? (
                    <a href={`/admin/conversas/media/${m.media_id}`} target="_blank" rel="noopener noreferrer">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={`/admin/conversas/media/${m.media_id}`} alt="Imagem" className="mb-1 max-h-72 rounded-lg" />
                    </a>
                  ) : m.media_mime.startsWith("audio/") ? (
                    <audio controls src={`/admin/conversas/media/${m.media_id}`} className="mb-1 max-w-full" />
                  ) : (
                    <a href={`/admin/conversas/media/${m.media_id}`} target="_blank" rel="noopener noreferrer" className="mb-1 flex items-center gap-2 underline">
                      <Paperclip className="h-4 w-4 shrink-0" /> <span className="truncate">{m.media_name || "Arquivo"}</span>
                    </a>
                  )
                ) : (
                  <p className="mb-1 text-xs opacity-70">📎 Arquivo não baixado. Veja no celular.</p>
                )
              )}
              {m.body && <p className="whitespace-pre-wrap break-words">{m.body}</p>}
              <p className={`mt-0.5 text-right text-[11px] ${m.from_me ? "text-black/60" : "text-muted"}`}>{fmtWhen(m.at)}</p>
            </div>
          </li>
        ))}
      </ul>

      <div className="sticky bottom-[4.5rem] z-20 -mx-4 mt-5 border-t border-white/10 bg-black/95 px-4 py-3 backdrop-blur-md lg:bottom-0 lg:mx-0 lg:px-0">
        <Composer chatId={chat.chat_id} />
      </div>
    </>
  );
}
