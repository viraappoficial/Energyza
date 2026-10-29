# Plano de tráfego — Energyza (eletricista em Maringá)

Objetivo: gerar **agendamentos e pedidos de orçamento** de pessoas em Maringá e região, com custo por lead que dê lucro. Meta e orçamento ficam a definir com o cliente.

## 1. O que o site já faz (pronto)
- **Google Analytics 4 / Google Ads / Meta Pixel:** carregam só se as variáveis `NEXT_PUBLIC_GA_ID`, `NEXT_PUBLIC_GOOGLE_ADS_ID` e `NEXT_PUBLIC_META_PIXEL_ID` estiverem preenchidas na Vercel.
- **Consentimento (LGPD):** banner de cookies; sem aceite, as tags não gravam cookies (Consent Mode do Google e `consent` do Meta).
- **Conversões:**
  - `Lead` / `generate_lead` → agendamento enviado em `/agendar`
  - `Contact` / `contact` → clique em WhatsApp, telefone ou e-mail
- **Origem do lead:** `utm_*`, `gclid`, `fbclid` e referrer ficam salvos no agendamento. A agenda do painel mostra "Google Ads", "Meta Ads" ou a origem, para saber o que trouxe cada cliente.
- **SEO:** `sitemap.xml`, `robots.txt`, dados estruturados de eletricista (JSON-LD), Open Graph e página de privacidade (exigida pelo Google/Meta).

## 2. Passo a passo para ligar (checklist)
1. Criar a propriedade **GA4** (analytics.google.com) → copiar o ID `G-…` → `NEXT_PUBLIC_GA_ID`.
2. Criar a conta **Google Ads** → em *Metas → Conversões*, importar do GA4 o evento `generate_lead` (principal) e `contact` (secundária). Se usar a tag direta do Ads, colocar `AW-…` em `NEXT_PUBLIC_GOOGLE_ADS_ID`.
3. No **Meta Business Suite / Gerenciador de Eventos**, criar o Pixel → `NEXT_PUBLIC_META_PIXEL_ID`. Verificar o domínio quando o site estiver no ar.
4. Criar e verificar o **Google Business Profile** (Perfil da Empresa) como "prestador de serviço" em Maringá. É grátis e traz o mapa/ligações.
5. Cadastrar o site no **Google Search Console** → código de verificação em `NEXT_PUBLIC_GSC_VERIFICATION` → enviar `/sitemap.xml`.
6. Definir `NEXT_PUBLIC_SITE_URL` com o domínio final.
7. Testar com Tag Assistant / Meta Pixel Helper (um agendamento de teste deve registrar `Lead`).

## 3. Google Ads (intenção alta: quem procura na hora)
- **Campanha de Pesquisa**, local Maringá + raio de atendimento, horário comercial (e plantão se ele atender urgência).
- Grupos de palavras-chave (confirmar volume na ferramenta do Google antes de investir): *eletricista maringá*, *eletricista urgente/24 horas*, *instalação de chuveiro*, *troca de disjuntor*, *quadro de luz*, *curto-circuito/queda de energia*, *instalação de ventilador de teto*.
- **Negativar:** curso, vaga, emprego, salário, "como fazer", DIY, grátis.
- **Extensões:** ligação, local, sitelinks (Agendar, Serviços), destaques (NR-10, NR-35, orçamento claro).
- Anúncios levando para `/agendar` (ou uma landing por serviço — ver §5). Lance inicial "maximizar cliques" com teto, migrando para "maximizar conversões" após ~30 conversões.

## 4. Meta Ads (Facebook/Instagram: gera demanda)
- Objetivo **Leads/Mensagens (WhatsApp)** e/ou **Cadastro** no site, raio de ~15–20 km de Maringá.
- Criativos: antes/depois de quadros organizados, vídeo curto "como é o atendimento", selo NR-10/NR-35, oferta de visita/orçamento. Foto real do eletricista dá mais confiança que banco de imagens.
- Públicos: amplo local primeiro; depois remarketing de quem visitou `/agendar` e não concluiu, e lookalike de quem converteu.
- Atenção: eletricista é serviço local de decisão rápida. O Google costuma converter melhor; o Meta serve para remarketing e demanda planejada (reformas, instalações).

## 5. Próximos passos de produto (sugestões)
- **Landing pages por serviço/intenção** (ex.: `/eletricista-maringa`, `/instalacao-de-chuveiro`, `/quadro-de-luz`) com título igual ao anúncio — melhora Índice de Qualidade (menor custo) e SEO.
- **Prova social:** depoimentos reais, fotos de serviços, avaliações do Google na home.
- **Botão flutuante de WhatsApp** com mensagem pré-preenchida por página.
- **Aviso de novo agendamento** ao eletricista (WhatsApp/e-mail) para responder em minutos — velocidade de resposta é o que mais converte lead pago.
- **Relatório no painel:** leads por origem e custo por lead (cruzando com o gasto informado).

