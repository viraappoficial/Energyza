-- Conversa mais fiel ao WhatsApp: resposta com citação, ✓ entregue/lido, apagada, editada e reações
alter table public.wa_messages
  add column if not exists ack smallint not null default 0,            -- -1 erro, 0 enviando, 1 enviada, 2 entregue, 3 lida, 4 ouvida
  add column if not exists reply_to text,                              -- id da mensagem respondida
  add column if not exists reply_body text not null default '',        -- trecho da respondida (guardado para não depender de buscar de novo)
  add column if not exists reply_from_me boolean,
  add column if not exists deleted boolean not null default false,     -- apagada para todos
  add column if not exists edited boolean not null default false,
  add column if not exists my_reaction text not null default '',
  add column if not exists their_reaction text not null default '';
