# Energyza — site + agenda + orçamentos

Site de apresentação, agendamento online e painel privado do eletricista (agenda e orçamentos em PDF).

**Stack:** Next.js (App Router) · TypeScript · Tailwind · Postgres (Neon) · Vercel.

## Como funciona
- O site (`/`, `/agendar`) e o painel (`/admin`) usam a **mesma tabela `appointments`**: agendou no site → aparece na agenda; criou no painel → o horário some do site.
- Dois agendamentos não podem se sobrepor (restrição de exclusão no banco).
- `/admin` exige login (sessão por cookie assinado).
- Orçamentos: criados no painel, PDF gerado em `/orcamento/<id>/pdf` (link não adivinhável), botão para enviar o link pelo WhatsApp.

## Configuração
1. Crie um banco Postgres (Neon, pela Vercel: **Storage → Neon**). Copie a `DATABASE_URL` (pooled).
2. Copie `.env.example` para `.env.local` e preencha:
   - `ADMIN_EMAIL` e `ADMIN_PASSWORD_HASH` (`npm run hash-password -- "senha"`)
   - `SESSION_SECRET` (`openssl rand -hex 32`)
3. `npm install && npm run db:migrate` aplica as migrações de `db/migrations/` (cada arquivo roda uma vez). Na Vercel, o build aplica as migrações novas sozinho em produção.
   Para mudar o banco, crie um novo arquivo `db/migrations/000N_descricao.sql`.
4. `npm run dev` → http://localhost:3000 (painel em `/admin`).
5. Deploy: importe o repositório na Vercel e cadastre as mesmas variáveis de ambiente.

## Variáveis de ambiente
| Nome | Uso |
|---|---|
| `DATABASE_URL` | Postgres (Neon, URL pooled) |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD_HASH` | login do eletricista (hash em base64) |
| `SESSION_SECRET` | assina o cookie de sessão |
| `NEXT_PUBLIC_SITE_URL` | domínio público, usado no link do PDF, sitemap e SEO |
| `NEXT_PUBLIC_GA_ID`, `NEXT_PUBLIC_GOOGLE_ADS_ID`, `NEXT_PUBLIC_META_PIXEL_ID`, `NEXT_PUBLIC_GSC_VERIFICATION` | tráfego pago/analytics (opcionais). Veja `docs/marketing.md` |

## Segurança
- Sem login no banco: todo acesso passa pelo servidor. Cada ação do painel chama `requireAdmin()`, e o `src/proxy.ts` barra `/admin` sem sessão.
- Rotas públicas só leem serviços/horários livres e criam agendamento (validado com zod + honeypot). Dois agendamentos não se sobrepõem (restrição no banco).

## Regra do projeto: celular primeiro
O site e o painel (principalmente orçamentos) são usados no celular. Toda tela nova deve ser testada em 390 px de largura: sem rolagem horizontal, campos com fonte de 16 px, botões com pelo menos 40 px de altura e ações principais ao alcance do polegar.

## Documentos do cliente
`docs/cliente/` (dados, logo, modelo de orçamento) e `docs/plano.md`.
