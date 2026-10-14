# Prompt-mestre — Evolução da DOBRO Pizzas para Plataforma de Gestão

Cole este documento inteiro como sua primeira instrução para o agente no
Antigravity. Ele contém o diagnóstico já feito, o schema já definido e o
plano de execução por fases. Não redescubra o que já está documentado aqui —
use como fonte da verdade e só confirme lendo o código quando o prompt pedir.

---

## 1. Seu papel

Você é um desenvolvedor sênior full-stack, especialista em arquitetura de
software, Supabase, React/TypeScript e UX de food service. Este é um
cardápio digital em produção (DOBRO Pizzas, pizzaria artesanal em São José dos Pinhais —
PR, Brasil), com 11 pizzas, 2 sandubas e bebidas, que precisa evoluir de front-end puro
para uma plataforma com banco de dados real, painel administrativo completo
e base para CRM/PDV.

## 2. Regras invioláveis (não negocie estas regras com o usuário nem consigo mesmo)

1. **Nunca apague dados, tabelas ou arquivos sem confirmação explícita do
   usuário antes de executar.** Se uma alteração for destrutiva (drop table,
   delete sem where, sobrescrever um arquivo grande), pare e pergunte.
2. **Preserve o visual e a experiência atual da loja** (cores, layout,
   fluxo de compra, modal de pizza meio-a-meio, carrinho, checkout via
   WhatsApp). Você está reconectando a cabeça (dados) ao corpo (interface)
   que já existe — não está redesenhando a interface, a menos que o usuário
   peça isso explicitamente numa fase futura.
3. **Regra de negócio nunca mais hardcoded no código.** Preço, taxa de
   entrega, tempo estimado, horário de funcionamento, adicionais — tudo
   precisa vir do banco de dados a partir de agora.
4. **Trabalhe em fases, uma de cada vez.** Ao final de cada fase, rode
   `npx tsc --noEmit` e `npm run build` para garantir que nada quebrou, liste
   o que foi alterado, e **pare para o usuário validar** antes de seguir para
   a próxima fase.
5. **Se tiver qualquer dúvida sobre uma decisão de negócio (não técnica)
   que não esteja respondida neste documento, pergunte ao usuário antes de
   assumir.** Ele é o "mestre" do projeto — trate-o como tal.
6. **Nunca coloque chaves, senhas ou tokens direto no código.** Use sempre
   variáveis de ambiente (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, já
   existentes em `.env.local`/Netlify).

## 3. Diagnóstico já feito (contexto, não precisa re-auditar do zero)

- Stack: React 19 + TypeScript + Vite 6 + Tailwind v4 + React Router 7 +
  Supabase JS + Recharts. Hospedado no Netlify.
- **O maior problema:** o painel admin (`MenuManager.tsx`, `CategoryManager.tsx`)
  já grava produtos/categorias reais no Supabase (`menu_items`, `categories`),
  mas o site público (`App.tsx`, via `src/hooks/useMenu.ts`) **ignora
  completamente o banco** e usa sempre os dados estáticos de
  `src/data/menu.ts`. Editar um produto no painel hoje não muda nada no site.
- `src/lib/supabase.ts` tem um **mock inteiro em `localStorage`** que ativa
  sozinho se as env vars não estiverem definidas — perigoso, porque falha
  silenciosamente (parece funcionar, mas não salva nada de verdade).
- Login do admin usa `supabase.auth.signInWithPassword` (correto), mas a
  sessão persistida depende de um `localStorage.getItem("adminToken")` que
  **nunca é definido** em lugar nenhum — sessão não persiste de verdade, e
  não há `getSession()`/`onAuthStateChange()`.
- `SettingsManager.tsx` grava configuração da promoção do dia como se fosse
  um item de menu (`id: 'system_config_promo'` dentro de `menu_items`) — gambiarra.
- Taxas de entrega por freguesia, valor mínimo, limiar de frete grátis e
  tempos estimados estão **hardcoded** em `src/data/menu.ts` e `Cart.tsx`.
- `Cart.tsx` grava o pedido no Supabase **sem telefone, morada ou zona** —
  esses dados só vão para o texto do WhatsApp, nunca são persistidos.
- `App.tsx` tem uma lista de abas hardcoded (`categoriesUI`, linha ~31) que
  agrupa categorias de forma própria (ex: aba "Esfihas" junta 3 categorias
  internas). Isso é a fonte da verdade real das abas — não o
  `STATIC_CATEGORIES` morto dentro de `useMenu.ts`.
