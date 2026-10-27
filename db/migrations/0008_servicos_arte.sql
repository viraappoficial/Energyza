-- Serviços alinhados à arte oficial da Energyza (residencial e comercial, preventiva e corretiva, iluminação e projetos).
-- Só troca textos que ainda são os originais, para não apagar o que o eletricista já editou no painel.
update public.services
  set description = 'Instalações elétricas residenciais e comerciais: tomadas, interruptores, luminárias, chuveiros e ventiladores de teto.'
  where name = 'Instalações elétricas'
    and description = 'Instalação de tomadas, interruptores, luminárias, chuveiros e ventiladores de teto.';

update public.services
  set description = 'Manutenção preventiva e corretiva: reparos, troca de componentes e correção de falhas elétricas.'
  where name = 'Manutenção elétrica'
    and description = 'Reparos, substituição de componentes e correção de falhas elétricas.';

update public.services
  set description = 'Reparos e instalações em geral, ou algo diferente? Descreva o que precisa no próximo campo.'
  where name = 'Outros'
    and description = 'Não achou o que procura? Descreva o que precisa no próximo campo.';

insert into public.services (name, description, duration_minutes, sort_order)
select 'Iluminação e projetos elétricos',
       'Iluminação residencial e comercial e projetos elétricos, do ponto de luz ao planejamento da instalação.',
       90, 5
where not exists (select 1 from public.services where name = 'Iluminação e projetos elétricos');
