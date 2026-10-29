-- Limite de tentativas (login, agendamento, PDFs) e RLS ligado em todas as tabelas
create table if not exists public.rate_limits (
  key text primary key,
  hits int not null default 0,
  reset_at timestamptz not null
);
create index if not exists rate_limits_reset_idx on public.rate_limits (reset_at);

-- RLS ligado (sem políticas) em tudo que for do app: quem não é o dono do banco não lê nem grava nada.
-- O app conecta como dono (que ignora RLS), então nada muda para ele; é uma camada extra caso alguém
-- ligue a API de dados do Neon, crie outro usuário ou o app sofra uma injeção de SQL com um papel menor.
do $$
declare t record;
begin
  for t in
    select c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity
  loop
    execute format('alter table public.%I enable row level security', t.relname);
  end loop;
end $$;
