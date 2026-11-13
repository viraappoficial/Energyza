-- Item do orçamento que é despesa: algo que a Energyza compra para o cliente (material, peça).
-- O cliente continua vendo o item no orçamento; no Caixa o valor entra como despesa (compras para clientes).
alter table public.quote_items add column if not exists is_expense boolean not null default false;
