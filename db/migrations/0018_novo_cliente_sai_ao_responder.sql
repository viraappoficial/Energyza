-- "Novo cliente" é só até a primeira resposta: tira a etiqueta de quem já foi respondido
delete from public.wa_chat_labels cl
using public.wa_labels l
where cl.label_id = l.id and l.name = 'Novo cliente'
  and exists (select 1 from public.wa_messages m where m.chat_id = cl.chat_id and m.from_me);
