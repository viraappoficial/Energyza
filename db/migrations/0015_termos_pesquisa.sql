-- Termos que as pessoas digitaram no Google antes de clicar no anúncio (vêm da API do Google Ads)
create table if not exists public.ad_search_terms (
  day date not null,
  campaign_id text not null,
  campaign_name text not null default '',
  ad_group_id text not null default '',
  term text not null,
  impressions int not null default 0,
  clicks int not null default 0,
  cost numeric(12,2) not null default 0,
  conversions numeric(10,2) not null default 0,
  synced_at timestamptz not null default now(),
  primary key (day, campaign_id, ad_group_id, term)
);
create index if not exists ad_search_terms_day_idx on public.ad_search_terms (day);

-- Palavras negativas adicionadas pelo painel (guardamos o endereço no Google para poder desfazer)
create table if not exists public.ad_negatives (
  id uuid primary key default gen_random_uuid(),
  campaign_id text not null,
  text text not null,
  match_type text not null check (match_type in ('PHRASE', 'EXACT')),
  resource_name text not null,
  created_at timestamptz not null default now(),
  removed_at timestamptz
);
create index if not exists ad_negatives_active_idx on public.ad_negatives (campaign_id, text) where removed_at is null;
