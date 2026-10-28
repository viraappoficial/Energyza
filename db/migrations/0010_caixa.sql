-- Caixa: orçamento concluído vira dinheiro em caixa; aberto (rascunho/enviado/aprovado) é previsto.
alter table public.quotes drop constraint if exists quotes_status_check;
alter table public.quotes
  add constraint quotes_status_check check (status in ('rascunho','enviado','aprovado','concluido','recusado'));

-- data em que o dinheiro entrou e como foi pago
alter table public.quotes add column if not exists completed_at date;
alter table public.quotes add column if not exists payment_method text not null default '';
create index if not exists quotes_completed_idx on public.quotes (completed_at) where status = 'concluido';

-- saídas lançadas à mão (material, combustível…). O gasto com anúncios vem de ad_costs.
create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  day date not null default current_date,
  category text not null default 'outros',
  description text not null,
  amount numeric(12,2) not null check (amount > 0),
  created_at timestamptz not null default now()
);
create index if not exists expenses_day_idx on public.expenses (day);