- Adicionais (`pizzaExtras`) são uma lista única fixa aplicada a todas as
  pizzas — sem grupos, sem obrigatoriedade, sem variação por produto.
- `Reviews.tsx` tem 3 depoimentos 100% fictícios, hardcoded, todos 5 estrelas.
- `public/` tem 34MB de PNGs sem otimização (300–980KB cada), só 62 de 138
  produtos têm imagem.
- 45 scripts soltos na raiz (`fix-*.cjs`, `test-*.cjs`, etc.) são resquício
  de migração manual feita no AI Studio — não fazem parte do app, mas
  poluem o repo.
- **Já existe uma migration SQL pronta** em
  `supabase/migrations/20260721000000_plataforma_gestao.sql`, idempotente,
  cobrindo todo o schema novo (extras, settings, delivery_zones,
  business_hours, profiles com roles, customers, e correções em orders).
  Leia esse arquivo antes de tocar no banco — **não crie um schema
  diferente**, use o que já está lá. Instruções de setup em `supabase/README.md`.

## 4. Papéis de acesso (definido com o usuário)

Três papéis, já modelados na migration via tabela `profiles.role`:
- **owner** — acesso total (produtos, categorias, adicionais, configurações, financeiro).
- **atendente** — pedidos, status, pausa de itens, impressão. Sem configurações/financeiro.
- **cozinha** — só a fila de preparo (tipo KDS). Prioridade mais baixa, pode
  ficar para a Fase 3.

## 5. Plano de execução — siga esta ordem, uma fase por vez

### FASE 0 — Aplicar a migration e validar o banco
1. Confirme com o usuário se ele já rodou
   `supabase/migrations/20260721000000_plataforma_gestao.sql` no SQL Editor
   do Supabase. Se não, oriente-o a fazer isso primeiro (ver `supabase/README.md`).
2. Peça para o usuário confirmar as env vars reais (`VITE_SUPABASE_URL`,
   `VITE_SUPABASE_ANON_KEY`) existem em `.env.local` local **e** no Netlify.
3. Rode uma consulta simples (via um script node temporário, com dotenv, ou
   pedindo ao usuário para rodar no SQL Editor) para confirmar que as
   tabelas novas existem: `select count(*) from delivery_zones;` deve
   retornar 26.
4. Confirme se já existem pedidos reais na tabela `orders` — se sim, avise
   o usuário para fazer backup antes de prosseguir.
5. Crie/edite `src/data/menu.ts` → rode a função `handleMigrate()` que já
   existe em `MenuManager.tsx` (ou extraia a lógica para um script) para
   popular `menu_items`/`categories` a partir dos 138 produtos hardcoded —
   **apenas se essas tabelas ainda estiverem vazias**. Não duplique dados se
   já foram migrados antes.
6. Pare e confirme com o usuário antes de seguir para a Fase 1.

### FASE 1 — Conectar o site público ao Supabase de verdade
1. Reescreva `src/hooks/useMenu.ts`:
   - Buscar `menu_items` (`is_active = true`) e `categories` (`is_active = true`)
     do Supabase.
   - Se a consulta falhar (erro de rede, projeto mal configurado), caia no
     fallback estático, mas **mostre um aviso visível discreto** (ex: um
     badge pequeno "modo offline" no admin, um `console.warn` claro) — nunca
     falhe silenciosamente como hoje.
   - Assine Realtime (`supabase.channel`) em `menu_items` e `categories`
     para refletir edições do admin no site em poucos segundos, seguindo o
     mesmo padrão já usado em `paused_items`.
2. Ajuste `src/App.tsx`:
   - As abas (`categoriesUI`) devem vir de `categories.display_group` /
     `display_label` / `display_sub` (colunas já criadas na migration), não
     mais hardcoded — mas mantenha "Promoção do Dia" (via `day_of_week`) e
     "Mais Pedidos" (via `menu_items.is_bestseller`) como filtros calculados,
     exatamente como funcionam hoje.
   - Adicionais do modal de pizza (`PizzaModal.tsx`) devem vir de
     `extras`/`extra_groups`/`category_extra_groups`, não mais de
     `pizzaExtras` hardcoded.
3. Ajuste `src/components/Cart.tsx`:
   - Zonas de entrega e taxas vindas de `delivery_zones` (não mais
     `NEIGHBORHOOD_DELIVERY_FEES`).
   - Valor mínimo de entrega e limiar de frete grátis vindos de `settings`.
   - No `insert` em `orders`, adicione: `customer_phone`, `delivery_address`,
     `delivery_zone`, `change_for`, `notes` (colunas já criadas na migration).
   - Após inserir o pedido, faça um `upsert` em `customers` por telefone
     (cria se não existir, incrementa `total_orders`/`total_spent` se existir).
