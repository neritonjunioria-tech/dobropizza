import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { ALL_MENU_ITEMS, MenuItem } from '../data/menu';

export interface Category {
  id: string;
  name: string;
  order_index: number;
  display_group?: string | null;
  display_label?: string | null;
  display_sub?: string | null;
  icon?: string | null;
}

export function useMenu() {
  const [menuItems, setMenuItems] = useState<MenuItem[]>(ALL_MENU_ITEMS);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [usingFallback, setUsingFallback] = useState(false);

  const loadData = async () => {
    try {
      const { data: cats, error: catError } = await supabase
        .from('categories')
        .select('id, name, order_index, display_group, display_label, display_sub, icon')
        .eq('is_active', true)
        .neq('id', 'system_config')
        .order('order_index');
      if (catError) throw catError;

      const { data: items, error: itemsError } = await supabase
        .from('menu_items')
        .select('*')
        .eq('is_active', true)
        .neq('category', 'system_config')
        .order('sort_order');
      if (itemsError) throw itemsError;

      if (!cats || cats.length === 0 || !items || items.length === 0) {
        throw new Error('Banco de dados retornou vazio');
      }

      const normalizeItem = (it: any): MenuItem => {
        return {
          id: it.id,
          name: it.name,
          ingredients: it.ingredients,
          category: it.category,
          priceSingle: it.price_single ?? it.priceSingle ?? it.price_g ?? it.price_m ?? 38.0,
          imageUrl: it.image_url ?? it.imageUrl ?? undefined,
          dayOfWeek: it.day_of_week ?? it.dayOfWeek ?? undefined,
          isBestseller: it.is_bestseller ?? it.isBestseller ?? false,
        };
      };

      const normalizedItems: MenuItem[] = items.map(normalizeItem);

      setMenuItems(normalizedItems);
      setCategories(cats as Category[]);
      setUsingFallback(false);
    } catch (err) {
      console.warn('[useMenu] Usando cardápio local de reserva.', err);
      setMenuItems(ALL_MENU_ITEMS);
      setCategories([]);
      setUsingFallback(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    const channelId = `public:menu-live-${Math.random().toString(36).substring(7)}`;
    const channel = supabase
      .channel(channelId)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'menu_items' }, () => loadData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'categories' }, () => loadData())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return { menuItems, categories, loading, usingFallback, refresh: loadData };
}
