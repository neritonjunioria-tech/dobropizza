-- ==============================================================================
-- DOBRO PIZZAS — ESTRUTURA DO BANCO DE DADOS (SUPABASE)
-- Execute este script completo no SQL Editor do seu Dashboard Supabase.
-- É 100% seguro rodar mais de uma vez (utiliza "IF NOT EXISTS").
-- ==============================================================================

-- 1. EXTENSÕES
create extension if not exists "pgcrypto";

-- 2. TABELA DE CATEGORIAS
create table if not exists public.categories (
  id text primary key,
  name text not null,
  order_index int not null default 0,
  display_group text,
  display_label text,
  display_sub text,
  icon text,
  is_active boolean not null default true
);

-- 3. TABELA DE PRODUTOS DO CARDÁPIO (MENU_ITEMS)
create table if not exists public.menu_items (
  id text primary key,
  name text not null,
  ingredients text,
  category text not null,
  price_single numeric(10,2),
  price_p numeric(10,2),
  price_m numeric(10,2),
  price_g numeric(10,2),
  price_big numeric(10,2),
  price_super_big numeric(10,2),
  image_url text,
  is_bestseller boolean not null default false,
  sort_order int not null default 0,
  is_active boolean not null default true,
  day_of_week int,
  created_at timestamptz not null default now()
);

-- 4. ITENS PAUSADOS / ESGOTADOS
create table if not exists public.paused_items (
  id text primary key,
  paused_at timestamptz not null default now()
);

-- 5. SESSÕES DE CAIXA (TURNOS DE TRABALHO)
create table if not exists public.cash_sessions (
  id uuid primary key default gen_random_uuid(),
  status text not null default 'aberto' check (status in ('aberto', 'fechado')),
  opened_at timestamptz not null default now(),
  closed_at timestamptz,
  opening_amount numeric(10,2) not null default 0,
  closing_amount numeric(10,2),
  expected_amount numeric(10,2),
  difference numeric(10,2),
  summary jsonb default '{}'::jsonb,
  notes text,
  opened_by uuid references auth.users(id),
  closed_by uuid references auth.users(id)
);

-- 6. MOVIMENTAÇÕES DE CAIXA (SANGRIA E SUPRIMENTO)
create table if not exists public.cash_movements (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references public.cash_sessions(id) on delete cascade,
  type text not null check (type in ('sangria', 'suprimento')),
  amount numeric(10,2) not null,
  reason text,
  created_at timestamptz not null default now()
);

-- 7. TABELA DE CLIENTES (CRM)
create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  phone text unique not null,
  name text,
  delivery_address text,
  delivery_zone text,
  total_orders int not null default 0,
  total_spent numeric(10,2) not null default 0,
  last_order_at timestamptz,
  notes text,
  created_at timestamptz not null default now()
);

-- 8. TABELA DE MOTOBOYS (ENTREGADORES)
create table if not exists public.motoboys (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text,
  default_fee numeric(10,2) not null default 0,
  is_active boolean not null default true,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.motoboy_settlements (
  id uuid primary key default gen_random_uuid(),
  motoboy_id uuid not null references public.motoboys(id) on delete restrict,
  period_start timestamptz,
  period_end timestamptz,
  deliveries_count int not null default 0,
  deliveries_total numeric(10,2) not null default 0,
  extra_amount numeric(10,2) not null default 0,
  discount_amount numeric(10,2) not null default 0,
  total_paid numeric(10,2) not null default 0,
  cash_collected numeric(10,2) not null default 0,
  notes text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

-- 9. TABELA DE PEDIDOS (ORDERS)
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  cash_session_id uuid references public.cash_sessions(id) on delete set null,
  customer_name text,
  customer_phone text,
  order_type text not null check (order_type in ('Delivery', 'Takeaway', 'Mesa', 'Balcao')),
  payment_method text not null,
  status text not null default 'Pendente',
  total_amount numeric(10,2) not null default 0,
  delivery_address text,
  delivery_zone text,
  delivery_fee numeric(10,2) default 0,
  change_for text,
  nif text,
  notes text,
  items jsonb not null default '[]'::jsonb,
  delivery_provider text check (delivery_provider in ('proprio', 'uber', 'ifood')),
  motoboy_id uuid references public.motoboys(id) on delete restrict,
  delivery_cost numeric(10,2),
  motoboy_settlement_id uuid references public.motoboy_settlements(id) on delete set null,
  created_at timestamptz not null default now()
);

-- 10. TABELA DE DESPESAS (EXPENSES)
create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  description text not null,
  amount numeric(10,2) not null,
  category text not null,
  payment_method text,
  created_at timestamptz not null default now()
);

