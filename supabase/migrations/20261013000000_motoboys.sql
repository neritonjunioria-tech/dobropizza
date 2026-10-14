-- ==============================================================================
-- Controle de Motoboys: cadastro, vínculo de entregas e fechamentos
-- Execute este script no SQL Editor do Supabase.
-- É seguro rodar mais de uma vez (usa "if not exists" em tudo).
-- ==============================================================================

-- 1. Motoboys próprios da casa
create table if not exists public.motoboys (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text,
  default_fee numeric(10,2) not null default 0, -- valor pago por entrega
  is_active boolean not null default true,
  notes text,
  created_at timestamptz not null default now()
);

-- 2. Fechamentos (acertos) de motoboy próprio
create table if not exists public.motoboy_settlements (
  id uuid primary key default gen_random_uuid(),
  motoboy_id uuid not null references public.motoboys(id) on delete restrict,
  period_start timestamptz,
  period_end timestamptz,
  deliveries_count int not null default 0,
  deliveries_total numeric(10,2) not null default 0,
  extra_amount numeric(10,2) not null default 0,    -- diária / bônus
  discount_amount numeric(10,2) not null default 0, -- vales / descontos
  total_paid numeric(10,2) not null default 0,
  cash_collected numeric(10,2) not null default 0,  -- numerário cobrado nas entregas
  notes text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

-- 3. Vínculo da entrega no pedido
--    delivery_provider: 'proprio' (motoboy da casa) | 'uber' | 'ifood'
alter table public.orders add column if not exists delivery_provider text
  check (delivery_provider in ('proprio', 'uber', 'ifood'));
alter table public.orders add column if not exists motoboy_id uuid
  references public.motoboys(id) on delete restrict;
alter table public.orders add column if not exists delivery_cost numeric(10,2);
-- Apagar um fechamento reabre as entregas dele (set null)
alter table public.orders add column if not exists motoboy_settlement_id uuid
  references public.motoboy_settlements(id) on delete set null;

create index if not exists idx_orders_motoboy_id on public.orders(motoboy_id);
create index if not exists idx_orders_motoboy_settlement_id on public.orders(motoboy_settlement_id);
create index if not exists idx_motoboy_settlements_motoboy_id on public.motoboy_settlements(motoboy_id);

-- 4. RLS: apenas a equipe autenticada no gestor
alter table public.motoboys enable row level security;
alter table public.motoboy_settlements enable row level security;

drop policy if exists "staff manage motoboys" on public.motoboys;
create policy "staff manage motoboys" on public.motoboys for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

drop policy if exists "staff manage motoboy_settlements" on public.motoboy_settlements;
create policy "staff manage motoboy_settlements" on public.motoboy_settlements for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
