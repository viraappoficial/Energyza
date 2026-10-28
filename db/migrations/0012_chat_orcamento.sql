-- Vínculo manual de um orçamento com uma conversa (quando o telefone do chat não é o do orçamento).
-- O vínculo automático continua sendo pelo telefone.
alter table public.quotes add column if not exists chat_id text;
create index if not exists quotes_chat_idx on public.quotes (chat_id) where chat_id is not null;
