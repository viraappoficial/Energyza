import { sql } from "@/lib/db";

export { LABEL_COLORS, type Label } from "@/lib/label-types";

// Aplica uma etiqueta (pelo nome) a uma conversa. Se a etiqueta foi renomeada ou apagada, não faz nada.
export async function labelChat(chatId: string, name: string) {
  await sql`
    insert into wa_chat_labels (chat_id, label_id)
    select ${chatId}, id from wa_labels where name = ${name}
    on conflict do nothing`;
}

export async function unlabelChat(chatId: string, name: string) {
  await sql`delete from wa_chat_labels where chat_id = ${chatId} and label_id in (select id from wa_labels where name = ${name})`;
}

// conversas ligadas a um orçamento (vinculada à mão ou pelo telefone do cliente)
export async function chatsOfQuote(quoteId: string) {
  const rows = await sql<{ chat_id: string }[]>`
    select q.chat_id from quotes q where q.id = ${quoteId} and q.chat_id is not null
    union
    select c.chat_id from quotes q
      join wa_chats c on length(c.phone) >= 10 and right(regexp_replace(q.customer_phone, '[^0-9]', '', 'g'), 10) = right(c.phone, 10)
    where q.id = ${quoteId}`;
  return rows.map((r) => r.chat_id);
}
