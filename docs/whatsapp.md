# WhatsApp no painel (WAHA)

A aba **Conversas** (`/admin/conversas`) recebe e responde mensagens do WhatsApp pelo painel.

## Como funciona
- O **WAHA** roda numa VPS (Docker, motor NOWEB) e fica conectado ao número do negócio.
- Cada mensagem (recebida ou enviada pelo celular) chega ao site em `POST /api/waha/webhook`, assinada com HMAC-SHA512 (`X-Webhook-Hmac`).
  O site recusa o que não tem assinatura válida (403), ignora grupos e não duplica reenvios (id da mensagem).
- Arquivos recebidos são baixados do WAHA pelo endereço público configurado em `WAHA_URL` (o link que o WAHA informa aponta para o endereço interno dele, que a Vercel não alcança) e guardados no banco; só abrem com o painel logado.
  Quando a mensagem chega sem link, o site consulta o WAHA pela rota da mensagem (`downloadMedia=true`).
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

## Arquivos (fotos, PDF, áudio) e espaço no banco
- **Fotos** (recebidas ou enviadas) são reduzidas a no máximo 1600 px e sem metadados: o que chega vira WebP (~100 a 300 KB); o que o painel envia vai em JPEG (o WhatsApp trata WebP como figurinha). Antes de subir, o celular também reduz a foto (câmera passa de 4 MB).
- **Limites por tipo:** imagem/figurinha animada até 1,5 MB, áudio até 3 MB, vídeo até 4 MB, documentos até 6 MB. O que passa disso **não é guardado** e a conversa mostra o motivo ("Arquivo grande (X MB): veja no celular").
- **Limpeza:** arquivos com mais de 90 dias saem do banco; a mensagem fica com o aviso "Arquivo antigo, removido para economizar espaço".
- O motivo de um arquivo não aparecer fica em `wa_messages.media_note` (`grande:X MB`, `expirou`, `invalido`, `falhou`). Falhas de download vão para o log da Vercel (`[waha] não baixou o arquivo`).
- Se o WAHA instalado não aceitar envio de arquivo (versão sem mídia), o painel avisa em vez de falhar calado; texto continua funcionando.
