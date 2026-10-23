-- Energyza: schema do banco (Postgres puro, ex.: Neon)
-- Rodar uma vez: npm run db:migrate
-- Toda a segurança fica no servidor (login do painel + validação das rotas públicas).

create extension if not exists btree_gist;
create extension if not exists pgcrypto;

-- ---------- Serviços ----------
create table public.services (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text not null default '',
  duration_minutes int not null default 60 check (duration_minutes between 15 and 480),
  sort_order int not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- ---------- Horário de trabalho (0 = domingo ... 6 = sábado) ----------
create table public.working_hours (
  id uuid primary key default gen_random_uuid(),
  weekday smallint not null check (weekday between 0 and 6),
  start_time time not null,
  end_time time not null,
  check (end_time > start_time)
);

-- ---------- Folgas / bloqueios ----------
create table public.time_off (
  id uuid primary key default gen_random_uuid(),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  reason text not null default '',
  check (ends_at > starts_at)
);

-- ---------- Agendamentos ----------
create table public.appointments (
  id uuid primary key default gen_random_uuid(),
  service_id uuid references public.services(id) on delete set null,
  service_name text not null,
  customer_name text not null,
  customer_phone text not null,
  address text not null default '',
  notes text not null default '',
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status text not null default 'pendente'
    check (status in ('pendente','confirmado','concluido','cancelado')),
  source text not null default 'site' check (source in ('site','manual')),
  created_at timestamptz not null default now(),
  check (ends_at > starts_at),
  -- impede dois agendamentos ativos sobrepostos
  constraint appointments_no_overlap exclude using gist (
    tstzrange(starts_at, ends_at) with &&
  ) where (status <> 'cancelado')
);
create index appointments_starts_at_idx on public.appointments (starts_at);

-- ---------- Orçamentos ----------
create sequence public.quote_number_seq start 1;

create table public.quotes (
  id uuid primary key default gen_random_uuid(),
  number int not null unique default nextval('public.quote_number_seq'),
  issued_at date not null default current_date,
  valid_until date not null default (current_date + 15),
  customer_name text not null,
  customer_phone text not null default '',
  customer_email text not null default '',
  customer_document text not null default '',
  address text not null default '',
  zip text not null default '',
  neighborhood text not null default '',
  city text not null default '',
  state text not null default 'PR',
  discount numeric(12,2) not null default 0 check (discount >= 0),
  surcharge numeric(12,2) not null default 0 check (surcharge >= 0),
  notes text not null default '',
  status text not null default 'rascunho'
    check (status in ('rascunho','enviado','aprovado','recusado')),
  created_at timestamptz not null default now()
);

create table public.quote_items (
  id uuid primary key default gen_random_uuid(),
  quote_id uuid not null references public.quotes(id) on delete cascade,
  position int not null default 0,
  description text not null,
  quantity numeric(10,2) not null default 1 check (quantity > 0),
  unit_price numeric(12,2) not null default 0 check (unit_price >= 0)
);
create index quote_items_quote_idx on public.quote_items (quote_id, position);

-- ---------- Dados iniciais ----------
insert into public.services (name, description, duration_minutes, sort_order) values
  ('Instalações elétricas', 'Instalação de tomadas, interruptores, luminárias, chuveiros e ventiladores de teto.', 90, 1),
  ('Manutenção elétrica', 'Reparos, substituição de componentes e correção de falhas elétricas.', 60, 2),
  ('Quadros e disjuntores', 'Instalação, substituição e manutenção de disjuntores e quadros elétricos.', 120, 3),
  ('Diagnóstico elétrico', 'Identificação de defeitos, curtos-circuitos e problemas em instalações.', 60, 4);

-- seg a sex 08:00-18:00, sábado 08:00-12:00 (ajustável no painel)
insert into public.working_hours (weekday, start_time, end_time) values
  (1,'08:00','12:00'),(1,'13:00','18:00'),
  (2,'08:00','12:00'),(2,'13:00','18:00'),
  (3,'08:00','12:00'),(3,'13:00','18:00'),
  (4,'08:00','12:00'),(4,'13:00','18:00'),
  (5,'08:00','12:00'),(5,'13:00','18:00'),
  (6,'08:00','12:00');
