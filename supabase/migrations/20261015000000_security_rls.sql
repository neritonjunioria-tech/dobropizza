-- Security hardening: the public (anon key) can only read the menu and place orders.
-- Everything else (orders, customers, cash, expenses, chat, motoboys, analytics reads) requires a logged-in staff user.

-- 1. Public order creation through a controlled function (also keeps the CRM customer record up to date)
create or replace function public.create_public_order(p_order jsonb)
returns table (id bigint, tracking_code text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_session uuid;
  v_id bigint;
  v_code text;
  v_phone text := nullif(trim(p_order->>'customer_phone'), '');
  v_name text := left(coalesce(p_order->>'customer_name', ''), 120);
  v_total numeric := coalesce((p_order->>'total_amount')::numeric, 0);
begin
  if jsonb_typeof(p_order->'items') is distinct from 'array' or jsonb_array_length(p_order->'items') = 0 then
    raise exception 'Pedido sem itens';
  end if;

  select s.id into v_session
  from cash_sessions s
  where s.status = 'aberto'
  order by s.opened_at desc
  limit 1;

  insert into orders (cash_session_id, customer_name, customer_phone, order_type, payment_method, status,
                      total_amount, delivery_address, delivery_zone, change_for, nif, notes, items)
  values (v_session, v_name, left(v_phone, 30), p_order->>'order_type', p_order->>'payment_method', 'Pendente',
          v_total, p_order->>'delivery_address', p_order->>'delivery_zone', p_order->>'change_for',
          nullif(p_order->>'nif', ''), p_order->>'notes', p_order->'items')
  returning orders.id, orders.tracking_code into v_id, v_code;

  if v_phone is not null then
    insert into customers (phone, name, total_orders, total_spent, last_order_at)
    values (v_phone, v_name, 1, v_total, now())
    on conflict (phone) do update
      set name = excluded.name,
          total_orders = coalesce(customers.total_orders, 0) + 1,
          total_spent = coalesce(customers.total_spent, 0) + excluded.total_spent,
          last_order_at = now();
  end if;

  return query select v_id, v_code;
end;
$$;

revoke all on function public.create_public_order(jsonb) from public;
grant execute on function public.create_public_order(jsonb) to anon, authenticated;

-- 2. Drop every policy that opened data or writes to everyone
do $$
declare
  pol record;
  sensitive text[] := array['orders','customers','cash_sessions','cash_movements','expenses','chat_conversations',
                            'chat_messages','motoboys','motoboy_settlements','analytics_events'];
begin
  for pol in
    select tablename, policyname, cmd, roles, qual, with_check
    from pg_policies
    where schemaname = 'public'
  loop
    if (pol.cmd <> 'SELECT' and (coalesce(pol.qual, 'true') = 'true' and coalesce(pol.with_check, 'true') = 'true')
        and (pol.roles && array['public','anon']::name[]))
       or (pol.tablename = any(sensitive) and pol.cmd = 'SELECT' and pol.roles && array['public','anon']::name[]
           and pol.qual not like '%has_permission%')
    then
      execute format('drop policy %I on public.%I', pol.policyname, pol.tablename);
    end if;
  end loop;
end $$;

-- 3. Logged-in staff keep full access to every table (same behaviour the admin had before),
--    except profiles, where roles/permissions stay restricted to users with gerenciar_usuarios
do $$
declare
  t text;
begin
  for t in
    select c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind = 'r' and c.relname <> 'profiles'
  loop
    execute format('drop policy if exists staff_full_access on public.%I', t);
    execute format('create policy staff_full_access on public.%I for all to authenticated using (true) with check (true)', t);
  end loop;
end $$;

-- 4. What the public menu still needs
drop policy if exists public_insert_analytics on public.analytics_events;
create policy public_insert_analytics on public.analytics_events for insert to anon with check (true);
