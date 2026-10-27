-- Motivo quando o arquivo de uma mensagem não foi guardado (grande demais, não baixou, expirou) e limpeza dos antigos
alter table public.wa_messages add column media_note text not null default '';
create index wa_media_created_idx on public.wa_media (created_at);
