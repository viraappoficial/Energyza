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
| `WAHA_URL` / `WAHA_API_KEY` / `WAHA_WEBHOOK_SECRET` | WhatsApp: endereço e chave do WAHA na VPS e a chave HMAC do webhook (`/api/waha/webhook`) |
| `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` | notificações no celular (Web Push); ver `docs/notificacoes.md` |
| `OWNER_WHATSAPP` | WhatsApp pessoal do eletricista que recebe aviso de novo agendamento |
| `SESSION_SECRET` | assina o cookie de sessão |
| `ADS_INGEST_TOKEN` | token do envio automático de custos do Google Ads (painel → Tráfego) |
| `NEXT_PUBLIC_SITE_URL` | domínio público, usado no link do PDF, sitemap e SEO |
| `NEXT_PUBLIC_GA_ID`, `NEXT_PUBLIC_GOOGLE_ADS_ID`, `NEXT_PUBLIC_META_PIXEL_ID`, `NEXT_PUBLIC_GSC_VERIFICATION` | tráfego pago/analytics (opcionais). Veja `docs/marketing.md` |

## Segurança
- Sem login no banco: todo acesso passa pelo servidor. Cada ação do painel chama `requireAdmin()`, e o `src/proxy.ts` barra `/admin` sem sessão.
- Rotas públicas só leem serviços/horários livres e criam agendamento (validado com zod + honeypot). Dois agendamentos não se sobrepõem (restrição no banco).

## Regra do projeto: funcionar em qualquer tela (celular primeiro)
O site e o painel (principalmente orçamentos e o popup de agendamento) são usados no celular, mas têm que funcionar em qualquer tela. Toda tela nova deve ser testada nestes tamanhos: 320x568, 360x640, 375x667, 390x844, 430x932, 844x390 (celular deitado), 768x1024 e 1024x768 (tablet), 1280x800, 1440x900, 1920x1080 e 2560x1440.

Critérios:
- sem rolagem horizontal em nenhuma tela;
- o popup de agendamento cabe inteiro na tela em cada passo (sem rolar na vertical);
- campos com fonte de 16 px (o iPhone não dá zoom), botões e links com pelo menos 40 px de altura;
- ações principais ao alcance do polegar (barra fixa embaixo);
- respeitar a área segura do iPhone (`env(safe-area-inset-*)`) e "reduzir movimento".

## Documentos do cliente
`docs/cliente/` (dados, logo, modelo de orçamento) e `docs/plano.md`.
