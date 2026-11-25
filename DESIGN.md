---
name: "Finanças & ADS"
description: "Sistema visual do painel pessoal de finanças e anúncios."
colors:
  coral: "#ec5329"
  peach: "#ff9569"
  rust: "#9c3219"
  coral-ink: "#24150f"
  balance-action: "#fff3ed"
  balance-action-ink: "#381e15"
  outer: "#eaeaea"
  workspace: "#f6f6f6"
  panel: "#fff"
  ink: "#262520"
  muted: "#605e58"
  dark-hover: "#48443b"
  line: "#e9e7e4"
  panel-border: "#efeeeb"
  field-border: "#dbd8d3"
  soft: "#f4f3f1"
typography:
  display:
    fontFamily: "Inter Variable, Inter, system-ui, sans-serif"
    fontSize: "2rem"
    fontWeight: 650
    lineHeight: 1.08
    letterSpacing: "-.035em"
  headline:
    fontFamily: "Inter Variable, Inter, system-ui, sans-serif"
    fontSize: "2rem"
    fontWeight: 630
    lineHeight: 1.18
    letterSpacing: "-.025em"
  title:
    fontFamily: "Inter Variable, Inter, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 650
    lineHeight: 1.18
    letterSpacing: "-.025em"
  body:
    fontFamily: "Inter Variable, Inter, system-ui, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.45
  label:
    fontFamily: "Inter Variable, Inter, system-ui, sans-serif"
    fontSize: ".82rem"
    fontWeight: 570
    lineHeight: 1.45
rounded:
  field: "9px"
  nav-item: "10px"
  credit-card: "12px"
  panel: "16px"
  compact-pill: "20px"
  workspace: "24px"
  header-pill: "30px"
spacing:
  metrics-gap: "8px"
  mobile-gap: "10px"
  compact-panel-inset: "13px"
  panel-gap: "14px"
  panel-inset: "17px"
  workspace-inset: "18px"
  workspace-outer: "24px"
components:
  button-primary:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.panel}"
    rounded: "{rounded.workspace}"
    padding: "9px 15px"
  button-primary-hover:
    backgroundColor: "{colors.dark-hover}"
  button-secondary:
    backgroundColor: "{colors.panel}"
    textColor: "{colors.ink}"
    rounded: "{rounded.compact-pill}"
    padding: "7px 12px"
  button-text:
    textColor: "{colors.rust}"
    padding: "5px 0"
  button-balance:
    backgroundColor: "{colors.balance-action}"
    textColor: "{colors.balance-action-ink}"
    rounded: "{rounded.compact-pill}"
    padding: "7px 12px"
  field-search:
    textColor: "{colors.muted}"
    rounded: "{rounded.field}"
  nav-active:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.panel}"
    rounded: "{rounded.nav-item}"
    padding: "11px 9px"
  category-chip:
    backgroundColor: "{colors.soft}"
    textColor: "{colors.ink}"
    rounded: "{rounded.compact-pill}"
    padding: "5px 9px"
  metric-card:
    backgroundColor: "{colors.panel}"
    textColor: "{colors.ink}"
    rounded: "{rounded.panel}"
    padding: "{spacing.compact-panel-inset}"
  balance-panel:
    textColor: "{colors.coral-ink}"
    rounded: "{rounded.panel}"
    padding: "{spacing.panel-inset}"
  credit-card:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.panel}"
    rounded: "{rounded.credit-card}"
    padding: "12px"
  credit-card-peach:
    backgroundColor: "{colors.peach}"
    textColor: "{colors.coral-ink}"
---

# Design System — Finanças & ADS

## Overview

**Creative North Star: "Saldo em primeiro plano"**

O painel dá destaque ao saldo disponível e organiza os demais valores para leitura rápida. A direção visual combina o branco, os cinzas claros, os laranjas coral e o grafite da referência escolhida. A marca Finanças & ADS e a organização do painel são próprias do aplicativo.

