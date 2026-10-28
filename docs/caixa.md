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

## Recibo em PDF
- Cada pagamento tem um **recibo** (A5, faixa preta, valor em destaque e por extenso, situação do orçamento: quitado ou parcial com o saldo, e o **carimbo da Energyza**). Número: `orçamento-ordem` (ex.: `0012-02`).
- No orçamento: link **Recibo** ao lado de cada pagamento. Na conversa: depois de **Recebi**, toque em **Enviar recibo (PDF)**; o PDF vai anexado, com a mensagem pronta.
- O link do recibo (`/recibo/<id>/pdf`) é secreto como o do orçamento e não aparece no Google.
- O recibo diz "Recibo de pagamento. Não substitui nota fiscal."
- O carimbo é a imagem `public/carimbo-energyza.png` (para trocar, substitua o arquivo).

## Cobrança com Pix (automática)
- **Cobrar** (faixa de cobrança na conversa) anexa o **orçamento em PDF com o bloco "Pagamento via Pix"** no pé: valor que falta, chave, titular, dados do banco, vencimento e o **Pix copia e cola com o valor já preenchido**. Ao enviar, o sistema manda **3 mensagens**: (1) o PDF `cobranca-0001-energyza.pdf` com um texto curto e informal, (2) a **chave Pix sozinha** e (3) o **copia e cola sozinho**, cada um no seu balão, para tocar e segurar copiando só o código (no WhatsApp, a chave no meio de um texto obriga a copiar a mensagem inteira). Se o envio do PDF falhar, os dois códigos não são enviados.
- Variáveis na Vercel (Production): `PIX_KEY` (chave; CPF/CNPJ vão só com dígitos no código), `PIX_NAME` (titular) e `PIX_BANK` (texto livre, ex.: `Banco 0260 · Agência 0001 · Conta …`). Sem `PIX_KEY`, a cobrança sai sem o bloco.
- O mesmo PDF abre em `/orcamento/<id>/pdf?cobranca=1`. O envio normal do orçamento (clipe → Orçamento) continua sem dados de pagamento.
- O copia e cola é o BR Code estático do Banco Central (`src/lib/pix.ts`, CRC16 conferido). Confira com um teste: cole o código no app do banco (sem pagar) e veja se aparece o valor e o nome do titular.
