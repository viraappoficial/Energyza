-- Opção "Outros" no agendamento (para quem não acha o serviço na lista); o eletricista pode editar em Serviços
insert into public.services (name, description, duration_minutes, sort_order)
select 'Outros', 'Não achou o que procura? Descreva o que precisa no próximo campo.', 60, 99
where not exists (select 1 from public.services where name = 'Outros');
