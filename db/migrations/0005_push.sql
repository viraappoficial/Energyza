-- Aparelhos do eletricista que aceitaram receber notificações (Web Push)
create table public.push_subscriptions (
  endpoint text primary key,
  p256dh text not null,
  auth text not null,
  user_agent text not null default '',
  created_at timestamptz not null default now()
);
