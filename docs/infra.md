# Infraestrutura — Energyza

## Onde está cada coisa
| Peça | Onde | Observação |
|---|---|---|
| Código | GitHub `viraappoficial/Energyza` | deploy automático a partir da `main` |
| Hospedagem | Vercel, projeto `energyza` (time `viraappoficial's projects`) | domínio atual: `energyza-eight.vercel.app` |
| Banco | Neon (Postgres), projeto `neon-blue-lighthouse` (`dark-breeze-85748291`), região São Paulo | criado pela integração da Vercel |
| Painel do eletricista | `/admin` | login por e-mail e senha (variáveis abaixo) |

## Variáveis de ambiente (Vercel → Settings → Environment Variables)
| Nome | Origem |
|---|---|
| `DATABASE_URL`, `DATABASE_URL_UNPOOLED` (e `POSTGRES_*`) | criadas pelo Neon |
| `SESSION_SECRET` | 32+ caracteres aleatórios (assina o cookie de login) |
| `ADMIN_EMAIL` | e-mail de login do eletricista |
| `ADMIN_PASSWORD_HASH` | `npm run hash-password -- "senha"` (hash em base64) |
| `NEXT_PUBLIC_SITE_URL` | domínio final (ainda não definido) |
| `NEXT_PUBLIC_GA_ID`, `NEXT_PUBLIC_GOOGLE_ADS_ID`, `NEXT_PUBLIC_META_PIXEL_ID`, `NEXT_PUBLIC_GSC_VERIFICATION` | analytics/anúncios (opcionais, ver `docs/marketing.md`) |

Variáveis só valem em deploys novos: depois de mudar uma, faça **Redeploy**.

## Como publicar
Merge na `main` → a Vercel faz o build → o build aplica migrações novas do banco (`db/migrations`, só em produção) → site no ar.

## Como mudar o banco
Criar um arquivo novo `db/migrations/000N_descricao.sql`. Ele roda uma única vez no próximo deploy de produção.

## Trocar a senha do painel
1. `npm run hash-password -- "nova senha"` (mínimo 8 caracteres)
2. Atualizar `ADMIN_PASSWORD_HASH` na Vercel e fazer Redeploy.

## Pendências conhecidas
- Plano **Hobby** da Vercel é só para uso não comercial: migrar para Pro (ou outra hospedagem) antes de anunciar.
- Definir domínio próprio e `NEXT_PUBLIC_SITE_URL`.
- Trocar a senha provisória do painel.
- Fotos de serviços/depoimentos e a revisão visual do site (ver conversa de referências).


## Segurança (varredura de 29/10/2026)
- **Login:** 6 tentativas por IP a cada 15 min (tabela `rate_limits`); muitas falhas no total avisam o dono por push e atrasam as respostas. A sessão (JWT) leva um carimbo da senha: trocar `ADMIN_PASSWORD_HASH` derruba todas as sessões abertas.
- **Agendamento do site:** 4/hora e 10/dia por IP, no máximo 2 agendamentos futuros por telefone, 40 por dia no total e no máximo 15 avisos por hora ao WhatsApp do dono (protege agenda e chip).
- **PDFs públicos** (`/orcamento/…/pdf`, `/recibo/…/pdf`): id validado como UUID e 40 pedidos/min por IP.
- **Webhook e ingest:** corpo limitado (2 MB e 1 MB) antes de ler.
- **Cabeçalhos:** HSTS, `nosniff`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy` e uma CSP enxuta (`object-src 'none'`, `base-uri`, `form-action`, `frame-ancestors`). A CSP de scripts não foi imposta para não quebrar as tags do Google/Meta.
- **Banco:** RLS ligado em todas as tabelas (sem políticas: só o dono acessa). O `scripts/migrate.mjs` liga RLS sozinho em tabelas novas. A API de dados e o Neon Auth estão desligados.
- **Segredos:** todos `sensitive` na Vercel; nada de segredo no histórico do git; `npm audit` sem vulnerabilidades.
- **Pendências de infraestrutura** (fora do código): ver a lista no relatório de segurança (VPS, previews usando o banco de produção, regras de firewall da Vercel).
