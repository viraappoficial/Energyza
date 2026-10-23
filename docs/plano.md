# Plano do projeto — Energyza

Site de apresentação + sistema de agendamentos e orçamentos para eletricista autônomo.

## Stack
TypeScript · Next.js (App Router) · Tailwind + shadcn/ui · Postgres (Neon, via Vercel) + login próprio (sessão JWT em cookie). Trocamos o Supabase por causa do limite de 2 projetos no plano Free · Vercel · Resend (e-mail).

## Ideia central
Site e agenda usam a **mesma tabela de agendamentos** (fonte única de verdade): agendou no site → aparece no painel; criou no painel → bloqueia o horário no site.

## Páginas
- **Público:** home (hero, serviços, sobre/qualificações NR-10/NR-35, galeria, contato), `/agendar`.
- **Privado `/admin` (só o eletricista):** agenda, agendamentos, serviços, horários/bloqueios, clientes, **orçamentos**.

## Módulo de orçamentos (novo)
- Cadastro do cliente + itens (descrição, quantidade, valor), desconto, acréscimo, total.
- Numeração automática, data de emissão e validade.
- **PDF no layout do modelo atual** (`docs/cliente/assets/modelo-orcamento.pdf`), gerado no servidor.
- **Envio por WhatsApp:**
  - Fase inicial: botão "Enviar no WhatsApp" (link `wa.me` com o PDF hospedado, abre no celular do eletricista).
  - Futuro: envio automático via WhatsApp Business API (Meta Cloud API ou provedor tipo Z-API), que tem custo e exige aprovação.
- Opção de transformar orçamento aprovado em agendamento.

## Banco (resumo)
`services`, `appointments`, `working_hours`, `time_off`, `customers`, `quotes`, `quote_items`.

## Fases
1. Fundação (repo, Next.js, Supabase, Vercel)
2. Site público
3. Banco + Auth
4. Agendamento público
5. Painel admin
6. Orçamentos em PDF + WhatsApp
7. Notificações (e-mail/WhatsApp), polimento, domínio

## Em aberto
- Cliente já tem domínio? Fotos de trabalhos?
- Confirmação manual ou automática dos agendamentos?
- Mostrar preços no site?
- Confirmar NR-8 e curso de gás.
- Mostrar endereço no site ou só região atendida?
