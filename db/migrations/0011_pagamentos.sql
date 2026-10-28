-- Pagamentos por orçamento: sinal, parcelas, saldo. "Em caixa" = soma do que foi pago (pela data do pagamento).
create table if not exists public.quote_payments (
  id uuid primary key default gen_random_uuid(),
  quote_id uuid not null references public.quotes(id) on delete cascade,
  amount numeric(12,2) not null check (amount > 0),
  paid_at date not null default current_date,
  method text not null default '',
  created_at timestamptz not null default now()
);
create index if not exists quote_payments_quote_idx on public.quote_payments (quote_id);
create index if not exists quote_payments_paid_idx on public.quote_payments (paid_at);

-- quando o cliente vai pagar o saldo (previsão)
alter table public.quotes add column if not exists due_date date;

-- orçamentos já concluídos pela regra anterior: o valor total conta como pago
insert into public.quote_payments (quote_id, amount, paid_at, method)
select q.id, t.total, coalesce(q.completed_at, current_date), q.payment_method
from public.quotes q
cross join lateral (
  select greatest(0, coalesce(sum(i.quantity * i.unit_price), 0) - q.discount + q.surcharge) as total
  from public.quote_items i where i.quote_id = q.id
) t
where q.status = 'concluido' and t.total > 0
  and not exists (select 1 from public.quote_payments p where p.quote_id = q.id);
