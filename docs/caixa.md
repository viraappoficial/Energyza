# Caixa (financeiro em cima dos orçamentos)

Tela **Caixa** (`/admin/caixa`, no menu entre Orçamentos e Conversas; no celular, em **Mais**).

## A regra
- O dinheiro **entra em caixa quando é pago**, pela **data do pagamento**. Sinal conta no dia em que chegou.
- Cada orçamento tem **pagamentos** (valor, forma e data). `Pago` = soma deles; `Falta` = total − pago.
- **A receber** = serviço **concluído** que ainda não foi pago por completo.
- **Previsto** = o que falta pagar dos orçamentos **em aberto** (rascunho, enviado, aprovado).
- **Recusado** não conta em nada.
- Cada pendência pode ter uma **data prevista** do pagamento. Sem pagar até a data, aparece como **atrasado**.

## Como usar
1. **Novo orçamento → Pagamento:** escolha **Nada pago**, **Pagou parte** (valor, forma, data) ou **Pagou tudo**. Opcional: data prevista do saldo e "O serviço já foi feito" (marca como concluído).
2. **Depois:** abra o orçamento → **Registrar pagamento** (valor, forma, data). Nunca passa do que falta. O ✕ remove um pagamento lançado errado.
3. **Previsão:** no orçamento, "Quando o cliente vai pagar o que falta?" → Salvar previsão.
4. **Serviço feito:** no orçamento, **Marcar como concluído**. Se o cliente pagou o saldo na hora, deixe marcado "O cliente pagou o saldo agora" e ele entra em caixa; se não, fica em "A receber". **Reabrir** desfaz a conclusão (os pagamentos continuam).
5. **Despesas:** na tela Caixa, "Lançar despesa" (material, combustível, ferramenta, imposto, ajudante, outros). O gasto com anúncios vem da tela **Tráfego**.

## O que a tela mostra (período: 7 dias, 30 dias, este mês, tudo)
- **Em caixa:** pagamentos recebidos no período. **Resultado** = em caixa − despesas à mão − anúncios.
- **A receber** e **Previsto** (não dependem do período: são o que está pendente hoje).
- **Semana a semana:** recebido (verde) e previsto pela data prevista (tracejado). Mostra também o total atrasado e o que está sem data prevista.
- Listas de a receber, previsto, entradas (pagamentos) e despesas. Cada item abre o orçamento.

## Dados
- `quote_payments` (pagamentos por orçamento) e `quotes.due_date` (previsão do saldo): migração `0011_pagamentos.sql`. Orçamentos já concluídos pela regra antiga viram pagamento do valor total.
- `quotes.status` tem `concluido`; `quotes.completed_at` = data em que o serviço foi concluído. `expenses` = despesas à mão (migração `0010_caixa.sql`).
- Na tela Tráfego, orçamentos concluídos também contam como fechados (retorno dos anúncios).

## Ainda não faz
- Parcelamento automático (ex.: 3x): hoje cada parcela é um pagamento lançado quando chega.
- Previsto por data de execução do serviço (hoje usa a data prevista do pagamento).

## Cobrança dentro da conversa (WhatsApp)
Cada conversa já mostra, no topo, os orçamentos do cliente (ligados pelo **telefone**; se o número for outro, use **Vincular orçamento** e escolha da lista).
- **Faixa "Cobrança":** total, quanto já foi pago, **quanto falta** e a data prevista (vermelho quando atrasa). Aparece para orçamentos aprovados ou concluídos com saldo, ou com pagamento parcial.
- **Cobrar:** coloca no campo de mensagem um texto pronto ("Olá, Fulano! … restam R$ X. Vence/Venceu em dd/mm. Pix: …"). Dá para editar antes de enviar.
- **Recebi:** registra o pagamento ali mesmo (valor, forma, data) e oferece **Avisar o cliente** com a confirmação pronta ("Recebi seu pagamento de R$ X. Ainda faltam R$ Y." ou "Está tudo quitado").
- **Chave Pix na mensagem:** variável de ambiente `PIX_KEY` na Vercel (Production). Sem ela, a mensagem sai sem a linha do Pix.
- No orçamento, o botão **Conversa** abre o chat do cliente. Vínculo manual: coluna `quotes.chat_id` (migração `0012_chat_orcamento.sql`); **desvincular** na própria faixa.
