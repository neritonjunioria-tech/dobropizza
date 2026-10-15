---
name: DOBRO Pizzas - PDV & Cardápio
description: Sistema unificado de PDV, painel de controle e cardápio digital para pizzarias e esfiharias.
colors:
  primary: "#083D07"
  primary-hover: "#0B520A"
  accent: "#D5AF7A"
  accent-hover: "#C49B64"
  dark: "#44210F"
  bg-neutral: "#FDFBF7"
  surface: "#FFFFFF"
  surface-hover: "#F8FAFC"
  text-primary: "#44210F"
  text-secondary: "#745240"
  border: "#E8D8D1"
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

**Creative North Star: "Pizzaria Artesanal, Operação Veloz e Alta Confiabilidade"**

O design do sistema (painel admin, comanda e PDV) une a atmosfera acolhedora de uma pizzaria e esfiha artesanal italiana com a velocidade cirúrgica de um sistema moderno de comanda e caixa. Utiliza o Verde Floresta (#083D07) como cor de autoridade e confirmação, o Dourado (#D5AF7A) para detalhes e distinções, e o fundo Pergaminho (#FDFBF7) para eliminar o cansaço visual de telas de balcão.

**Key Characteristics:**
- Alta densidade de informação sem poluição visual.
- Ações destrutivas com confirmação explícita.
- Cores semânticas intuitivas para pedidos (Pendente: Âmbar, Preparo: Azul, Entrega: Roxo, Concluído: Verde).
- Foco em velocidade de leitura para o operador de caixa e cozinha.

## Colors

### Brand & Primary
- **Verde Floresta** (#083D07 / hover #0B520A): Identidade oficial da DOBRO Pizzas. Usado em botões principais, status aberto, confirmações de pedidos e cabeçalhos de alta prioridade.
- **Dourado Forno** (#D5AF7A): Detalhes refinados, medalhas, destaque de turno e acentos especiais.
- **Forno a Lenha** (#44210F): Tipografia de alto contraste para títulos, alertas e elementos escuros.

### Neutral & Surfaces
- **Fundo Principal** (#FDFBF7): Tom suave pergaminho natural, reduz reflexos e fadiga visual.
- **Surface** (#FFFFFF): Cartões de comanda, modais e painéis elevados.
- **Borda Suave** (#E8D8D1): Delimitadores harmônicos entre áreas operacionais.
- **Texto Secundário** (#745240 / #57534E): Metadados, horários decorridos e legendas.

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
