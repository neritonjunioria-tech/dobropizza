# CRM & Cardápio Digital - Quick Reference

## Comandos Rápidos

### Validação
```bash
node .opencode/skills/crm-cardapio-digital/scripts/validate-menu.cjs
```

### Sincronização de Imagens
```bash
# Requer SUPABASE_SERVICE_ROLE_KEY no .env.local
node .opencode/skills/crm-cardapio-digital/scripts/sync-images.cjs
```

## Arquitetura de Pastas (Mental Model)

```
src/
├── components/          # UI Components
│   ├── MenuItemCard.tsx     # Card unificado (promo/regular/bestseller)
│   ├── PizzaModal.tsx       # Configuração pizza (tamanhos, bordas, extras)
│   ├── Cart.tsx             # Carrinho lateral + mobile bottom sheet
│   └── Admin/               # Componentes só do painel
│       ├── MenuManager.tsx
│       ├── CategoryManager.tsx
│       ├── CustomersManager.tsx
│       ├── CaixaManager.tsx
│       └── ...
├── pages/
│   ├── AdminDashboard.tsx   # Painel completo (2700+ linhas)
│   └── OrderTracking.tsx
├── hooks/
│   ├── useMenu.ts           # Single source of truth cardápio
│   ├── useBusinessHours.ts  # Status abertura/fechamento
│   └── useExtras.ts         # Extras/bordas
├── utils/
│   ├── imageResolver.ts     # findImageForProduct() + fallbacks
│   ├── date.ts              # getLisbonDate() timezone PT
│   └── sound.ts             # Notification sounds
├── lib/
│   └── supabase.ts          # Client + helpers
└── adminDesignTokens.ts     # Design system admin (cores, espaçamento)
```

## Patterns Críticos

### 1. Cardápio = useMenu()
```tsx
// SEMPRE
const { menuItems, categories, loading } = useMenu();

// NUNCA
import { ALL_MENU_ITEMS } from '../data/menu';
```

### 2. Imagens com Fallback
```tsx
// Em MenuItemCard - tenta .png → .jpg → .jpeg → .webp
const exts = ['.png', '.jpg', '.jpeg', '.webp'];
// findImageForProduct(item) busca por ID + name normalizado
```

### 3. Permissões (Admin)
```tsx
const isOwner = userRole === 'owner';
const hasPermission = (key) => isOwner || !!userPermissions[key];

// Uso nas abas:
{hasPermission('gerenciar_produtos') && <MenuManager />}
```

### 4. Moeda & Formatação
```tsx
// Sempre
R$ {(price || 0).toFixed(2)}
// CSS
font-mono tabular-nums text-[#1C1917]
```

### 5. Realtime (Paused Items)
```tsx
// App.tsx - setup uma vez
supabase.channel('public:paused_items')
  .on('postgres_changes', { event: '*', schema: 'public', table: 'paused_items' }, fetchPausedItems)
  .subscribe();
```

## Debug Checklist

| Sintoma | Verificar |
|---------|-----------|
| Cardápio vazio | `useMenu()` loading? RLS policy `menu_items`? |
| Imagem não carrega | `findImageForProduct()` → extensões? Storage bucket público? |
| Pedido não aparece | Realtime `orders` ativo? RLS `SELECT` para role? |
| Trend KPI = +0% | `dashboardData.revenueChangePercent` populado? |
| Impressão corta | `@page { size: 80mm auto }` + `--kiosk-printing`? |
| Categoria não mostra | `display_group` + `order_index` preenchidos? |

## Supabase - Tabelas Chave

```sql
-- Pedidos
orders (id, customer_name, customer_phone, order_type, payment_method, 
        status, total_amount, items jsonb, delivery_address, 
        delivery_zone, change_for, nif, is_edited, created_at)

-- Cardápio
menu_items (id, name, category, ingredients, price_single, price_p, 
            price_m, price_g, image_url, is_bestseller, is_active,
            day_of_week, display_order, created_at)

-- Categorias
categories (id, name, display_label, display_group, display_sub, 
            order_index, is_active)

-- Pausados (realtime)
paused_items (id, paused_at)

-- Caixa
cash_sessions (id, user_id, opened_at, closed_at, opening_amount,
               closing_amount, expected_amount, status)

-- Clientes
customers (id, name, phone, email, total_orders, total_spent,
           last_order_at, favorite_items jsonb)

-- Usuários/Permissões
profiles (id, role, permissions jsonb, restaurant_id)
```

## Variáveis de Ambiente Necessárias

```env
# .env.local
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...  # Só para scripts admin
```

## Atalhos de Desenvolvimento

```bash
# Type check
npx tsc --noEmit

# Dev server
npm run dev

# Build produção
npm run build

# Preview build
npm run preview
```