import { supabase } from '../lib/supabase';
import { Ingredient, ProductRecipe, CMVSummary, PurchaseUnit, UsageUnit } from '../types/recipe';

const INGREDIENTS_STORAGE_KEY = 'dobro_recipe_ingredients';
const RECIPES_STORAGE_KEY = 'dobro_product_recipes';

// Insumos iniciais padrão com custos realistas para pizzaria artesanal
export const DEFAULT_INGREDIENTS: Ingredient[] = [
  {
    id: 'ing-mussarela',
    name: 'Queijo Mussarela Especial',
    category: 'laticinios',
    purchase_unit: 'kg',
    purchase_cost: 168.00,
    purchase_quantity: 4,
    usage_unit: 'g',
    cost_per_usage_unit: 0.042, // R$ 42,00/kg -> R$ 0,042/g
    supplier: 'Laticínios Scala',
    current_stock: 24000,
    notes: 'Queijo padrão para cobertura base de pizzas'
  },
  {
    id: 'ing-calabresa',
    name: 'Linguiça Calabresa Defumada',
    category: 'carnes',
    purchase_unit: 'kg',
    purchase_cost: 68.00,
    purchase_quantity: 2.5,
    usage_unit: 'g',
    cost_per_usage_unit: 0.0272, // R$ 27,20/kg -> R$ 0,0272/g
    supplier: 'Perdigão / Sadia',
    current_stock: 15000,
    notes: 'Fatiada fininha para pré-assamento'
  },
  {
    id: 'ing-molho',
    name: 'Molho de Tomate Pelado Especial',
    category: 'molhos',
    purchase_unit: 'kg',
    purchase_cost: 38.00,
    purchase_quantity: 2.5,
    usage_unit: 'g',
    cost_per_usage_unit: 0.0152, // R$ 15,20/kg
    supplier: 'Mutti / D\'Amico',
    current_stock: 12500,
    notes: 'Temperado com azeite extravirgem e manjericão fresco'
  },
  {
    id: 'ing-catupiry',
    name: 'Requeijão Cremoso Bisnaga',
    category: 'laticinios',
    purchase_unit: 'kg',
    purchase_cost: 65.00,
    purchase_quantity: 1.5,
    usage_unit: 'g',
    cost_per_usage_unit: 0.0433,
    supplier: 'Catupiry Original',
    current_stock: 6000,
    notes: 'Para bordas recheadas e pizzas especiais'
  },
  {
    id: 'ing-frango',
    name: 'Peito de Frango Desfiado Temperado',
    category: 'carnes',
    purchase_unit: 'kg',
    purchase_cost: 48.00,
    purchase_quantity: 2.0,
    usage_unit: 'g',
    cost_per_usage_unit: 0.024,
    supplier: 'Seara',
    current_stock: 10000,
    notes: 'Cozido e desfiado artesanalmente'
  },
  {
    id: 'ing-bacon',
    name: 'Bacon em Cubos Defumado',
    category: 'carnes',
    purchase_unit: 'kg',
    purchase_cost: 38.00,
    purchase_quantity: 1.0,
    usage_unit: 'g',
    cost_per_usage_unit: 0.038,
    supplier: 'Seara Gourmet',
    current_stock: 5000,
    notes: 'Crocante para cobertura'
  },
  {
    id: 'ing-cebola',
    name: 'Cebola Fresca Fatiada',
    category: 'vegetais',
    purchase_unit: 'kg',
    purchase_cost: 18.00,
    purchase_quantity: 5.0,
    usage_unit: 'g',
    cost_per_usage_unit: 0.0036,
    supplier: 'Ceasa Distribuidora',
    current_stock: 10000,
    notes: 'Cebola roxa e branca'
  },
  {
    id: 'ing-azeitona',
    name: 'Azeitona Preta sem Caroço',
    category: 'vegetais',
    purchase_unit: 'kg',
    purchase_cost: 42.00,
    purchase_quantity: 2.0,
    usage_unit: 'g',
    cost_per_usage_unit: 0.021,
    supplier: 'Vale Fértil',
    current_stock: 4000,
    notes: 'Finalização'
  },
  {
    id: 'ing-massa-g',
    name: 'Massa Pizza Fermentação Longa G (350g)',
    category: 'massas',
    purchase_unit: 'un',
    purchase_cost: 3.20,
    purchase_quantity: 1,
    usage_unit: 'un',
    cost_per_usage_unit: 3.20,
    supplier: 'Produção Própria',
    current_stock: 60,
    notes: 'Farinha 00 italiana, 48h fermentação'
  },
  {
    id: 'ing-massa-m',
    name: 'Massa Pizza Fermentação Longa M (280g)',
    category: 'massas',
    purchase_unit: 'un',
    purchase_cost: 2.60,
    purchase_quantity: 1,
    usage_unit: 'un',
    cost_per_usage_unit: 2.60,
    supplier: 'Produção Própria',
    current_stock: 40,
    notes: 'Farinha 00 italiana'
  },
  {
    id: 'ing-massa-esfiha',
    name: 'Massa de Esfiha Aberta (55g)',
    category: 'massas',
    purchase_unit: 'un',
    purchase_cost: 0.45,
    purchase_quantity: 1,
    usage_unit: 'un',
    cost_per_usage_unit: 0.45,
    supplier: 'Produção Própria',
    current_stock: 200,
    notes: 'Com fubá artesanal na bancada'
  },
  {
    id: 'ing-caixa-g',
    name: 'Caixa de Pizza Oitavada G + Lacre Segurança',
    category: 'embalagens',
    purchase_unit: 'un',
    purchase_cost: 145.00,
    purchase_quantity: 50,
    usage_unit: 'un',
    cost_per_usage_unit: 2.90,
    supplier: 'Embalagens Brasil',
    current_stock: 150,
    notes: 'Papelão microondulado com isolamento térmico'
  },
  {
    id: 'ing-caixa-m',
    name: 'Caixa de Pizza M + Lacre',
    category: 'embalagens',
    purchase_unit: 'un',
    purchase_cost: 125.00,
    purchase_quantity: 50,
    usage_unit: 'un',
    cost_per_usage_unit: 2.50,
    supplier: 'Embalagens Brasil',
    current_stock: 100,
    notes: 'Para pizzas médias'
  }
];