## 6. Como medir
- Principais: leads (`generate_lead`), cliques de contato, custo por lead, **taxa de agendamentos que viram serviço** (status `concluido` na agenda) e ticket médio dos orçamentos aprovados.
- Revisão semanal no início: termos de pesquisa (negativar o que não presta), criativos, horários.


## 7. Gestor de tráfego dentro do painel (pronto)
Tela **Tráfego** (`/admin/trafego`):
- Investido, leads de anúncio, custo por lead, cliques, orçamentos aprovados vindos de anúncio e retorno (R$ 1 investido volta quanto), por período (7 dias, 30 dias, mês, tudo).
- De onde vêm os clientes (Google Ads, Meta Ads, orgânico, direto) com leads, aprovados e faturamento por origem.
- Campanhas do Google (gasto, cliques, conversões, leads no site e custo por lead) e gráfico de investimento por dia.
- **Lançar gasto à mão** (Meta, boleto, etc.).
- **Google Ads direto pela API (ativo):** a Vercel chama `/api/cron/google-ads` todo dia (protegido por `CRON_SECRET`) e o botão **Atualizar agora** da aba Tráfego faz o mesmo na hora. Usa OAuth (`GOOGLE_ADS_CLIENT_ID`, `GOOGLE_ADS_CLIENT_SECRET`, `GOOGLE_ADS_REFRESH_TOKEN`) mais `GOOGLE_ADS_CUSTOMER_ID` e `GOOGLE_ADS_LOGIN_CUSTOMER_ID` (a conta administradora). A API atual dispensa o developer token. O app OAuth (projeto `energyza-painel`) está **em produção**, então o refresh token não vence em 7 dias. Se falhar com "Google recusou a autorização", gerar outro refresh token no OAuth Playground.
- **Google Ads sem API (alternativa):** o Google Ads roda um script a cada hora que envia custos e cliques para `POST /api/ads/ingest` (protegido por `ADS_INGEST_TOKEN`). Passo a passo e script prontos na própria tela.
- Para casar o clique com o gasto, colar o **modelo de acompanhamento** da tela nas configurações da conta (`utm_campaign={campaignid}`). O `gclid` e as UTMs já ficam salvos em cada agendamento.
- O retorno depende de o orçamento ser criado **a partir do agendamento** (botão "Fazer orçamento" na agenda) e marcado como **aprovado**.

Próximos passos possíveis: Meta Ads automático, pausar campanha pelo painel (exige developer token do Google) e devolver ao Google o resultado real do lead (conversão offline).

## Estrutura das campanhas no Google Ads (ajustada em 29/10/2026)

Conta de anúncios `629-165-6005`, administradora `299-523-8158`. Tudo lido e alterado pela API (ver "Google Ads direto pela API").

- **Pesquisa - Eletricista Maringá** (R$ 10/dia): lance "Maximizar cliques" com teto de R$ 3,00 por clique (trocar para conversões quando houver ~30 conversões). Só rede de pesquisa do Google (sem Display nem parceiros). Seis grupos, cada um com anúncio responsivo e página de destino própria: Eletricista Maringá (home), Disjuntor e Quadro de Luz (`/servicos/quadros-e-disjuntores`), Chuveiro e Falhas Elétricas (`/servicos/diagnostico-eletrico`), Instalação Elétrica (`/servicos/instalacoes-eletricas`), Manutenção e Reparos (`/servicos/manutencao-eletrica`) e Marca Energyza (home). Palavras em frase e exata (sem ampla). 41 negativas no nível da campanha. Cidades iguais às da PMax (Maringá, Sarandi, Marialva, Mandaguaçu, Mandaguari, Paiçandu, Nova Esperança).
- **Eletricista à Sua Disposição** (Performance Max, R$ 8/dia): localização só por presença, nome da empresa "Energyza Elétrica" (sem maiúsculas), URL final com `www`.
- Conversões que valem para o lance: GA4 `contact` e `generate_lead`, cliques para ligar e chamadas. A conversão "Contato" do site é secundária de propósito (evita contar em dobro).
- Para mexer em novas campanhas, ver o script de simulação e aplicação usado nesta etapa: sempre simular (`validateOnly`) antes de gravar.

## Termos de pesquisa e negativar (aba Tráfego)
- A atualização diária (e o botão **Atualizar agora**) também busca os **termos de pesquisa** dos últimos 30 dias (`search_term_view`) e grava em `ad_search_terms`.
- Seção **O que as pessoas digitaram**: ordenada por gasto, mostra cliques, custo, conversões e a campanha, e soma quanto foi gasto em buscas sem nenhuma conversão.
- **Negativar**: cria a palavra negativa direto na campanha pela API (exata ou em frase) e guarda o endereço em `ad_negatives`; **Desfazer** remove no Google. Só aceita campanhas que já apareceram nos termos.
