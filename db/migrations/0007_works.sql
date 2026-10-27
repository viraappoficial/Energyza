-- Trabalhos realizados (galeria do site), gerenciados pelo painel
create table public.works (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null default '',
  -- foto enviada pelo painel (já reduzida e sem metadados) ou, nas iniciais, um arquivo do próprio site
  image_data bytea,
  image_mime text not null default 'image/jpeg',
  static_src text,
  sort_order int not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (image_data is not null or static_src is not null)
);
create index works_order_idx on public.works (sort_order, created_at);

insert into public.works (title, description, static_src, sort_order) values
  ('Iluminação de fachada em LED', 'Prime Barbearia · Maringá/PR', '/obras/letreiro-led-fachada.jpg', 1),
  ('Fachada pronta e iluminada', 'Prime Barbearia · Maringá/PR', '/obras/fachada-iluminada-noite.jpg', 2);
