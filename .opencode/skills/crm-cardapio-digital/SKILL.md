# Skill: CRM & Cardápio Digital Specialist

## Descrição
Skill especializada para desenvolvimento de sistemas de CRM, cardápios digitais, delivery e gestão de restaurantes/pizzarias. Usada no projeto DOBRO Pizzas (pizzaria artesanal, São José dos Pinhais — PR, Brasil).

## Contexto do Projeto
- **Stack**: React 19 + TypeScript + Vite + TailwindCSS v4 + Supabase (PostgreSQL + Auth + Realtime + Storage)
- **Arquitetura**: Single-page app com painel admin + cardápio público
- **Domínio**: Gestão de pedidos, cardápio, clientes, caixa, relatórios, usuários/permissões

---

## Áreas de Especialização

### 1. Cardápio Digital (Frontend Público)
- **Componentes**: MenuItemCard, PizzaModal, Cart, Category tabs, Search, PromoModal, PizzaDayModal
- **Features**: Busca em tempo real, carrinho lateral (desktop) / bottom sheet (mobile), modal de configuração de pizza (tamanhos, bordas, extras), zoom de imagem
- **Estados**: Loading de imagens com fallback automático (extensões .png/.jpg/.webp), paused items via Supabase Realtime
- **Performance**: Memoização com useMemo, lazy loading de imagens, virtualização para listas grandes

### 2. Painel Administrativo (Admin Dashboard)
- **Abas**: Visão Geral, Pedidos, Caixa, Relatórios, Clientes, Cardápio Digital, Gestão Cardápio, Categorias, Configurações, Banner Promocional, Usuários
- **KPIs**: Faturamento, Ticket Médio, Total Pedidos, Novos Clientes com sparklines e trend real (período anterior)
- **Charts**: Recharts (BarChart horizontal/vertical, AreaChart) com tooltips customizados
- **Gestão de Pedidos**: Tabela com inline editing, status workflow (Pendente → Em Preparo → Saiu para Entrega → Finalizado/Cancelado), impressão térmica 80mm (--kiosk-printing)

### 3. Backend & Supabase
- **Tabelas principais**: orders, menu_items, categories, customers, cash_sessions, paused_items, profiles, settings, banners, order_extras
- **RLS Policies**: Por role (owner, manager, atendente, caixa) + permissions granulares
- **Realtime**: paused_items, orders (novos pedidos), cash_sessions
- **Storage**: Bucket para imagens de produtos (auto-resize via Sharp/Edge Functions)
- **Edge Functions**: Upload de imagens, relatórios PDF, webhook WhatsApp

### 4. CRM & Clientes
- **CustomersManager**: Histórico de pedidos, ticket médio, frequência, última visita, segmentação RFM
- **WhatsApp Integration**: Link direto `wa.me/55XXXXXXXXXXX` com mensagem pré-formatada
- **Fidelidade**: Contagem de pedidos, valor total, produtos favoritos

### 5. Gestão Financeira (Caixa)
- **Sessões**: Abertura/fechamento com conferência (dinheiro, cartão, PIX, MBWay)
- **Sangrias/Suprimentos**: Registro com motivo
- **Relatórios**: Fechamento diário, semanal, mensal, export CSV

---

## Padrões de Código do Projeto

### Naming Conventions
```typescript
// Componentes: PascalCase + sufixo descritivo
MenuItemCard.tsx, PizzaModal.tsx, CaixaManager.tsx

// Hooks: use + domínio
useMenu.ts, useBusinessHours.ts, useExtras.ts

// Utils: verbo + substantivo
imageResolver.ts, date.ts, sound.ts

// Types: interfaces + types
types.ts (MenuItem, CartItem, Order, Category, UserProfile)
```

### Estado & Data Fetching
```typescript
// useMenu: single source of truth para cardápio
const { menuItems, categories, loading, usingFallback } = useMenu();

// Admin: fetchDashboardData com cache de 15s + realtime
const fetchDashboardData = async (isBackground = false) => { ... }
```

### Estilização (Tailwind v4 + Design Tokens)
```typescript
// adminDesignTokens.ts - fonte única de verdade
ADMIN_COLORS = { bg: '#FAFAF9', brand: '#083D07', accentGold: '#D4AF6A', ... }
ADMIN_STYLES = { card: 'bg-white rounded-xl border border-[#E7E5E1] ...', ... }
```

---

## Comandos Úteis (para scripts/)

### `sync-menu-images.cjs`
Sincroniza imagens locais → Supabase Storage + atualiza menu_items.imageUrl

### `update-menu.cjs`
Importa cardápio de CSV/JSON → Supabase (upsert menu_items + categories)

### `generate-sql.cjs`
Gera migrações SQL a partir de alterações no schema TypeScript

### `backup-db.cjs`
Exporta todas as tabelas para JSON/CSV (backup manual)

---

## Regras de Ouro

1. **Sempre use `useMenu()`** para acessar cardápio - nunca importe `ALL_MENU_ITEMS` diretamente
2. **Paused items** = source of truth via `paused_items` table + Realtime, nunca localStorage
3. **Imagens**: `findImageForProduct(item)` tenta múltiplas extensões + fallback automático
4. **Moeda**: Sempre `toFixed(2)` + `R$` prefix, usar `font-mono tabular-nums` para alinhamento
5. **Datas**: `getLisbonDate()` (nome herdado do projeto anterior; a DOBRO fica no Brasil, fuso America/Sao_Paulo)
6. **Permissões**: `hasPermission('perm_key')` - owner tem tudo, demais via `profiles.permissions` JSONB
7. **Impressão**: CSS `@media print` com `.no-print` / `.print-only` classes

---

## Workflows Comuns

### Adicionar Nova Categoria no Cardápio
1. `CategoryManager` → Nova categoria → Define `display_group`, `display_label`, `order_index`
2. `MenuManager` → Produtos → Associa `category_id`
3. `useMenu()` refaz fetch automático (realtime ou 15s)

### Criar Relatório Customizado
1. Nova aba no AdminDashboard → `activeTab === 'meu-relatorio'`
2. Query em `allOrders` (já carregado) ou nova query Supabase
3. KpiCard + ReportCard + Recharts para visualização
4. Botão "Exportar CSV" reutiliza `handleExportCSV`

### Deploy de Imagens Novas
```bash
# 1. Coloca imagens em public/ (nome = ID do produto)
# 2. Roda script que faz upload para Supabase Storage
# 3. Atualiza menu_items.imageUrl com URL pública
```

---

## Troubleshooting Rápido

| Problema | Solução |
|----------|---------|
| Imagem não carrega | Verifica `findImageForProduct()` - tenta .png, .jpg, .jpeg, .webp |
| Pedido não aparece no admin | Confirma RLS policy + realtime subscription em `orders` |
| Categoria não mostra no cardápio | `display_group` vazio ou `order_index` duplicado |
| Trend KPI mostra +0% | `dashboardData.revenueChangePercent` undefined - aguarda fetchDashboardData |
| Impressão térmica corta | CSS `@page { size: 80mm auto }` + `--kiosk-printing` no Chrome |

---

## Extensões Futuras (Roadmap)

- [ ] **WhatsApp Business API**: Receber pedidos via WhatsApp → cria order automaticamente
- [ ] **PIX QR Code**: Gera QR dinâmico no checkout + webhook confirmação
- [ ] **App Mobile (React Native)**: Compartilha `useMenu` + `supabase` via monorepo
- [ ] **IA para Cardápio**: Sugere combos, detecta itens sem foto, otimiza preços
- [ ] **Multi-loja**: `restaurant_id` em todas as tabelas + seletor no header admin