// Fichas técnicas iniciais de exemplo
export const DEFAULT_RECIPES: ProductRecipe[] = [
  {
    id: 'rec-calabresa-g',
    product_id: 'calabresa',
    product_name: 'Calabresa Tradicional',
    size: 'G',
    items: [
      { ingredient_id: 'ing-massa-g', quantity: 1 },
      { ingredient_id: 'ing-molho', quantity: 90 },
      { ingredient_id: 'ing-mussarela', quantity: 220 },
      { ingredient_id: 'ing-calabresa', quantity: 170 },
      { ingredient_id: 'ing-cebola', quantity: 50 },
      { ingredient_id: 'ing-azeitona', quantity: 30 }
    ],
    packaging_cost: 2.90,
    fixed_overhead: 1.50,
    notes: 'Pizza campeã de vendas. Receita balanceada.'
  },
  {
    id: 'rec-frango-catupiry-g',
    product_id: 'frango-catupiry',
    product_name: 'Frango com Catupiry',
    size: 'G',
    items: [
      { ingredient_id: 'ing-massa-g', quantity: 1 },
      { ingredient_id: 'ing-molho', quantity: 90 },
      { ingredient_id: 'ing-mussarela', quantity: 180 },
      { ingredient_id: 'ing-frango', quantity: 200 },
      { ingredient_id: 'ing-catupiry', quantity: 120 },
      { ingredient_id: 'ing-azeitona', quantity: 30 }
    ],
    packaging_cost: 2.90,
    fixed_overhead: 1.50,
    notes: 'Excelente margem com frango temperado da casa.'
  }
];