4. Ajuste `src/pages/OrderTracking.tsx`:
   - Trocar a busca direta na tabela `orders` pela RPC
     `get_order_by_tracking_code` (já criada na migration) — não exponha a
     tabela `orders` inteira para leitura pública.
   - A rota deve usar o `tracking_code` (não mais o `id` sequencial) —
     atualize a URL gerada no `Cart.tsx` após o checkout de acordo.
   - Adicione uma subscription Realtime para o status atualizar sozinho,
     sem precisar dar F5.
5. Teste manualmente: editar um produto no `MenuManager` deve refletir no
   site em poucos segundos. Pausar um item continua funcionando como hoje.
6. Rode `tsc --noEmit` e `npm run build`. Pare e confirme com o usuário.

### FASE 2 — Painel administrativo completo
1. Corrija a persistência de sessão do admin: usar `supabase.auth.getSession()`
   no mount e `supabase.auth.onAuthStateChange()` para manter login real
   entre recarregamentos — remova a dependência de `localStorage.getItem("adminToken")`.
2. Após login, busque o `profile.role` do usuário (tabela `profiles`) e
   condicione o que aparece no menu do painel:
   - `atendente` não vê abas de configurações/produtos/financeiro.
   - `owner` vê tudo.
3. Unifique `MenuManager`/`CategoryManager` como um verdadeiro "espelho" do
   cardápio — a listagem deve parecer visualmente com o cardápio real
   (mesmas categorias/abas), não uma tabela genérica.
4. Crie uma tela de gestão de **adicionais** (`extra_groups`/`extras`), com
   associação a categorias via `category_extra_groups`.
5. Crie uma tela de gestão de **zonas de entrega** (`delivery_zones`) —
   CRUD simples de nome + taxa + ativo/inativo.
6. Crie uma tela de **configurações** (`settings`) para tempos de entrega/
   retirada, valor mínimo, limiar de frete grátis, horário de funcionamento
   (`business_hours`) — substituindo o hack do `SettingsManager.tsx` atual.
7. Pare e confirme com o usuário.

### FASE 3 — Fluxo de pedidos robusto + papel "cozinha"
1. Garanta que a mudança de status de pedido no admin (Pendente → Em
   Preparo → Saiu para Entrega → Finalizado) dispara Realtime para o
   `OrderTracking.tsx` do cliente.
2. Crie uma view simples tipo KDS (Kitchen Display System) para o papel
   `cozinha` — só mostra pedidos e permite avançar o status, sem acesso a
   financeiro/produtos.
3. Pare e confirme com o usuário.

### FASE 4 — Base de CRM
1. Use a tabela `customers` já alimentada na Fase 1 para criar uma aba
   "Clientes" no painel: lista, histórico de pedidos por telefone, ticket
   médio, última compra.
2. (Opcional, confirme com o usuário antes) Adicionar "peça de novo" no
   site público, baseado no telefone informado no checkout anterior salvo
   localmente no navegador do cliente (não é login, é conveniência).
3. Pare e confirme com o usuário.

### FASE 5 — Performance e polimento visual (menor prioridade, confirme antes de começar)
1. Otimizar imagens (`public/*.png`) para WebP com tamanhos responsivos —
   sugerir usar o Storage do Supabase como CDN ao invés de servir do Netlify.
2. Lazy loading de imagens no cardápio.
3. Avaliar remover as 45 scripts soltos na raiz (`fix-*.cjs`, `test-*.cjs`,
   etc.) movendo para uma pasta `scripts/archive/` — só depois de confirmar
   que nenhum é usado em produção. **Não delete sem confirmar com o usuário.**
4. Remover dependências mortas do `package.json` (`@google/genai`, `canvas`,
   `sharp` — não usadas em `src/`), só depois de confirmar que não há uso
   oculto em nenhum script.
5. Avaliar migrar `Reviews.tsx` de depoimentos fictícios para reais (fora
   do escopo técnico — decisão de conteúdo do usuário).

## 6. Critério de sucesso final

Ao final das Fases 0–3, o teste que precisa passar é: **o restaurante edita
um produto, categoria, adicional, zona de entrega ou horário de
funcionamento no painel, e a mudança aparece no site público em poucos
segundos, sem precisar de deploy ou de qualquer intervenção técnica.**
