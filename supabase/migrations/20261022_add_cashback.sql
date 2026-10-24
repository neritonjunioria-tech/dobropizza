-- ==============================================================================
-- DOBRO PIZZAS — MIGRAÇÃO DE CASHBACK & PROGRAMA DE FIDELIDADE
-- Execute este script no SQL Editor do Supabase se desejar criar as tabelas
-- ==============================================================================

-- 1. Coluna de saldo de cashback no CRM de clientes
alter table public.customers 
add column if not exists cashback_balance numeric(10,2) not null default 0.00;

-- 2. Colunas de cashback nos pedidos
alter table public.orders 
add column if not exists cashback_used numeric(10,2) default 0.00,
add column if not exists cashback_earned numeric(10,2) default 0.00;

-- 3. Tabela de histórico / extrato de transações de cashback
create table if not exists public.cashback_transactions (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references public.customers(id) on delete set null,
  customer_phone text not null,
  order_id uuid references public.orders(id) on delete set null,
  type text not null check (type in ('credit', 'debit', 'manual_adjustment', 'expired')),
  amount numeric(10,2) not null,
  balance_after numeric(10,2) not null,
  description text,
  created_at timestamptz not null default now()
);

-- Habilitar RLS e permissões de leitura/escrita
alter table public.cashback_transactions enable row level security;

drop policy if exists "Public read cashback_transactions" on public.cashback_transactions;
create policy "Public read cashback_transactions" on public.cashback_transactions for select using (true);

drop policy if exists "Public insert cashback_transactions" on public.cashback_transactions;
create policy "Public insert cashback_transactions" on public.cashback_transactions for insert with check (true);

-- Configurações padrão de cashback
insert into public.settings (key, value, updated_at)
values 
  ('cashback_enabled', 'true', now()),
  ('cashback_percent', '5.0', now()),
  ('cashback_min_order_value', '30.00', now()),
  ('cashback_max_discount_percent', '50.0', now()),
  ('cashback_expiry_days', '60', now())
on conflict (key) do nothing;