export const recipeService = {
  // Converte preço de compra em custo unitário de uso
  calculateCostPerUsageUnit(
    purchaseCost: number,
    purchaseQuantity: number,
    purchaseUnit: PurchaseUnit,
    usageUnit: UsageUnit
  ): number {
    if (!purchaseQuantity || purchaseQuantity <= 0) return 0;
    
    // Normalização para Gramas (g)
    if (usageUnit === 'g') {
      if (purchaseUnit === 'kg') {
        const totalGrams = purchaseQuantity * 1000;
        return Number((purchaseCost / totalGrams).toFixed(5));
      }
      if (purchaseUnit === 'g') {
        return Number((purchaseCost / purchaseQuantity).toFixed(5));
      }
    }

    // Normalização para Mililitros (ml)
    if (usageUnit === 'ml') {
      if (purchaseUnit === 'l') {
        const totalMl = purchaseQuantity * 1000;
        return Number((purchaseCost / totalMl).toFixed(5));
      }
      if (purchaseUnit === 'ml') {
        return Number((purchaseCost / purchaseQuantity).toFixed(5));
      }
    }

    // Unidades diretas
    return Number((purchaseCost / purchaseQuantity).toFixed(5));
  },

  // Busca lista de insumos com persistência Supabase + Fallback
  async getIngredients(): Promise<Ingredient[]> {
    try {
      const { data, error } = await supabase
        .from('recipe_ingredients')
        .select('*')
        .order('name', { ascending: true });

      if (!error && data && data.length > 0) {
        localStorage.setItem(INGREDIENTS_STORAGE_KEY, JSON.stringify(data));
        return data as Ingredient[];
      }
    } catch (e) {
      console.warn('Tabela recipe_ingredients indisponível no Supabase, tentando settings...', e);
    }

    // Fallback: tenta buscar de settings
    try {
      const { data } = await supabase
        .from('settings')
        .select('value')
        .eq('key', 'recipe_ingredients_data')
        .maybeSingle();

      if (data?.value && Array.isArray(data.value) && data.value.length > 0) {
        localStorage.setItem(INGREDIENTS_STORAGE_KEY, JSON.stringify(data.value));
        return data.value as Ingredient[];
      }
    } catch {}

    // Fallback LocalStorage
    try {
      const local = localStorage.getItem(INGREDIENTS_STORAGE_KEY);
      if (local) {
        const parsed = JSON.parse(local);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}

    // Fallback Padrão Inicial
    localStorage.setItem(INGREDIENTS_STORAGE_KEY, JSON.stringify(DEFAULT_INGREDIENTS));
    return DEFAULT_INGREDIENTS;
  },

  // Salva ou atualiza um insumo
  async saveIngredient(ingredient: Partial<Ingredient>): Promise<Ingredient> {
    const costPerUsage = this.calculateCostPerUsageUnit(
      Number(ingredient.purchase_cost || 0),
      Number(ingredient.purchase_quantity || 1),
      ingredient.purchase_unit || 'kg',
      ingredient.usage_unit || 'g'
    );

    const fullIngredient: Ingredient = {
      id: ingredient.id || `ing-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      name: ingredient.name || 'Novo Insumo',
      category: ingredient.category || 'outros',
      purchase_unit: ingredient.purchase_unit || 'kg',
      purchase_cost: Number(ingredient.purchase_cost || 0),
      purchase_quantity: Number(ingredient.purchase_quantity || 1),
      usage_unit: ingredient.usage_unit || 'g',
      cost_per_usage_unit: costPerUsage,
      supplier: ingredient.supplier || '',
      current_stock: ingredient.current_stock !== undefined ? Number(ingredient.current_stock) : undefined,
      notes: ingredient.notes || '',
      updated_at: new Date().toISOString()
    };

    // 1. Tenta salvar na tabela específica
    let savedToTable = false;
    try {
      const { error } = await supabase
        .from('recipe_ingredients')
        .upsert(fullIngredient, { onConflict: 'id' });
      if (!error) savedToTable = true;
    } catch {}

    // 2. Atualiza estado em cache e settings
    const currentList = await this.getIngredients();
    const existingIndex = currentList.findIndex(i => i.id === fullIngredient.id);
    let updatedList: Ingredient[];

    if (existingIndex >= 0) {
      updatedList = [...currentList];
      updatedList[existingIndex] = fullIngredient;
    } else {
      updatedList = [...currentList, fullIngredient];
    }

    localStorage.setItem(INGREDIENTS_STORAGE_KEY, JSON.stringify(updatedList));

    if (!savedToTable) {
      try {
        await supabase.from('settings').upsert({
          key: 'recipe_ingredients_data',
          value: updatedList,
          updated_at: new Date().toISOString()
        }, { onConflict: 'key' });
      } catch (err) {
        console.warn('Aviso ao sincronizar insumos em settings:', err);
      }
    }

    return fullIngredient;
  },

  // Exclui um insumo
  async deleteIngredient(id: string): Promise<boolean> {
    try {
      await supabase.from('recipe_ingredients').delete().eq('id', id);
    } catch {}

    const currentList = await this.getIngredients();
    const updatedList = currentList.filter(i => i.id !== id);
    localStorage.setItem(INGREDIENTS_STORAGE_KEY, JSON.stringify(updatedList));

    try {
      await supabase.from('settings').upsert({
        key: 'recipe_ingredients_data',
        value: updatedList,
        updated_at: new Date().toISOString()
      }, { onConflict: 'key' });
    } catch {}

    return true;
  },

  // Busca fichas técnicas
  async getRecipes(): Promise<ProductRecipe[]> {
    try {
      const { data, error } = await supabase
        .from('product_recipes')
        .select('*')
        .order('product_name', { ascending: true });

      if (!error && data && data.length > 0) {
        localStorage.setItem(RECIPES_STORAGE_KEY, JSON.stringify(data));
        return data as ProductRecipe[];
      }
    } catch (e) {
      console.warn('Tabela product_recipes indisponível no Supabase, tentando settings...', e);
    }

    // Fallback Settings
    try {
      const { data } = await supabase
        .from('settings')
        .select('value')
        .eq('key', 'product_recipes_data')
        .maybeSingle();

      if (data?.value && Array.isArray(data.value) && data.value.length > 0) {
        localStorage.setItem(RECIPES_STORAGE_KEY, JSON.stringify(data.value));
        return data.value as ProductRecipe[];
      }
    } catch {}

    // Fallback LocalStorage
    try {
      const local = localStorage.getItem(RECIPES_STORAGE_KEY);
      if (local) {
        const parsed = JSON.parse(local);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}

    // Fallback Padrão Inicial
    localStorage.setItem(RECIPES_STORAGE_KEY, JSON.stringify(DEFAULT_RECIPES));
    return DEFAULT_RECIPES;
  },

  // Salva ficha técnica
  async saveRecipe(recipe: Partial<ProductRecipe>): Promise<ProductRecipe> {
    const fullRecipe: ProductRecipe = {
      id: recipe.id || `rec-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      product_id: recipe.product_id || '',
      product_name: recipe.product_name || 'Pizza',
      size: recipe.size || 'G',
      items: recipe.items || [],
      packaging_cost: Number(recipe.packaging_cost ?? 2.90),
      fixed_overhead: Number(recipe.fixed_overhead ?? 1.50),
      notes: recipe.notes || '',
      updated_at: new Date().toISOString()
    };

    let savedToTable = false;
    try {
      const { error } = await supabase
        .from('product_recipes')
        .upsert(fullRecipe, { onConflict: 'id' });
      if (!error) savedToTable = true;
    } catch {}

    const currentList = await this.getRecipes();
    const existingIndex = currentList.findIndex(r => r.id === fullRecipe.id);
    let updatedList: ProductRecipe[];

    if (existingIndex >= 0) {
      updatedList = [...currentList];
      updatedList[existingIndex] = fullRecipe;
    } else {
      updatedList = [...currentList, fullRecipe];
    }

    localStorage.setItem(RECIPES_STORAGE_KEY, JSON.stringify(updatedList));

    if (!savedToTable) {
      try {
        await supabase.from('settings').upsert({
          key: 'product_recipes_data',
          value: updatedList,
          updated_at: new Date().toISOString()
        }, { onConflict: 'key' });
      } catch (err) {
        console.warn('Aviso ao sincronizar fichas em settings:', err);
      }
    }

    return fullRecipe;
  },

  // Exclui ficha técnica
  async deleteRecipe(id: string): Promise<boolean> {
    try {
      await supabase.from('product_recipes').delete().eq('id', id);
    } catch {}

    const currentList = await this.getRecipes();
    const updatedList = currentList.filter(r => r.id !== id);
    localStorage.setItem(RECIPES_STORAGE_KEY, JSON.stringify(updatedList));

    try {
      await supabase.from('settings').upsert({
        key: 'product_recipes_data',
        value: updatedList,
        updated_at: new Date().toISOString()
      }, { onConflict: 'key' });
    } catch {}

    return true;
  },

  // Calcula custos, CMV e Margens de uma ficha técnica
  calculateRecipeSummary(
    recipe: ProductRecipe,
    ingredientsMap: Record<string, Ingredient>,
    salePrice: number
  ): CMVSummary {
    let ingredientsCost = 0;

    for (const it of recipe.items || []) {
      const ing = ingredientsMap[it.ingredient_id];
      if (ing) {
        const cost = (ing.cost_per_usage_unit || 0) * (it.quantity || 0);
        ingredientsCost += cost;
      }
    }

    const packagingCost = Number(recipe.packaging_cost || 0);
    const fixedOverhead = Number(recipe.fixed_overhead || 0);
    const totalCost = ingredientsCost + packagingCost + fixedOverhead;

    const price = Number(salePrice || 0);
    const grossMargin = price > 0 ? price - totalCost : 0;
    const cmvPercent = price > 0 ? Number(((totalCost / price) * 100).toFixed(1)) : 0;
    const marginPercent = price > 0 ? Number((100 - cmvPercent).toFixed(1)) : 0;

    let healthStatus: 'optimal' | 'warning' | 'alert' = 'optimal';
    if (cmvPercent > 38) {
      healthStatus = 'alert';
    } else if (cmvPercent >= 30) {
      healthStatus = 'warning';
    } else {
      healthStatus = 'optimal';
    }

    // Preço ideal para 30% de CMV (Custo / 0.30)
    const targetPrice30 = totalCost > 0 ? Number((totalCost / 0.30).toFixed(2)) : 0;

    return {
      recipe,
      sale_price: price,
      ingredients_cost: Number(ingredientsCost.toFixed(2)),
      packaging_cost: Number(packagingCost.toFixed(2)),
      fixed_overhead: Number(fixedOverhead.toFixed(2)),
      total_cost: Number(totalCost.toFixed(2)),
      gross_margin: Number(grossMargin.toFixed(2)),
      cmv_percent: cmvPercent,
      margin_percent: marginPercent,
      health_status: healthStatus,
      target_price_30: targetPrice30
    };
  }
};