- Saldo em degradê coral, com o valor dominante e as contas logo abaixo.
- Superfícies claras com bordas discretas, ícones lineares e valores em algarismos tabulares.
- Ações principais e estados ativos em grafite.

## Colors

O coral dá destaque ao saldo, à marca e à série **Recebido**. O pêssego abre o degradê do saldo e aparece na variante clara dos cartões. O ferrugem marca ícones de indicadores, links e foco por teclado. O grafite sustenta o texto, a navegação ativa, as ações principais, os cartões escuros e a série **Pago**.

O cinza externo emoldura a área de trabalho. O branco distingue painéis e controles, e o cinza suave agrupa etiquetas e cabeçalhos de tabela. Os estados financeiros combinam texto e ponto colorido, com verde para **Pago** ou **Recebido** e âmbar para **Pendente**.

## Typography

Inter Variable foi escolhida pela proximidade visual com a referência. A família original da referência não foi identificada. A mesma pilha tipográfica atende à interface inteira. Use algarismos tabulares para valores e mantenha a formatação brasileira de moeda e datas.

O título da página usa a escala `headline`, com redução para `1.7rem` no celular. O saldo usa `display`, com entrelinha e espaçamento entre caracteres mais compactos. Os títulos dos painéis seguem `title`, e os rótulos dos formulários seguem `label`.

## Layout

A área de trabalho tem largura máxima de `1400px`. No desktop, a navegação de `142px` fica à esquerda e o painel inicial distribui saldo, indicadores e gráfico em três colunas. Na segunda linha, a atividade recebe cerca de dois terços da largura e os cartões ocupam o restante.

- Até `1120px`, a navegação muda para uma faixa acima do conteúdo.
- Até `900px`, o gráfico ocupa a largura inteira abaixo do saldo e dos indicadores. Atividade e cartões passam a ocupar linhas independentes.
- Até `540px`, a navegação usa quatro colunas com ícones acima dos rótulos. O conteúdo se empilha, com duas colunas dentro do grupo de indicadores. O espaçamento entre painéis diminui e a tabela assume sua densidade compacta.
- Até `360px`, os cartões da carteira e os campos de formulário ficam em uma coluna. As células da tabela podem quebrar linha.

## Elevation & Depth

A hierarquia vem do contraste entre a área de trabalho, os painéis brancos e o painel de saldo. Bordas finas delimitam painéis e campos. O menu da conta usa sobreposição, fundo branco e borda.

## Shapes

Os raios arredondados aumentam do campo ao painel, e os controles de cabeçalho usam formato de cápsula. A marca, o avatar e as iniciais das instituições usam círculos. Os cartões de crédito têm cantos mais firmes que os painéis que os contêm.

## Components

- **Botões.** A ação principal usa grafite com texto branco. O botão secundário usa fundo branco e borda clara. O botão textual usa ferrugem e sublinhado ao passar o ponteiro. A ação do saldo usa uma cápsula clara sobre o degradê.
- **Campos.** Use borda fina e rótulos claros. O foco tem contorno ferrugem de `2px`. Na busca, o contorno envolve o campo e o ícone.
- **Navegação.** O item atual usa fundo grafite e texto branco. Os demais mantêm ícone e rótulo em cinza, com fundo suave ao passar o ponteiro. O seletor no cabeçalho aplica a mesma linguagem às áreas Finanças e ADS.
- **Saldo e indicadores.** O saldo usa um degradê de `145deg`, do pêssego ao coral, com texto escuro. Os indicadores usam superfícies brancas, valores fortes e ícones em ferrugem.
- **Cartões e etiquetas.** As prévias dos cartões alternam grafite e pêssego. As etiquetas de categoria usam fundo suave e aceitam quebra de linha para nomes longos.

## Do's and Don'ts

- Use rótulos explícitos nos estados de atividade e na legenda do gráfico.
- Alinhe valores monetários à direita nas tabelas e mantenha seus algarismos tabulares.
- Use as duas variantes de cartão com as respectivas cores de texto.
