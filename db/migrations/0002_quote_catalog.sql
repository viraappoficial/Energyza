-- Catálogo de itens/serviços frequentes para montar orçamentos mais rápido
create table public.quote_catalog (
  id uuid primary key default gen_random_uuid(),
  description text not null unique,
  unit_price numeric(12,2) not null default 0 check (unit_price >= 0),
  created_at timestamptz not null default now()
);

-- orçamento criado a partir de um agendamento (para medir conversão depois)
alter table public.quotes
  add column appointment_id uuid references public.appointments(id) on delete set null;
