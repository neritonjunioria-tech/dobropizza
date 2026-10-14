# SKILL — Redesign Visual do Painel Administrativo (DOBRO Pizzas)

Este documento é o manual de design oficial para a modernização do **visual** do painel administrativo (`/admin`), sem alterar qualquer funcionalidade do sistema. O cardápio público (a loja) **não faz parte deste trabalho** — nada fora de `src/pages/AdminDashboard.tsx` e dos componentes que só existem dentro do painel (`MenuManager`, `CategoryManager`, `SettingsManager`, `CustomersManager`, `CaixaManager`, `UsersManager`) deve ser alterado.

---

## 1. Seu papel

Você é um designer de produto sênior, com a mesma régua de qualidade de quem desenhou o Stripe Dashboard, o Linear, os apps internos de operação da Uber e o painel de lojista do iFood — ferramentas usadas por profissionais, todo dia, sob pressão, que precisam ser rápidas de ler e bonitas sem serem "decoradas". Você está redesenhando o painel de gestão da DOBRO Pizzas (pizzaria artesanal em São José dos Pinhais — PR, Brasil).

## 2. Regra inviolável (não negociável)

**Zero alteração de funcionalidade.** Você só pode mudar:
`className`, valores de cor/espaçamento/tipografia/sombra/borda, ícones (trocar um ícone do `lucide-react` por outro do mesmo pacote é permitido), e reorganização puramente visual de layout (ex: mover um card de lugar, agrupar visualmente).

Você **nunca** pode mudar: nomes de função, `useState`, `useEffect`, lógica de `onClick`/`onChange`/`onSubmit`, nomes de props, chamadas ao Supabase, condições de permissão (`hasPermission(...)`, `isOwner`, `activeTab === ...`). Se precisar mexer perto dessas linhas, copie-as exatamente como estão.

Depois de CADA arquivo alterado, rode `npx tsc --noEmit` — se der qualquer erro, pare e revise antes de continuar. Trabalhe uma tela do painel por vez (Visão Geral → Pedidos → Caixa → Produtos → Categorias → Relatórios → Clientes → Configurações → Usuários → barra lateral/topo), não tente tudo de uma vez.

## 3. O que estamos evitando (o "clichê de IA")

Existem 2-3 estilos que toda ferramenta de IA cai por padrão quando pede pra "deixar mais moderno" — e são exatamente o oposto de único:

- Fundo bege/creme com fonte serifada e um accent terracota.
- Fundo quase-preto com UM accent neon (verde-ácido ou vermelho-vivo) brilhando sobre tudo.
- Visual "jornal": zero border-radius, linhas finas horizontais, colunas densas tipo tabloide.

**Nenhum desses três é permitido aqui.** O que vamos construir tem que nascer do próprio negócio: uma pizzaria/esfiharia, cujo objeto central do dia a dia é a **comanda impressa**. Vamos usar isso.

## 4. Conceito de design: "Balcão de Comanda"

A ideia central: o painel deve parecer o balcão de operação de uma pizzaria de alto padrão — organizado, rápido de ler, com uma referência sutil (nunca caricata) ao objeto físico central do negócio: a comanda de papel térmico. Isso aparece em detalhes discretos (números em fonte monoespaçada, como um recibo; divisores tracejados como linha de corte de papel; cantos levemente recortados em UM elemento de destaque — não em todos). Nada de ícones de pizza espalhados ou fatias decorativas — isso é clichê raso, não referência de verdade.

**Um único gesto de personalidade.** Escolha só um elemento pra ser "o momento marcante" do painel (sugestão: o cabeçalho de cada card de número/KPI, com o valor em fonte monoespaçada grande, como um contador de recibo). Todo o resto do painel fica disciplinado e quieto ao redor dele — não decore tudo, ou nada parece especial.

## 5. Sistema de cores (valores exatos, use estes hex)

```
--cor-fundo:            #FAFAF9   (quase branco, levemente quente — não branco puro)
--cor-superficie:       #FFFFFF   (cards, tabelas)
--cor-borda:            #E7E5E1
--cor-texto-principal:  #1C1917
--cor-texto-secundario: #78716C
--cor-texto-terciario:  #A8A29E

--cor-marca:            #083D07   (Verde Floresta da DOBRO, a cor principal da marca)
--cor-marca-hover:      #A8172F
--cor-marca-fraca:      #FDEEF0   (fundo suave para estados ativos/selecionados)

--cor-sucesso:          #15803D
--cor-sucesso-fraca:    #F0FDF4
--cor-atencao:          #B45309
--cor-atencao-fraca:    #FFFBEB
--cor-perigo:           #B91C1C
--cor-perigo-fraca:     #FEF2F2
--cor-info:             #1D4ED8
--cor-info-fraca:       #EFF6FF

--cor-destaque-recibo:  #1C1917   (preto-tinta para os números estilo comanda, nunca colorido)
```

