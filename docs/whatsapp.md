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

No WAHA, o webhook aponta para `https://www.energyzaeletrica.com.br/api/waha/webhook` com os eventos `message`, `message.any`, `message.ack`, `message.revoked`, `message.edited` e `message.reaction` (os quatro últimos alimentam ✓ entregue/lido, "mensagem apagada", "editada" e reações; sem eles essas marcas não atualizam, mas o resto funciona).

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

## Câmera e áudio (composer da conversa)
- **Câmera:** no clipe (📎) → **Câmera**. No celular abre a câmera traseira; a foto é reduzida no aparelho (máx. 1600 px) e enviada como imagem. No computador abre a escolha de foto.
- **Áudio:** com o campo vazio, o botão verde vira **microfone**. Toque para gravar (até 3 min), lixeira descarta, seta envia. O navegador pede permissão do microfone na primeira vez (precisa ser https).
- O áudio sai pela rota `/api/sendVoice` do WAHA com `convert: true` (o WAHA converte para o formato de mensagem de voz do WhatsApp). **Enviar áudio/foto/arquivo exige o WAHA Plus**; no Core a tela avisa o erro e o texto segue funcionando.
- O áudio enviado fica guardado (como os outros anexos) e toca na conversa; áudios recebidos já apareciam.

## Encaminhar mensagem e botão de recibo (conversa)
- **Encaminhar:** a setinha ao lado de cada mensagem (texto, foto, PDF ou áudio guardado) abre "Encaminhar para…". Marque até **5 contatos** da lista e/ou digite **números novos** (com DDD, separados por vírgula) e toque em **Enviar**. A cópia aparece na conversa de cada destino. Mensagens cujo arquivo não foi guardado (aviso "veja no celular") só encaminham o texto, se houver.
- **Recibo no próprio chat:** clipe (📎) → **Recibo**, ou o chip **Enviar recibo** na faixa de cobrança, lista os pagamentos já registrados do cliente. Ao escolher um, o PDF do recibo vai anexado com a mensagem pronta.

## Pedir avaliação do Google (conversa)
Chip dourado **Pedir avaliação** (junto das respostas rápidas) e item no clipe (📎): preenchem o campo de mensagem com o pedido e o link de avaliação do Perfil da Empresa (`business.reviewUrl` em `src/lib/config.ts`). Dá para editar antes de enviar.

## Arquivos da conversa
PDFs recebidos/enviados abrem no painel (o leitor do Chrome não funciona em página com CSP "sandbox", por isso PDF verdadeiro, que começa com `%PDF`, é servido sem o sandbox). Qualquer outro tipo de arquivo continua com o sandbox, e o que não for foto, áudio, vídeo ou PDF de verdade é baixado, nunca aberto.

## Conversa fiel ao WhatsApp (responder, apagar, ✓, reações)
- **Menu da mensagem** (setinha ao lado de cada bolha): reagir com emoji, responder, copiar, encaminhar e, nas suas, apagar para todos (pede confirmação).
- **Responder:** a barra "Respondendo a…" aparece acima do campo; o WAHA recebe `reply_to` e o cliente vê a citação. Mensagens recebidas como resposta também mostram a citação.
- **Apagar para todos:** `DELETE /api/default/chats/{chat}/messages/{id}` no WAHA; a bolha vira "Você apagou esta mensagem". Quando o cliente apaga, chega `message.revoked` e a bolha vira "Esta mensagem foi apagada" (o texto e o arquivo saem do banco). O WhatsApp só deixa apagar para todos por tempo limitado.
- **✓ de envio:** ✓ enviada, ✓✓ entregue, ✓✓ azul lida (`message.ack`; a marca só avança). Relógio = enviando, ! vermelho = falhou.
- **Reações:** `PUT /api/reaction` (reagir de novo com o mesmo emoji remove); reações do cliente chegam por `message.reaction`.
- **Texto:** links clicáveis e formatação `*negrito*`, `_itálico_`, `~riscado~`.
- Colunas novas em `wa_messages` (migração 0013): `ack`, `reply_to`, `reply_body`, `reply_from_me`, `deleted`, `edited`, `my_reaction`, `their_reaction`.
- **No servidor do WAHA** (uma vez): incluir os quatro eventos novos na lista de eventos do webhook da sessão (`WHATSAPP_HOOK_EVENTS=message,message.any,message.ack,message.revoked,message.edited,message.reaction` e reiniciar o contêiner).

## Etiquetas das conversas
- Faixa abaixo do cabeçalho da conversa: marcar, criar (nome + cor) e apagar etiquetas. A lista de conversas mostra as etiquetas, filtra por etiqueta ou "não lidas" e busca por nome/telefone.
- Etiquetas iniciais: Novo cliente, Orçamento enviado, Aguardando pagamento, Pago, Serviço agendado, Finalizado (tabelas `wa_labels` e `wa_chat_labels`, migração 0014).
- Automáticas: cliente que escreve pela primeira vez recebe "Novo cliente"; orçamento enviado pelo chat recebe "Orçamento enviado" (ou "Aguardando pagamento" se foi cobrança); pagamento parcial = "Aguardando pagamento"; quitado = "Pago". Se a etiqueta for renomeada ou apagada, a regra automática simplesmente não faz nada.
