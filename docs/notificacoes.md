# Notificações (celular e WhatsApp)

O eletricista é avisado de **mensagem nova de cliente** e de **novo agendamento pelo site**.

## 1. Notificação no celular (Web Push)
- O painel é instalável (manifesto `public/painel.webmanifest`, service worker `public/sw-painel.js`, escopo `/admin/`).
- Em **Mais → Notificações no celular** cada aparelho toca em "Ativar notificações" (e em "Instalar app", no Android).
  No iPhone só funciona com o painel instalado na tela inicial (Compartilhar → Adicionar à Tela de Início, iOS 16.4+).
- Os aparelhos ficam em `push_subscriptions`; os que desinstalam (404/410) são removidos sozinhos.
- Disparos: webhook do WAHA (mensagem nova de cliente, sem avisar reenvios nem o que o próprio eletricista enviou) e `createBooking` (agendamento do site).
  A notificação de uma mesma conversa substitui a anterior (`tag`) e abre direto nela.

### Variáveis (Vercel, Production)
Gerar as chaves uma vez (na VPS): `docker run --rm node:22-alpine npx -y web-push generate-vapid-keys`

| Nome | Valor |
|---|---|
| `VAPID_PUBLIC_KEY` | Public Key gerada |
| `VAPID_PRIVATE_KEY` | Private Key gerada (Segredo) |

Sem elas o cartão de notificações não aparece e nada quebra. Trocar as chaves invalida os aparelhos já ativados (ativar de novo).

## 2. Aviso de novo agendamento pelo WhatsApp
O chip do WAHA manda uma mensagem para o **WhatsApp pessoal** do eletricista com serviço, horário, cliente, telefone, endereço, detalhes e link da agenda.

| Nome | Valor |
|---|---|
| `OWNER_WHATSAPP` | número só com dígitos e 55, ex.: `5544999999999` |

- A conversa com esse número é ignorada na caixa de Conversas (não polui a lista).
- Para reduzir risco de banimento: do WhatsApp pessoal do eletricista, mandar um "oi" para o chip uma vez.

## Bolinhas e alertas no painel
O menu mostra a quantidade de agendamentos aguardando confirmação (Agenda) e de mensagens não lidas (Conversas/Mais), e o Início tem um alerta quando há mensagem nova.