Regra de uso: a cor de marca (`--cor-marca`) só aparece em **ações primárias** (botões principais, aba ativa da barra lateral, foco de input) — nunca em texto de corpo, nunca em ícones decorativos soltos. As cores de status (sucesso/atenção/perigo/info) só aparecem em badges de status real (ex: "Pendente", "Em Preparo", "Falta no caixa") — nunca como decoração.

## 6. Tipografia

Duas famílias, papéis bem definidos:
- **Interface geral** (títulos, botões, texto de corpo): a fonte do sistema já usada no projeto (`font-sans` do Tailwind) — não trocar de fonte, só a escala.
- **Números e dados** (valores em R$, quantidades, IDs de pedido, horas): `font-mono` do Tailwind (ex: `font-mono tabular-nums`), sempre. Isso é o "gesto de comanda" — todo valor numérico importante ganha essa textura de recibo.

Escala de tamanho (classes Tailwind a usar consistentemente):
```
Título de página:        text-2xl font-bold tracking-tight
Título de card/seção:    text-base font-bold
Corpo:                   text-sm
Legenda/label:           text-xs font-semibold uppercase tracking-wide text-[--cor-texto-terciario]
Número de destaque (KPI): text-3xl font-bold font-mono tabular-nums
```

## 7. Espaçamento, raio e sombra

```
Grid base:        4px (use sempre múltiplos de 4: p-2, p-3, p-4, p-6, p-8 — nunca valores quebrados)
Raio padrão:       rounded-xl (12px) em cards, rounded-lg (8px) em botões/inputs
Sombra de card:    shadow-[0_1px_2px_rgba(28,25,23,0.04),0_1px_8px_rgba(28,25,23,0.04)]  (bem sutil, nunca shadow-xl)
Borda de card:     border border-[#E7E5E1]
```

Espaçamento interno de cards: `p-6` como padrão, `p-4` em cards compactos (mobile ou dentro de listas). Espaço entre cards/seções: `space-y-6` ou `gap-6` — nunca menos que isso, o painel atual está "apertado" demais em vários lugares.

## 8. Elementos específicos a redesenhar

### 8.1 Barra lateral (sidebar)
Estrutura atual (usuário já escolheu preto/dourado) deve virar uma versão **refinada**, não substituída: fundo `#1C1917` (preto-tinta, não preto puro), item ativo com barra lateral esquerda de 3px na cor de marca (não dourado puro — trocar para um dourado mais acinzentado/sóbrio, tipo `#D4AF6A`, que combina com o preto sem parecer "troféu"), ícones `lucide-react` com `stroke-width={1.75}` consistente em todos os itens (hoje alguns têm ícone, outros não — padronizar 100%). Espaçamento maior entre grupos de seção ("Cardápio", "Sistema").

### 8.2 Topo do painel (header) + Logo do Cliente
Reconstruir o cabeçalho de topo do painel (acima do conteúdo de cada aba) com uma barra fixa contendo:
- **Esquerda:** título da página atual + subtítulo pequeno (ex: "Pedidos · Acompanhe e gerencie pedidos em tempo real").
- **Direita:** a logo do cliente (ver especificação abaixo), com um divisor vertical sutil, seguido do nome do usuário logado + botão de sair.

**Especificação da Logo do Cliente (canto superior direito):**
1. Adicione uma nova chave em `settings`: `admin_logo_url` (texto, pode ficar vazio).
2. Na aba "Configurações", adicione uma seção **"Logo do Painel"** — igual ao padrão de upload já usado no projeto (bucket `cardapio-dobropizza`, pasta `admin/logo/`), com preview da imagem atual. Isso é diferente da logo do site público que foi removida antes — esta é exclusiva da área administrativa.
3. No topo do painel administrativo (não no site), se `admin_logo_url` estiver preenchida, mostre a imagem no canto superior direito (altura fixa de `h-9`, `object-contain`). Se estiver vazia, mostre o nome do usuário logado normalmente, sem quebrar o layout.

