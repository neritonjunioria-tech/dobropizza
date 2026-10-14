-- ==============================================================================
-- DOBRO Pizzas — Estrutura base do banco (cardápio, pedidos, clientes, caixa,
-- equipe, configurações e armazenamento de imagens).
--
-- As migrations seguintes desta pasta completam o que falta: movimentos de
-- caixa, vínculo pedido/caixa, funil de vendas, conversas do agente e motoboys.
-- Idempotente: pode ser executada mais de uma vez sem apagar dados.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. CARDÁPIO
-- ------------------------------------------------------------------------------
create table if not exists public.categories (
  id text primary key,
  name text not null,
  order_index int not null default 0,
  display_group text,
  display_label text,
  display_sub text,
  icon text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.menu_items (
  id text primary key,
  name text not null,
  ingredients text,
  category text references public.categories(id),
  price_single numeric(10,2),
  price_p numeric(10,2),
  price_m numeric(10,2),
  price_g numeric(10,2),
  price_big numeric(10,2),
  price_super_big numeric(10,2),
  image_url text,
  day_of_week int,
  is_active boolean not null default true,
  sort_order int not null default 0,
  is_bestseller boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Sem chave estrangeira: o gestor também pausa itens que ainda não estão em menu_items
create table if not exists public.paused_items (
  id text primary key,
  paused_at timestamptz not null default now()
);

create table if not exists public.extra_groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  selection_type text not null default 'multiple' check (selection_type in ('single', 'multiple')),
  min_select int not null default 0,
  max_select int,
  is_required boolean not null default false,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.extras (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.extra_groups(id) on delete cascade,
  name text not null,
  price numeric(10,2) not null default 0,
  is_active boolean not null default true,
  sort_order int not null default 0
);

create table if not exists public.category_extra_groups (
  category_id text not null references public.categories(id) on delete cascade,
  group_id uuid not null references public.extra_groups(id) on delete cascade,
  primary key (category_id, group_id)
);

-- ------------------------------------------------------------------------------
-- 2. CONFIGURAÇÕES DA LOJA
-- ------------------------------------------------------------------------------
create table if not exists public.settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.delivery_zones (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  fee numeric(10,2) not null default 0,
  is_active boolean not null default true,
  sort_order int not null default 0
);

create table if not exists public.business_hours (
  day_of_week int primary key check (day_of_week between 0 and 6), -- 0 = domingo
  opens_at time,
  closes_at time,
  is_closed boolean not null default false
);

-- ------------------------------------------------------------------------------
-- 3. EQUIPE E PERMISSÕES
-- ------------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'staff', -- owner | staff | caixa | cozinha | entregador
  full_name text,
  permissions jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create or replace function public.current_user_role()
returns text
language sql
security definer
stable
set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

-- Donos (owner) têm acesso total; os demais dependem das permissões individuais
create or replace function public.has_permission(perm text)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select coalesce(
    (select role from public.profiles where id = auth.uid()) = 'owner',
    false
  )
  or coalesce(
    (select (permissions->>perm)::boolean from public.profiles where id = auth.uid()),
    false
  );
$$;

-- ------------------------------------------------------------------------------
-- 4. CLIENTES, CAIXA, PEDIDOS E DESPESAS
-- ------------------------------------------------------------------------------
create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  phone text not null unique,
  name text,
  address text,
  notes text,
  total_orders int not null default 0,
  total_spent numeric(10,2) not null default 0,
  last_order_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.cash_sessions (
  id uuid primary key default gen_random_uuid(),
  opened_at timestamptz not null default now(),
  opened_by uuid references auth.users(id),
  opening_amount numeric(10,2) not null default 0,
  closed_at timestamptz,
  closed_by uuid references auth.users(id),
  closing_counted_amount numeric(10,2),
  expected_amount numeric(10,2),
  difference numeric(10,2),
  status text not null default 'aberto', -- aberto | fechado
  notes text
);

create table if not exists public.orders (
  id bigint generated always as identity primary key,
  customer_name text,
  customer_phone text,
  customer_id uuid references public.customers(id) on delete set null,
  order_type text,
  payment_method text,
  status text not null default 'Pendente',
  total_amount numeric(10,2) not null default 0,
  items jsonb not null default '[]'::jsonb,
  delivery_address text,
  delivery_zone text,
  change_for text,
  nif text,
  notes text,
  discount_amount numeric(10,2) not null default 0,
  additional_amount numeric(10,2) not null default 0,
  edit_reason text default '',
  is_edited boolean not null default false,
  tracking_code text unique default substr(replace(gen_random_uuid()::text, '-', ''), 1, 12),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_orders_created_at on public.orders(created_at desc);
create index if not exists idx_orders_customer_phone on public.orders(customer_phone);

create table if not exists public.expenses (
  id bigint generated always as identity primary key,
  description text not null,
  amount numeric(10,2) not null check (amount > 0),
  category text,
  payment_method text,
  created_at timestamptz not null default now()
);

-- Acompanhamento público do pedido sem expor a tabela orders
create or replace function public.get_order_by_tracking_code(p_code text)
returns table (
  id bigint,
  status text,
  order_type text,
  payment_method text,
  total_amount numeric,
  items jsonb,
  created_at timestamptz,
  customer_name text
)
language sql
security definer
stable
set search_path = public
as $$
  select o.id, o.status, o.order_type, o.payment_method,
         o.total_amount, o.items, o.created_at, o.customer_name
  from public.orders o
  where o.tracking_code = p_code;
$$;

revoke all on function public.get_order_by_tracking_code(text) from public;
grant execute on function public.get_order_by_tracking_code(text) to anon, authenticated;

-- ------------------------------------------------------------------------------
-- 5. LICENÇA DO SISTEMA (aba Cobrança)
-- ------------------------------------------------------------------------------
create table if not exists public.system_subscription (
  id uuid primary key default gen_random_uuid(),
  plan_name text,
  status text not null default 'active', -- active | past_due | blocked
  monthly_amount numeric(10,2),
  currency text,
  due_day int,
  grace_period_days int,
  current_period_due date,
  last_payment_date timestamptz,
  pix_copy_paste text,
  pix_qr_code text,
  stripe_payment_link text,
  is_manually_overridden boolean not null default false,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ==============================================================================
-- SEGURANÇA (RLS)
-- ==============================================================================
alter table public.categories enable row level security;
alter table public.menu_items enable row level security;
alter table public.paused_items enable row level security;
alter table public.extra_groups enable row level security;
alter table public.extras enable row level security;
alter table public.category_extra_groups enable row level security;
alter table public.settings enable row level security;
alter table public.delivery_zones enable row level security;
alter table public.business_hours enable row level security;
alter table public.profiles enable row level security;
alter table public.customers enable row level security;
alter table public.cash_sessions enable row level security;
alter table public.orders enable row level security;
alter table public.expenses enable row level security;
alter table public.system_subscription enable row level security;

-- Leitura pública: o cardápio digital funciona sem login -------------------------
drop policy if exists "public read categories" on public.categories;
create policy "public read categories" on public.categories for select using (true);

drop policy if exists "public read menu_items" on public.menu_items;
create policy "public read menu_items" on public.menu_items for select using (true);

drop policy if exists "public read paused_items" on public.paused_items;
create policy "public read paused_items" on public.paused_items for select using (true);

drop policy if exists "public read extra_groups" on public.extra_groups;
create policy "public read extra_groups" on public.extra_groups for select using (true);

drop policy if exists "public read extras" on public.extras;
create policy "public read extras" on public.extras for select using (true);

drop policy if exists "public read category_extra_groups" on public.category_extra_groups;
create policy "public read category_extra_groups" on public.category_extra_groups for select using (true);

drop policy if exists "public read settings" on public.settings;
create policy "public read settings" on public.settings for select using (true);

drop policy if exists "public read delivery_zones" on public.delivery_zones;
create policy "public read delivery_zones" on public.delivery_zones for select using (true);

drop policy if exists "public read business_hours" on public.business_hours;
create policy "public read business_hours" on public.business_hours for select using (true);

drop policy if exists "public read system_subscription" on public.system_subscription;
create policy "public read system_subscription" on public.system_subscription for select using (true);

-- Gestão do cardápio --------------------------------------------------------------
drop policy if exists "owner manage categories" on public.categories;
create policy "owner manage categories" on public.categories for all
  using (public.has_permission('gerenciar_categorias')) with check (public.has_permission('gerenciar_categorias'));

drop policy if exists "owner manage menu_items" on public.menu_items;
create policy "owner manage menu_items" on public.menu_items for all
  using (public.has_permission('gerenciar_produtos')) with check (public.has_permission('gerenciar_produtos'));

drop policy if exists "owner manage extra_groups" on public.extra_groups;
create policy "owner manage extra_groups" on public.extra_groups for all
  using (public.has_permission('gerenciar_produtos')) with check (public.has_permission('gerenciar_produtos'));

drop policy if exists "owner manage extras" on public.extras;
create policy "owner manage extras" on public.extras for all
  using (public.has_permission('gerenciar_produtos')) with check (public.has_permission('gerenciar_produtos'));

drop policy if exists "owner manage category_extra_groups" on public.category_extra_groups;
create policy "owner manage category_extra_groups" on public.category_extra_groups for all
  using (public.has_permission('gerenciar_produtos')) with check (public.has_permission('gerenciar_produtos'));

drop policy if exists "staff manage paused_items" on public.paused_items;
create policy "staff manage paused_items" on public.paused_items for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- Configurações -------------------------------------------------------------------
-- settings é usada por várias telas do gestor (status da loja, caixa, CRM), por isso
-- qualquer membro autenticado da equipe pode gravar.
drop policy if exists "staff manage settings" on public.settings;
create policy "staff manage settings" on public.settings for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

drop policy if exists "owner manage delivery_zones" on public.delivery_zones;
create policy "owner manage delivery_zones" on public.delivery_zones for all
  using (public.has_permission('gerenciar_configuracoes')) with check (public.has_permission('gerenciar_configuracoes'));

drop policy if exists "owner manage business_hours" on public.business_hours;
create policy "owner manage business_hours" on public.business_hours for all
  using (public.has_permission('gerenciar_configuracoes')) with check (public.has_permission('gerenciar_configuracoes'));

drop policy if exists "staff manage system_subscription" on public.system_subscription;
create policy "staff manage system_subscription" on public.system_subscription for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- Equipe --------------------------------------------------------------------------
drop policy if exists "self read own profile" on public.profiles;
create policy "self read own profile" on public.profiles for select
  using (id = auth.uid());

drop policy if exists "owner manage profiles" on public.profiles;
create policy "owner manage profiles" on public.profiles for all
  using (public.has_permission('gerenciar_usuarios')) with check (public.has_permission('gerenciar_usuarios'));

-- Pedidos: qualquer visitante cria (checkout sem login), só a equipe lista ----------
drop policy if exists "public can insert orders" on public.orders;
create policy "public can insert orders" on public.orders for insert with check (true);

-- O checkout lê de volta o pedido que acabou de criar
drop policy if exists "public can select recent orders" on public.orders;
create policy "public can select recent orders" on public.orders
  for select to anon using (created_at > now() - interval '10 minutes');

drop policy if exists "staff read all orders" on public.orders;
create policy "staff read all orders" on public.orders for select
  using (public.has_permission('ver_pedidos'));

drop policy if exists "staff update orders" on public.orders;
create policy "staff update orders" on public.orders for update
  using (public.has_permission('ver_pedidos')) with check (public.has_permission('ver_pedidos'));

drop policy if exists "staff delete orders" on public.orders;
create policy "staff delete orders" on public.orders for delete
  using (public.has_permission('ver_pedidos'));

-- Clientes, caixa e despesas --------------------------------------------------------
drop policy if exists "staff read customers" on public.customers;
create policy "staff read customers" on public.customers for all
  using (public.has_permission('ver_clientes') or public.has_permission('ver_pedidos'))
  with check (public.has_permission('ver_clientes') or public.has_permission('ver_pedidos'));

drop policy if exists "staff manage cash_sessions" on public.cash_sessions;
create policy "staff manage cash_sessions" on public.cash_sessions for all
  using (public.has_permission('gerenciar_caixa')) with check (public.has_permission('gerenciar_caixa'));

drop policy if exists "staff manage expenses" on public.expenses;
create policy "staff manage expenses" on public.expenses for all
  using (public.has_permission('gerenciar_caixa')) with check (public.has_permission('gerenciar_caixa'));

-- ==============================================================================
-- TEMPO REAL (o gestor e o cardápio escutam estas tabelas)
-- ==============================================================================
do $$
declare
  t text;
begin
  foreach t in array array['orders', 'menu_items', 'categories', 'extras', 'paused_items', 'settings']
  loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;

-- ==============================================================================
-- ARMAZENAMENTO DE IMAGENS (fotos de produtos, banners e logo)
-- ==============================================================================
insert into storage.buckets (id, name, public)
values ('cardapio-dobropizza', 'cardapio-dobropizza', true)
on conflict (id) do nothing;

drop policy if exists "public read cardapio-dobropizza" on storage.objects;
create policy "public read cardapio-dobropizza" on storage.objects for select
  using (bucket_id = 'cardapio-dobropizza');

drop policy if exists "staff write cardapio-dobropizza" on storage.objects;
create policy "staff write cardapio-dobropizza" on storage.objects for all
  using (bucket_id = 'cardapio-dobropizza' and auth.role() = 'authenticated')
  with check (bucket_id = 'cardapio-dobropizza' and auth.role() = 'authenticated');

-- ==============================================================================
-- DADOS INICIAIS
-- ==============================================================================
insert into public.settings (key, value) values
  ('company_name', '"DOBRO Pizzas"'),
  ('delivery_min_order', '10'),
  ('free_delivery_threshold', '20'),
  ('delivery_time_estimate', '"40 a 50 min"'),
  ('pickup_time_estimate', '"25 a 35 min"'),
  ('store_status', '"closed"'),
  ('manual_store_closed', 'true')
on conflict (key) do nothing;

insert into public.business_hours (day_of_week, opens_at, closes_at, is_closed) values
  (0, '18:00', '23:00', false), (1, '18:00', '23:00', false),
  (2, '18:00', '23:00', false), (3, '18:00', '23:00', false),
  (4, '18:00', '23:00', false), (5, '18:00', '23:30', false),
  (6, '18:00', '23:30', false)
on conflict (day_of_week) do nothing;
