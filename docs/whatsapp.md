# WhatsApp no painel (WAHA)

A aba **Conversas** (`/admin/conversas`) recebe e responde mensagens do WhatsApp pelo painel.

## Como funciona
- O **WAHA** roda numa VPS (Docker, motor NOWEB) e fica conectado ao número do negócio.
- Cada mensagem (recebida ou enviada pelo celular) chega ao site em `POST /api/waha/webhook`, assinada com HMAC-SHA512 (`X-Webhook-Hmac`).
  O site recusa o que não tem assinatura válida (403), ignora grupos e não duplica reenvios (id da mensagem).
- Arquivos recebidos são baixados do WAHA e guardados no banco (até 8 MB cada); só abrem com o painel logado.
- Para responder, o painel chama o WAHA (`sendText`, `sendImage`, `sendFile`). Anexos de até 4 MB.
- A conversa mostra, pelo telefone, o agendamento e o orçamento do mesmo cliente e tem atalho "Novo orçamento".

## Variáveis (Vercel, Production)
| Nome | Valor |
|---|---|
| `WAHA_URL` | endereço público do WAHA, ex.: `https://waha.energyzaeletrica.com.br` |
| `WAHA_API_KEY` | chave de API do WAHA (`WAHA2_API_KEY` na VPS) |
| `WAHA_WEBHOOK_SECRET` | chave HMAC do webhook (`WAHA2_HMAC_KEY` na VPS) |

No WAHA, o webhook aponta para `https://www.energyzaeletrica.com.br/api/waha/webhook` com os eventos `message` e `message.any`.

## Cuidados
- WAHA é cliente não oficial do WhatsApp Web: há risco de banimento. Usar chip dedicado, responder só a quem escreveu primeiro, sem disparo em massa.
- Se a sessão cair, o painel avisa "WhatsApp desconectado" ao enviar; reconectar no servidor.

## Situação (instalação feita)
- WAHA no ar na VPS (`/opt/waha2`, porta local 3001), atrás do Caddy em `waha.energyzaeletrica.com.br` (só `/api/*`).
- Sessão `default` pareada com o chip dedicado (44 99178-3132) em `WORKING`, sem restrição do WhatsApp (`reachoutTimelock` nulo e `cappingStatus` NONE).
- Se a sessão cair em `FAILED`, o `start` não resolve ("Session is already running"): rodar `stop` e depois `start`. Se o WhatsApp recusar com "Connection Failure", apagar a sessão (`DELETE /api/sessions/default`), recriar e parear de novo.
- Parear só uma vez por tentativa: código de pareamento vale ~1 minuto e pedidos seguidos podem restringir o número.