### 8.3 Cards de KPI (Visão Geral)
Cada card: label pequeno em cima (`text-xs uppercase tracking-wide`), valor grande em `font-mono` embaixo, variação percentual como badge pequeno (verde/vermelho) ao lado do valor — não solto no canto. Ícone do card, se houver, fica discreto (`text-[--cor-texto-terciario]`), nunca colorido chamativo.

### 8.4 Tabelas (Pedidos, Clientes, Usuários, Histórico de Caixa)
Cabeçalho da tabela: fundo `bg-[#FAFAF9]`, texto `text-xs font-semibold uppercase tracking-wide text-[--cor-texto-terciario]`. Linhas com `hover:bg-[#FAFAF9]` sutil, divisor `border-b border-[#F0EFED]` (mais claro que a borda de card). Valores monetários e IDs sempre em `font-mono tabular-nums`. Badges de status usam as cores de status da seção 5 (fundo fraco + texto forte da mesma família), nunca cor sólida preenchida agressiva.

### 8.5 Botões
- Primário: fundo `--cor-marca`, texto branco, `rounded-lg font-semibold`, hover mais escuro (`--cor-marca-hover`).
- Secundário: fundo transparente, borda `--cor-borda`, texto `--cor-texto-principal`, hover `bg-[#FAFAF9]`.
- Destrutivo (remover, excluir): texto/borda `--cor-perigo`, fundo transparente até hover (`hover:bg-[--cor-perigo-fraca]`).
- Todos os botões com estado de carregamento (`disabled` + spinner) já existentes devem manter o comportamento, só o visual do spinner/cores muda para combinar com o sistema novo.

### 8.6 Formulários (Produtos, Configurações, Criar Usuário)
Inputs: `bg-[#FAFAF9] border border-[--cor-borda] rounded-lg text-sm`, foco com `focus:border-[--cor-marca] focus:ring-1 focus:ring-[--cor-marca]/20` (nunca ring grosso colorido chamativo). Labels sempre acima do campo, nunca ao lado, em `text-xs font-semibold uppercase tracking-wide`.

### 8.7 Modais (histórico de cliente, confirmações)
Fundo escurecido `bg-[#1C1917]/50` (não preto puro `/60` genérico), card do modal com `rounded-2xl shadow-xl`, cabeçalho do modal com botão de fechar sempre no canto superior direito, ícone `X` com `stroke-width={2}`.

### 8.8 Gráficos (Recharts, na Visão Geral)
Linha/área do gráfico na cor de marca (`--cor-marca`), grade de fundo bem discreta (`stroke="#F0EFED"`), eixos em `text-xs` na cor terciária. Nunca usar mais de 2 cores num mesmo gráfico, a não ser que cada cor represente uma categoria real de dado (ex: comparação de categorias mais vendidas) — nesse caso, usar uma paleta harmônica derivada da cor de marca (tons de verde/terracota/dourado), nunca cores aleatórias tipo "azul, verde, roxo, amarelo" sem relação com a marca.

### 8.9 Estados vazios e de carregamento
Toda mensagem de "carregando..." ou "nenhum resultado encontrado" ganha um tratamento consistente: ícone discreto + frase curta e direta (ex: "Nenhum pedido ainda hoje" ao invés de só "Nenhum pedido encontrado"), seguindo a voz do produto — direta, sem gírias, sem ponto de exclamação forçado.

## 9. Ordem de execução recomendada

1. Primeiro, crie os tokens de design como constantes reutilizáveis (pode ser um pequeno arquivo `src/adminDesignTokens.ts` exportando as classes/cores mais usadas, para não repetir strings longas em cada componente — mas isso é opcional, use se achar que ajuda a consistência).
2. Sidebar + Topo (com a logo) — é o que aparece em toda tela, então acerta a base primeiro.
3. Visão Geral (cards de KPI + gráfico).
4. Pedidos (tabela).
5. Caixa, Produtos, Categorias, Relatórios, Clientes, Configurações, Usuários — nessa ordem ou na que preferir, mas um de cada vez.
6. Ao final de cada tela, rode `npx tsc --noEmit`, tire um print (se possível) e siga para a próxima.

Pare e pergunte ao usuário antes de:
- Mudar a paleta de cores proposta aqui (ele já aprovou este sistema).
- Fazer qualquer alteração que toque em `src/App.tsx`, `Cart.tsx`, `PizzaModal.tsx` ou qualquer outro arquivo do site público — isso está **fora do escopo** deste trabalho.
