-- Extras managed from the admin: where each extra is offered + the current list moved from the code.

-- Categories where the extra is offered (menu category ids). NULL or empty = every product that accepts extras.
alter table public.extras add column if not exists categories text[];

-- Single group that holds the menu extras
insert into public.extra_groups (name, selection_type, min_select, is_required, sort_order)
select 'Adicionais Extras', 'multiple', 0, false, 0
where not exists (select 1 from public.extra_groups where name = 'Adicionais Extras');

-- Current extras (all R$ 7,00; Tomatinhos Confit only on sandubas), only if the table is still empty
insert into public.extras (group_id, name, price, is_active, sort_order, categories)
select g.id, v.name, 7.00, true, v.ord, v.cats
from public.extra_groups g
cross join (values
  ('Extra Queijo Mozzarella', 1, null::text[]),
  ('Extra Calabresa Defumada', 2, null::text[]),
  ('Extra Cream Cheese', 3, null::text[]),
  ('Fio de Hot Honey (Mel Picante)', 4, null::text[]),
  ('Tomatinhos Confit', 5, array['sandubas']),
  ('Cebola Roxa Fininha', 6, null::text[])
) as v(name, ord, cats)
where g.name = 'Adicionais Extras'
  and not exists (select 1 from public.extras);
