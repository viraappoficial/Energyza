-- Conversas do WhatsApp (WAHA): contatos, mensagens e arquivos recebidos/enviados
create table public.wa_chats (
  chat_id text primary key,            -- ex.: 5544999999999@c.us ou 123@lid
  phone text not null default '',      -- só dígitos com 55; vazio quando o número está oculto (@lid)
  name text not null default '',
  last_body text not null default '',
  last_at timestamptz not null default now(),
  unread int not null default 0,
  created_at timestamptz not null default now()
);
create index wa_chats_last_at_idx on public.wa_chats (last_at desc);

create table public.wa_media (
  id uuid primary key default gen_random_uuid(),
  mime text not null default 'application/octet-stream',
  name text not null default '',
  data bytea not null,
  created_at timestamptz not null default now()
);

create table public.wa_messages (
  id text primary key,                 -- id da mensagem no WhatsApp (evita duplicar reenvios do webhook)
  chat_id text not null references public.wa_chats(chat_id) on delete cascade,
  from_me boolean not null default false,
  body text not null default '',
  has_media boolean not null default false,
  media_id uuid references public.wa_media(id) on delete set null,
  media_mime text not null default '',
  media_name text not null default '',
  at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create index wa_messages_chat_idx on public.wa_messages (chat_id, at);
