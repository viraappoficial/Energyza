# Google Analytics no painel (Tráfego → Visitas do site)

## 1. Tag no site (coletar as visitas)
Na Vercel (Production): `NEXT_PUBLIC_GA_ID` = código de medição do GA4 (começa com `G-`). Redeploy.
O site já carrega a tag, respeita o aviso de cookies (Aceitar/Recusar) e envia `generate_lead` (agendamento concluído) e `contact` (toque em WhatsApp, telefone ou e-mail).

## 2. Ler os números no painel (API de leitura do Analytics)
O painel lê o GA4 com uma **conta de serviço** (só leitura). Uma vez só:
1. Google Cloud (console.cloud.google.com): criar/escolher um projeto → **APIs e serviços → Biblioteca** → ativar **Google Analytics Data API**.
2. **IAM e administração → Contas de serviço → Criar conta de serviço** (qualquer nome, ex.: `painel-energyza`). Sem papéis.
3. Na conta criada: **Chaves → Adicionar chave → Criar nova chave → JSON**. Baixa um arquivo `.json` (guardar em lugar seguro; não colocar no repositório nem no chat).
4. No **Google Analytics → Administrador → Acesso à propriedade → Adicionar usuário**: colocar o e-mail da conta de serviço (`...@...iam.gserviceaccount.com`) com papel **Leitor**.
5. Em **Administrador → Detalhes da propriedade**, copiar o **ID da propriedade** (só números, ex.: `412345678`; não é o `G-...`).
6. Na Vercel (Production), criar:

| Nome | Valor |
|---|---|
| `GA4_PROPERTY_ID` | o ID numérico da propriedade |
| `GOOGLE_SERVICE_ACCOUNT_JSON` | o **conteúdo inteiro** do arquivo `.json` (Segredo). Também vale em base64. |

7. Redeploy. A seção **Visitas do site** aparece na tela **Tráfego**.

## O que a seção mostra
Visitantes, visitas, páginas vistas, tempo médio, taxa de visitas que viram agendamento (agendamentos do nosso banco ÷ visitas), toques em WhatsApp/telefone, visitas por dia, origem das visitas (busca, anúncios, direto, redes sociais…) e páginas mais vistas, no período escolhido (7 dias, 30 dias, mês, tudo).

## Observações
- O Analytics só conta quem aceitou os cookies; os números reais são um pouco maiores. Os agendamentos do painel vêm do banco e são completos.
- Os dados ficam guardados 5 minutos no servidor para não gastar a cota do Google.
- Erros comuns (a tela explica): 403 = faltou dar acesso de Leitor à conta de serviço; 404 = ID da propriedade errado; 401 = chave inválida.
