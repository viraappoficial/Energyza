-- Etiquetas nas conversas do WhatsApp (como no WhatsApp Business)
create table if not exists public.wa_labels (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 30),
  color text not null default '#00a884',
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  unique (name)
);
create table if not exists public.wa_chat_labels (
  chat_id text not null references public.wa_chats(chat_id) on delete cascade,
  label_id uuid not null references public.wa_labels(id) on delete cascade,
  primary key (chat_id, label_id)
);
create index if not exists wa_chat_labels_label_idx on public.wa_chat_labels (label_id);

insert into public.wa_labels (name, color, sort_order) values
  ('Novo cliente', '#53bdeb', 1),
  ('Orçamento enviado', '#f2c94c', 2),
  ('Aguardando pagamento', '#ff9f43', 3),
  ('Pago', '#00a884', 4),
  ('Serviço agendado', '#b57edc', 5),
  ('Finalizado', '#8696a0', 6)
on conflict (name) do nothing;
