---
name: DOBRO Pizzas - PDV & Cardápio
description: Sistema unificado de PDV, painel de controle e cardápio digital para restaurantes.
colors:
  primary: "#fdde58"
  primary-hover: "#e2c23f"
  text-on-primary: "#0c0a09"
  bg-neutral: "#f8fafc"
  surface: "#ffffff"
  surface-hover: "#f1f5f9"
  text-primary: "#0f172a"
  text-secondary: "#64748b"
  border: "#e2e8f0"
typography:
  body:
    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif"
rounded:
  sm: "0.5rem"
  md: "0.75rem"
  lg: "1rem"
  full: "9999px"
spacing:
  sm: "0.5rem"
  md: "1rem"
---

# Design System: DOBRO Pizzas

## Overview

**Creative North Star: "Operacionalidade Moderna e Focada"**

O design do sistema (painel admin e PDV) prioriza a alta eficiência da operação, utilizando o Amarelo fosco oficial da marca como cor de ação, contrapondo-se a fundos neutros e claros que reduzem o cansaço visual. O sistema é utilitário, veloz e robusto.

**Key Characteristics:**
- Alta densidade de informação sem poluição visual.
- Ações destrutivas ou de controle bem segregadas.
- Cores de status muito claras e diretas.
- Foco em velocidade de leitura para o operador de caixa.

## Colors

O sistema de cores gira em torno de uma identidade neutra limpa com toques fortes da cor da marca.

### Primary
- **Amarelo Fosco Oficial** (#fdde58): Cor de destaque e identidade da marca "DOBRO Pizzas". Usado em botões de ação principal, barras de rolagem ativas, botões de confirmar e focos de interação.

### Neutral
- **Fundo Principal** (#f8fafc): Fundo suave do PDV e painel.
- **Surface** (#ffffff): Cor principal dos modais, cartões e blocos de conteúdo para destacar da base.
- **Texto Principal** (#0f172a): Texto padrão de alto contraste.
- **Texto Secundário** (#64748b): Dicas, notas, subtítulos.
- **Borda** (#e2e8f0): Divisores e delineadores suaves entre áreas de trabalho.

## Typography

**Display/Body Font:** Inter (com fallback para system-ui)

**Character:** Tipografia extremamente neutra, limpa e legível. Construída para apresentar números de preços, quantidades e nomes de produtos de forma inconfundível mesmo à distância ou com pressa.

## Elevation & Depth

O sistema utiliza elevação leve (sombras curtas e sutis) para descolar modais e elementos sobrepostos do fundo principal. 

### Shadow Vocabulary
- **Shadow SM** (`0 1px 2px 0 rgb(0 0 0 / 0.05)`): Leve destaque para itens interativos.
- **Shadow MD/LG**: Usado em modais flutuantes (ex: `CashSessionDetailsModal`, PDVModal) e painéis para reforçar foco na tarefa atual.

## Shapes

Bordas arredondadas são padrão para suavizar a interface, utilizando raios que variam de `0.5rem` em botões menores até `1rem` em painéis de destaque.

## Do's and Don'ts

### Do:
- **Do** usar o amarelo fosco para ações principais e finalizar tarefas.
- **Do** manter alto contraste no texto para garantir a leitura em telas possivelmente mal iluminadas ou sujas (cenário comum de balcão de pizzaria).

### Don't:
- **Don't** aplicar a cor principal em blocos muito grandes (painéis gigantes); ela serve como ponto de foco.
