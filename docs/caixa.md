# Caixa (financeiro em cima dos orçamentos)

Tela **Caixa** (`/admin/caixa`, no menu entre Orçamentos e Conversas; no celular, em **Mais**).

## A regra
- **Concluído** = dinheiro **em caixa**. O valor do orçamento entra na data de recebimento.
- **Em aberto** (rascunho, enviado ou aprovado) = **previsto**.
- **Recusado** não conta em nada.
- Tudo vem do próprio orçamento; não existe lançamento duplicado.

## Como usar
1. **Serviço já feito:** no **Novo orçamento**, marque "Serviço já foi feito: lançar direto no caixa", escolha a forma de pagamento e a data. O orçamento já nasce concluído.
2. **Serviço ainda a fazer:** gere o orçamento normalmente. Ele fica como previsto.
3. **Quando o serviço for feito:** abra o orçamento → "Serviço feito?" → forma de pagamento e data → **Concluir e lançar no caixa**.
4. **Concluiu sem querer:** no orçamento, **Reabrir (volta para previsto)**. Trocar o status em "Marcar como" também ajusta o caixa.
5. **Despesas:** na tela Caixa, "Lançar despesa" (material, combustível, ferramenta, imposto, ajudante, outros). O gasto com anúncios vem sozinho da tela **Tráfego**.

## O que a tela mostra (por período: 7 dias, 30 dias, este mês, tudo)
- **Em caixa:** soma dos orçamentos concluídos no período.
- **Resultado:** em caixa − despesas à mão − anúncios.
- **Previsto:** todos os orçamentos em aberto hoje (não depende do período), separados por status.
- Entradas por semana, lista de entradas (cada uma abre o orçamento) e lista de despesas.

## Dados
- `quotes.status` ganhou `concluido`; novas colunas `completed_at` (data do recebimento) e `payment_method` (migração `0010_caixa.sql`, aplicada no deploy).
- Tabela `expenses` para as despesas à mão.
- Na tela Tráfego, orçamentos **concluídos** também contam como fechados (retorno dos anúncios).

## Ainda não faz
- Pagamento parcial (sinal + saldo): hoje o orçamento concluído entra pelo valor total. Dá para evoluir para "a receber".
- Previsto por data do serviço (hoje é pelo estado do orçamento).
