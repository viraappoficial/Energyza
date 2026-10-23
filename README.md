# Energyza — site + agenda + orçamentos

Site de apresentação, agendamento online e painel privado do eletricista (agenda e orçamentos em PDF).

**Stack:** Next.js (App Router) · TypeScript · Tailwind · Supabase (Postgres + Auth) · Vercel.

## Como funciona
- O site (`/`, `/agendar`) e o painel (`/admin`) usam a **mesma tabela `appointments`**: agendou no site → aparece na agenda; criou no painel → o horário some do site.
- Dois agendamentos não podem se sobrepor (restrição de exclusão no banco).
- `/admin` exige login (proteção em `src/proxy.ts` + RLS no banco).
- Orçamentos: criados no painel, PDF gerado em `/orcamento/<id>/pdf` (link não adivinhável), botão para enviar o link pelo WhatsApp.

## Configuração
1. Crie um projeto no Supabase e rode `supabase/migrations/0001_init.sql` (SQL Editor ou CLI).
2. Em **Authentication → Providers → Email**, **desative "Allow new users to sign up"** e crie manualmente o usuário do eletricista (Authentication → Users).
3. Copie `.env.example` para `.env.local` e preencha as chaves.
4. `npm install && npm run dev` → http://localhost:3000
5. Deploy: importe o repositório na Vercel e cadastre as mesmas variáveis de ambiente.

## Variáveis de ambiente
| Nome | Uso |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` | cliente público |
| `SUPABASE_SERVICE_ROLE_KEY` | só servidor (agendamento público, PDF) |
| `NEXT_PUBLIC_SITE_URL` | domínio público, usado no link do PDF |

## Documentos do cliente
`docs/cliente/` (dados, logo, modelo de orçamento) e `docs/plano.md`.
