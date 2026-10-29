-- Conversas arquivadas saem da lista principal e voltam sozinhas quando chega (ou sai) mensagem nova
alter table public.wa_chats add column if not exists archived boolean not null default false;
create index if not exists wa_chats_archived_idx on public.wa_chats (archived, last_at desc);
