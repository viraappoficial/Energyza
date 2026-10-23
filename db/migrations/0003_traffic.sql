-- Gestor de tráfego: custos e resultados dos anúncios (Google Ads, Meta e lançamentos manuais)
create table public.ad_costs (
  id uuid primary key default gen_random_uuid(),
  day date not null,
  channel text not null check (channel in ('google', 'meta', 'outro')),
  campaign_id text not null default '',
  campaign_name text not null default '',
  cost numeric(12,2) not null default 0 check (cost >= 0),
  clicks int not null default 0 check (clicks >= 0),
  impressions int not null default 0 check (impressions >= 0),
  conversions numeric(10,2) not null default 0 check (conversions >= 0),
  -- 'script' = enviado automaticamente pelo Google Ads; 'manual' = lançado no painel
  origin text not null default 'manual' check (origin in ('script', 'manual')),
  note text not null default '',
  synced_at timestamptz not null default now(),
  unique (day, channel, campaign_id, origin)
);
create index ad_costs_day_idx on public.ad_costs (day);
