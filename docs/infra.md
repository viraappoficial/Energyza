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