-- 11. TABELA DE ANALYTICS / EVENTOS
create table if not exists public.analytics_events (
  id uuid primary key default gen_random_uuid(),
  event_name text not null,
  properties jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- 12. CONFIGURAÇÕES DO RESTAURANTE (SYSTEM_CONFIG)
create table if not exists public.system_config (
  id text primary key default 'main',
  is_open boolean not null default true,
  whatsapp_phone text default '351938360931',
  business_hours jsonb,
  updated_at timestamptz not null default now()
);

-- 13. POLÍTICAS DE ACESSO (ROW LEVEL SECURITY - RLS)
alter table public.categories enable row level security;
alter table public.menu_items enable row level security;
alter table public.paused_items enable row level security;
alter table public.cash_sessions enable row level security;
alter table public.cash_movements enable row level security;
alter table public.customers enable row level security;
alter table public.motoboys enable row level security;
alter table public.motoboy_settlements enable row level security;
alter table public.orders enable row level security;
alter table public.expenses enable row level security;
alter table public.analytics_events enable row level security;
alter table public.system_config enable row level security;

-- Políticas de leitura pública (qualquer cliente navegando no cardápio pode ler produtos e status)
drop policy if exists "Public read categories" on public.categories;
create policy "Public read categories" on public.categories for select using (true);

drop policy if exists "Public read menu_items" on public.menu_items;
create policy "Public read menu_items" on public.menu_items for select using (true);

drop policy if exists "Public read paused_items" on public.paused_items;
create policy "Public read paused_items" on public.paused_items for select using (true);

drop policy if exists "Public read system_config" on public.system_config;
create policy "Public read system_config" on public.system_config for select using (true);

-- Políticas para envio de pedidos pelo cliente (checkout do cardápio)
drop policy if exists "Public insert orders" on public.orders;
create policy "Public insert orders" on public.orders for insert with check (true);

drop policy if exists "Public read own orders" on public.orders;
create policy "Public read own orders" on public.orders for select using (true);

drop policy if exists "Public insert analytics" on public.analytics_events;
create policy "Public insert analytics" on public.analytics_events for insert with check (true);

drop policy if exists "Public customer manage" on public.customers;
create policy "Public customer manage" on public.customers for all using (true) with check (true);

-- Políticas para equipe / PDV / Gestor
drop policy if exists "Allow all operations for staff" on public.cash_sessions;
create policy "Allow all operations for staff" on public.cash_sessions for all using (true) with check (true);

drop policy if exists "Allow all operations for staff movements" on public.cash_movements;
create policy "Allow all operations for staff movements" on public.cash_movements for all using (true) with check (true);

drop policy if exists "Allow all operations for staff expenses" on public.expenses;
create policy "Allow all operations for staff expenses" on public.expenses for all using (true) with check (true);

drop policy if exists "Allow all operations for staff motoboys" on public.motoboys;
create policy "Allow all operations for staff motoboys" on public.motoboys for all using (true) with check (true);

drop policy if exists "Allow all operations for staff settlements" on public.motoboy_settlements;
create policy "Allow all operations for staff settlements" on public.motoboy_settlements for all using (true) with check (true);

drop policy if exists "Staff manage menu" on public.menu_items;
create policy "Staff manage menu" on public.menu_items for all using (true) with check (true);

drop policy if exists "Staff manage categories" on public.categories;
create policy "Staff manage categories" on public.categories for all using (true) with check (true);

drop policy if exists "Staff manage paused_items" on public.paused_items;
create policy "Staff manage paused_items" on public.paused_items for all using (true) with check (true);

drop policy if exists "Staff update orders" on public.orders;
create policy "Staff update orders" on public.orders for update using (true);

-- 14. CARGA INICIAL: CATEGORIAS OFICIAIS DA DOBRO PIZZAS
insert into public.categories (id, name, order_index, display_label, display_sub) values
  ('mais-pedidos', 'Mais Pedidos', 1, 'MAIS PEDIDOS 🔥', 'Os queridinhos da Dobro'),
  ('especiais', 'Especiais Dobro', 2, 'ESPECIAIS DOBRO ⭐', 'Criações autorais exclusivas'),
  ('tradicionais', 'Tradicionais', 3, 'TRADICIONAIS 🍕', 'Clássicas bem executadas'),
  ('gourmet', 'Gourmet', 4, 'GOURMET 👨‍🍳', 'Ingredientes nobres selecionados'),
  ('vegetarianas', 'Vegetarianas', 5, 'VEGETARIANAS 🥗', 'Leves, frescas e sem carne'),
  ('doces', 'Doces Nobres', 6, 'DOCES NOBRES 🍫', 'Sobremesas artesanais no forno'),
  ('sandubas', 'Sandubas', 7, 'SANDUBAS 🥪', 'Sanduíches artesanais na massa da casa'),
  ('bebidas', 'Bebidas', 8, 'BEBIDAS 🥤', 'Refrigerantes e águas')
on conflict (id) do nothing;

-- 15. CARGA INICIAL: AS 7 PIZZAS AUTORAIS DA DOBRO PIZZAS + BEBIDAS
insert into public.menu_items (id, name, ingredients, category, price_p, price_m, price_g, image_url, is_bestseller, sort_order) values
  ('p-dobro-hothoney', 'Calabresa Hot Honey', 'Massa artesanal de fermentação lenta, molho pomodoro rústico, mozzarella especial, rodelas tostadas de calabresa defumada nobre e finalização com infusão exclusiva de mel picante da casa (Hot Honey).', 'especiais', 15.90, 18.90, 22.90, '/dobro/calabresa-hot-honey.jpeg', true, 1),
  ('p-dobro-peramel', 'Pera & Mel', 'Base aveludada de queijo gorgonzola e mozzarella selecionada, lâminas frescas de pera, nozes crocantes e fio generoso de mel puro de flor de laranjeira.', 'gourmet', 16.90, 19.90, 23.90, '/dobro/pera-mel.jpeg', true, 2),
  ('p-dobro-blumenau', 'Linguiça Blumenau Artesanal', 'Autêntica linguiça Blumenau defumada artesanalmente e assada no forno, molho pomodoro fresco, queijo mozzarella derretido, cebola roxa finamente fatiada e alecrim fresco.', 'especiais', 15.90, 18.90, 22.90, '/dobro/blumenau.jpeg', true, 3),
  ('p-dobro-zucchini', 'Zucchini Al Forno', 'Massa de fermentação natural, lâminas delicadas de abobrinha italiana marinadas no azeite extravirgem, mozzarella cremosa, lascas de parmesão e raspas perfumadas de limão siciliano.', 'vegetarianas', 14.90, 17.90, 21.90, '/dobro/zucchini.jpeg', true, 4),
  ('p-dobro-calabresacream', 'Calabresa com Cream Cheese', 'Molho de tomate caseiro, mozzarella especial em ponto de ouro, calabresa defumada artesanal e generosas gotas de cream cheese cremoso gratinadas no forno.', 'tradicionais', 14.90, 16.90, 20.90, '/dobro/calabresa-cream-cheese.jpeg', true, 5),
  ('p-dobro-classica', 'Clássica Dobro', 'A clássica margherita elevada: molho rústico de tomates pelados, mozzarella farta, tomatinhos cereja doces confitados e folhas frescas de manjericão aromático.', 'tradicionais', 13.90, 15.90, 19.90, '/dobro/classica.jpeg', true, 6),
  ('p-dobro-avelamorango', 'Avelã, Morango & Amor', 'Massa doce artesanal crocante, camada farta do mais puro creme nobre de cacau e avelãs, fatias frescas de morangos suculentos selecionados e lascas tostadas de amêndoas.', 'doces', 15.90, 17.90, 21.90, '/dobro/avela-morango-amor.jpeg', true, 7)
on conflict (id) do nothing;

insert into public.menu_items (id, name, ingredients, category, price_single, image_url, sort_order) values
  ('b-1', 'Coca-Cola 350ml (Lata)', 'Refrigerante Coca-Cola original lata 350ml gelada.', 'bebidas', 6.00, '/cocacolalata.png', 8),
  ('b-2', 'Coca-Cola Zero 350ml (Lata)', 'Refrigerante Coca-Cola zero açúcar lata 350ml gelada.', 'bebidas', 6.00, '/cocazerolata.png', 9),
  ('b-3', 'Água Mineral com Gás', 'Água mineral gaseificada fresca.', 'bebidas', 4.50, '/agua.png', 10),
  ('b-4', 'Água Mineral sem Gás', 'Água mineral natural fresca.', 'bebidas', 4.00, '/agua.png', 11)
on conflict (id) do nothing;

-- 16. CONFIGURAÇÃO PADRÃO
insert into public.system_config (id, is_open, whatsapp_phone) values
  ('main', true, '351938360931')
on conflict (id) do nothing;
