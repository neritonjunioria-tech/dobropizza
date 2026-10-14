import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { ExtraIngredient, pizzaExtras } from '../data/menu';

// Active extras from the admin (Produtos > Adicionais Extras). Paused extras are not returned.
// The list in the code is only used if the database cannot be reached.
export function useExtras() {
  const [extras, setExtras] = useState<ExtraIngredient[]>(pizzaExtras);

  const loadExtras = async () => {
    try {
      const { data, error } = await supabase
        .from('extras')
        .select('id, name, price, categories')
        .eq('is_active', true)
        .order('sort_order');
      if (error) throw error;
      setExtras((data || []).map((e: any) => ({
        id: e.id,
        name: e.name,
        price: Number(e.price),
        onlyFor: Array.isArray(e.categories) && e.categories.length > 0 ? e.categories : undefined,
      })));
    } catch (err) {
      console.warn('[useExtras] Não foi possível carregar adicionais do Supabase, usando lista padrão.', err);
      setExtras(pizzaExtras);
    }
  };

  useEffect(() => {
    loadExtras();
    const channelId = `public:extras-live-${Math.random().toString(36).substring(2, 9)}`;
    const channel = supabase
      .channel(channelId)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'extras' }, () => loadExtras())
      .subscribe();
    return () => {
      try {
        supabase.removeChannel(channel);
      } catch (e) {
        // ignore cleanup error
      }
    };
  }, []);

  return extras;
}
