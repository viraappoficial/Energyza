# Energyza Soluções em Elétrica — Informações do cliente

## Dados da empresa
- **Nome:** Energyza Soluções em Elétrica (no orçamento: "Energyza Elétrica")
- **CNPJ:** 66.846.851/0001-68
- **Celular / WhatsApp:** (44) 98843-7653
- **E-mail:** energyzaeletrica@hotmail.com
- **Endereço:** Rua Bogotá, 960 — Vila Morangueira — CEP 87040-120
  - É a casa do eletricista. **A empresa não tem escritório**, então o atendimento é sempre no local do cliente. Avaliar se o endereço deve aparecer publicamente no site (provavelmente não; usar só cidade/região atendida).

## Qualificações
- NR-10 (segurança em instalações e serviços em eletricidade)
- NR-35 (trabalho em altura)
- NR-8 (a confirmar com o cliente o nome/escopo exato do curso)
- Curso para gás (a confirmar — "se não me engano")

## Serviços (textos do cliente)
1. **Instalações elétricas** — Instalação de tomadas, interruptores, luminárias, chuveiros e ventiladores de teto.
2. **Manutenção elétrica** — Reparos, substituição de componentes e correção de falhas elétricas.
3. **Quadros e disjuntores** — Instalação, substituição e manutenção de disjuntores e quadros elétricos.
4. **Diagnóstico elétrico** — Identificação de defeitos, curtos-circuitos e problemas em instalações.

## Identidade visual
- Logo: `assets/logo.png` (fundo preto, raio dourado + "E" prateado, "ENERGY" branco + "ZA" dourado, slogan "SOLUÇÕES EM ELÉTRICA").
- Paleta: preto, branco/prata e dourado/âmbar (~`#E0A030`; ajustar com cor extraída do arquivo original).
- Tom: premium, escuro com detalhes dourados.

## Modelo de orçamento atual
Arquivo: `assets/modelo-orcamento.pdf` (A4, 1 página). Estrutura:
- **Cabeçalho:** logo + nome, CNPJ/CPF, telefone, e-mail
- **Faixa:** Orçamento nº · Emitido em · Validade até
- **Cliente:** nome, telefone, e-mail, CPF/CNPJ, endereço, CEP, bairro, cidade, estado
- **Orçamento:** tabela com 24 linhas — ITEM · DESCRIÇÃO · QUANT. · VALOR
- **Rodapé:** subtotal, desconto, acréscimo, **TOTAL**
- Estilo: cabeçalho de tabela preto, linhas finas douradas nos títulos de seção.

## Pedidos novos do cliente
- O sistema deve **gerar o orçamento em PDF** (no mesmo layout acima) e **enviar pelo WhatsApp**.
