// Páginas de serviço para o Google (uma por serviço, com Maringá no texto).
// Só afirmações que a Energyza pode sustentar: atendimento no local, orçamento em PDF, NR-10 e NR-35.
export type ServicePage = {
  slug: string;
  name: string;
  title: string;
  description: string;
  intro: string;
  items: string[];
  when: string[];
  faqs: { q: string; a: string }[];
};

export const servicePages: ServicePage[] = [
  {
    slug: "instalacoes-eletricas",
    name: "Instalações elétricas",
    title: "Instalação elétrica residencial e comercial em Maringá",
    description:
      "Instalação de tomadas, interruptores, luminárias, chuveiros e ventiladores de teto em Maringá e região. Atendimento no local, orçamento em PDF, NR-10 e NR-35.",
    intro:
      "Instalações elétricas feitas com segurança, dentro das normas, na sua casa, loja ou escritório em Maringá e região.",
    items: [
      "Tomadas e interruptores novos ou trocados",
      "Chuveiros e torneiras elétricas",
      "Ventiladores de teto e luminárias",
      "Pontos de energia para ar-condicionado e eletrodomésticos",
      "Novos circuitos e ampliações",
    ],
    when: [
      "Reforma ou mudança de endereço",
      "Equipamento novo que precisa de ponto de energia",
      "Tomada ou interruptor esquentando, soltando faísca ou sem funcionar",
    ],
    faqs: [
      { q: "A instalação é feita no local?", a: "Sim. O atendimento é sempre na sua casa ou empresa, em Maringá e região." },
      { q: "Recebo orçamento antes do serviço?", a: "Sim. Depois da avaliação, o orçamento detalhado chega em PDF no seu WhatsApp, antes de qualquer serviço começar." },
    ],
  },
  {
    slug: "manutencao-eletrica",
    name: "Manutenção elétrica",
    title: "Manutenção elétrica preventiva e corretiva em Maringá",
    description:
      "Manutenção elétrica preventiva e corretiva em Maringá e região: reparos, troca de componentes e correção de falhas. Agende online.",
    intro:
      "Reparos e revisões para a parte elétrica funcionar sem susto, com avaliação no local e orçamento claro antes de começar.",
    items: [
      "Reparo de falhas e pontos sem energia",
      "Troca de componentes desgastados",
      "Revisão da instalação (manutenção preventiva)",
      "Correção de ligações inadequadas",
    ],
    when: [
      "Parte da casa ou da loja sem energia",
      "Fiação antiga ou improvisada",
      "Quer revisar a instalação antes de um problema maior",
    ],
    faqs: [
      { q: "Qual a diferença entre preventiva e corretiva?", a: "A corretiva resolve um problema que já aconteceu. A preventiva revisa a instalação para evitar que ele aconteça." },
      { q: "Como agendar?", a: "Pelo botão Agendar orçamento no site. Você escolhe dia e horário e a confirmação vem pelo WhatsApp." },
    ],
  },
  {
    slug: "quadros-e-disjuntores",
    name: "Quadros e disjuntores",
    title: "Quadro de distribuição e disjuntores em Maringá",
    description:
      "Instalação, troca e manutenção de quadros elétricos e disjuntores em Maringá e região. Disjuntor desarmando? Agende uma avaliação.",
    intro:
      "O quadro e os disjuntores protegem a instalação. Cuidamos da troca, da instalação e da manutenção com segurança.",
    items: [
      "Instalação de quadro de distribuição",
      "Substituição de disjuntores",
      "Organização e identificação de circuitos",
      "Manutenção de quadros existentes",
    ],
    when: [
      "Disjuntor desarmando com frequência",
      "Quadro antigo, aquecendo ou com cheiro de queimado",
      "Aumento de carga (novos equipamentos, reforma)",
    ],
    faqs: [
      { q: "Disjuntor desarmando é perigoso?", a: "Pode indicar sobrecarga ou falha na instalação. Não force o religamento repetidas vezes: chame um profissional para avaliar." },
      { q: "Fazem troca de quadro inteiro?", a: "Sim. Avaliamos no local e enviamos o orçamento em PDF antes de começar." },
    ],
  },
  {
    slug: "diagnostico-eletrico",
    name: "Diagnóstico elétrico",
    title: "Diagnóstico de problemas elétricos em Maringá",
    description:
      "Diagnóstico de curtos-circuitos, choques, quedas de energia e defeitos na instalação elétrica em Maringá e região. Atendimento no local.",
    intro:
      "Quando não se sabe de onde vem o problema, o primeiro passo é identificar a causa de verdade, no local.",
    items: [
      "Localização de curtos-circuitos",
      "Investigação de choques e fugas de corrente",
      "Análise de quedas de energia e disjuntores desarmando",
      "Relatório do que foi encontrado e como resolver",
    ],
    when: [
      "Choque ao encostar em torneira, geladeira ou chuveiro",
      "Energia caindo sem motivo aparente",
      "Cheiro de queimado ou fio esquentando",
    ],
    faqs: [
      { q: "É urgente se estou levando choque?", a: "Sim. Evite usar o equipamento ou o ponto afetado e fale com a gente pelo WhatsApp." },
      { q: "Vocês resolvem o problema depois do diagnóstico?", a: "Sim. O orçamento da correção vem em PDF no seu WhatsApp, antes de qualquer serviço." },
    ],
  },
  {
    slug: "iluminacao-e-projetos-eletricos",
    name: "Iluminação e projetos elétricos",
    title: "Iluminação e projetos elétricos em Maringá",
    description:
      "Iluminação residencial e comercial e projetos elétricos em Maringá e região, do ponto de luz ao planejamento da instalação.",
    intro:
      "Iluminação que valoriza o ambiente e projeto elétrico bem planejado, para casa, loja ou obra em Maringá e região.",
    items: [
      "Iluminação residencial e comercial",
      "Iluminação de fachada em LED",
      "Pontos de luz e circuitos de iluminação",
      "Projeto elétrico para reforma ou obra nova",
    ],
    when: [
      "Reforma ou obra nova",
      "Quer renovar a iluminação de casa, loja ou fachada",
      "Ambiente mal iluminado ou com consumo alto",
    ],
    faqs: [
      { q: "Fazem iluminação para lojas e fachadas?", a: "Sim. Veja exemplos reais em Trabalhos realizados na página inicial." },
      { q: "Como começa um projeto?", a: "Pelo agendamento de uma visita. Avaliamos o ambiente e enviamos o orçamento em PDF." },
    ],
  },
];

export function getServicePage(slug: string) {
  return servicePages.find((s) => s.slug === slug);
}
