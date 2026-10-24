import React, { useState, useEffect, useMemo } from 'react';
import { 
  Plus, Edit2, Trash2, Search, X, Check, AlertTriangle, 
  TrendingUp, DollarSign, Package, Pizza, Layers, 
  HelpCircle, Sparkles, Filter, ChevronDown, RefreshCw,
  ArrowUpRight, AlertCircle, Scale, ChefHat, Eye
} from 'lucide-react';
import { 
  Ingredient, ProductRecipe, CMVSummary, 
  IngredientCategory, PurchaseUnit, UsageUnit, ProductSize 
} from '../types/recipe';
import { recipeService } from '../services/recipeService';
import { MenuItem } from '../data/menu';

interface RecipeManagerProps {
  menuItems: MenuItem[];
}

export default function RecipeManager({ menuItems }: RecipeManagerProps) {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'recipes' | 'ingredients'>('dashboard');
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [recipes, setRecipes] = useState<ProductRecipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('todos');

  // Estado para Edição/Criação de Insumo
  const [editingIngredient, setEditingIngredient] = useState<Partial<Ingredient> | null>(null);
  const [isIngredientModalOpen, setIsIngredientModalOpen] = useState(false);

  // Estado para Edição/Criação de Ficha Técnica
  const [editingRecipe, setEditingRecipe] = useState<Partial<ProductRecipe> | null>(null);
  const [isRecipeModalOpen, setIsRecipeModalOpen] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [selectedSize, setSelectedSize] = useState<ProductSize>('G');
  const [recipeItems, setRecipeItems] = useState<{ ingredient_id: string; quantity: number }[]>([]);
  const [packagingCost, setPackagingCost] = useState<number>(2.90);
  const [fixedOverhead, setFixedOverhead] = useState<number>(1.50);
  const [recipeNotes, setRecipeNotes] = useState<string>('');

  // Carrega dados iniciais
  const loadData = async () => {
    setLoading(true);
    try {
      const [ings, recs] = await Promise.all([
        recipeService.getIngredients(),
        recipeService.getRecipes()
      ]);
      setIngredients(ings);
      setRecipes(recs);
    } catch (e) {
      console.error('Erro ao carregar dados de fichas técnicas:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Mapa de insumos por ID para cálculos ultra-rápidos
  const ingredientsMap = useMemo(() => {
    const map: Record<string, Ingredient> = {};
    ingredients.forEach(i => { map[i.id] = i; });
    return map;
  }, [ingredients]);

  // Mapa de preço do produto por ID e Tamanho
  const getProductPrice = (productId: string, size: ProductSize): number => {
    const item = menuItems.find(m => m.id === productId);
    if (!item) return 0;

    if (size === 'P' || (size as string) === 'Broto') return Number(item.priceP || item.priceSingle || 0);
    if (size === 'M') return Number(item.priceM || item.priceSingle || 0);
    if (size === 'G') return Number(item.priceG || item.priceSingle || 0);
    if (size === 'Big') return Number(item.priceBig || item.priceSingle || 0);
    return Number(item.priceSingle || item.priceG || item.priceM || 0);
  };

  // Cálculo de sumários de CMV para todas as receitas cadastradas
  const cmvSummaries = useMemo(() => {
    return recipes.map(r => {
      const price = getProductPrice(r.product_id, r.size);
      return recipeService.calculateRecipeSummary(r, ingredientsMap, price);
    });
  }, [recipes, ingredientsMap, menuItems]);

  // Estatísticas gerais para os cards do topo
  const stats = useMemo(() => {
    const count = cmvSummaries.length;
    if (count === 0) {
      return { avgCMV: 0, avgMargin: 0, criticalCount: 0, optimalCount: 0 };
    }
    const totalCMV = cmvSummaries.reduce((sum, s) => sum + s.cmv_percent, 0);
    const totalMargin = cmvSummaries.reduce((sum, s) => sum + s.gross_margin, 0);
    const critical = cmvSummaries.filter(s => s.cmv_percent > 38).length;
    const optimal = cmvSummaries.filter(s => s.cmv_percent < 30).length;

    return {
      avgCMV: Number((totalCMV / count).toFixed(1)),
      avgMargin: Number((totalMargin / count).toFixed(2)),
      criticalCount: critical,
      optimalCount: optimal
    };
  }, [cmvSummaries]);

  // Iniciar nova Ficha Técnica
  const handleOpenNewRecipe = (presetProduct?: MenuItem) => {
    const prod = presetProduct || menuItems[0];
    const prodId = prod ? prod.id : '';
    const prodName = prod ? prod.name : '';

    setSelectedProductId(prodId);
    setSelectedSize('G');
    setRecipeItems([
      { ingredient_id: 'ing-massa-g', quantity: 1 },
      { ingredient_id: 'ing-molho', quantity: 90 },
      { ingredient_id: 'ing-mussarela', quantity: 200 }
    ]);
    setPackagingCost(2.90);
    setFixedOverhead(1.50);
    setRecipeNotes('');
    setEditingRecipe(null);
    setIsRecipeModalOpen(true);
  };

  // Editar Ficha Técnica Existente
  const handleEditRecipe = (recipe: ProductRecipe) => {
    setSelectedProductId(recipe.product_id);
    setSelectedSize(recipe.size);
    setRecipeItems(recipe.items || []);
    setPackagingCost(recipe.packaging_cost ?? 2.90);
    setFixedOverhead(recipe.fixed_overhead ?? 1.50);
    setRecipeNotes(recipe.notes || '');
    setEditingRecipe(recipe);
    setIsRecipeModalOpen(true);
  };

  // Salvar Ficha Técnica
  const handleSaveRecipe = async (e: React.FormEvent) => {
    e.preventDefault();
    const prod = menuItems.find(m => m.id === selectedProductId);
    const prodName = prod ? prod.name : 'Pizza';

    const newRecipe: Partial<ProductRecipe> = {
      id: editingRecipe?.id,
      product_id: selectedProductId,
      product_name: prodName,
      size: selectedSize,
      items: recipeItems,
      packaging_cost: Number(packagingCost || 0),
      fixed_overhead: Number(fixedOverhead || 0),
      notes: recipeNotes
    };

    await recipeService.saveRecipe(newRecipe);
    await loadData();
    setIsRecipeModalOpen(false);
  };

  // Excluir Ficha Técnica
  const handleDeleteRecipe = async (id: string, name: string) => {
    if (!window.confirm(`Tem certeza de que deseja excluir a ficha técnica de "${name}"?`)) return;
    await recipeService.deleteRecipe(id);
    await loadData();
  };

  // Salvar Insumo
  const handleSaveIngredient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingIngredient?.name) return;

    await recipeService.saveIngredient(editingIngredient);
    await loadData();
    setIsIngredientModalOpen(false);
    setEditingIngredient(null);
  };

  // Excluir Insumo
  const handleDeleteIngredient = async (id: string, name: string) => {
    if (!window.confirm(`Tem certeza de que deseja excluir o insumo "${name}"?`)) return;
    await recipeService.deleteIngredient(id);
    await loadData();
  };

  // Itens da receita sendo montada em tempo real no simulador
  const currentPreviewSummary = useMemo(() => {
    const dummyRecipe: ProductRecipe = {
      id: 'preview',
      product_id: selectedProductId,
      product_name: menuItems.find(m => m.id === selectedProductId)?.name || '',
      size: selectedSize,
      items: recipeItems,
      packaging_cost: Number(packagingCost || 0),
      fixed_overhead: Number(fixedOverhead || 0)
    };
    const price = getProductPrice(selectedProductId, selectedSize);
    return recipeService.calculateRecipeSummary(dummyRecipe, ingredientsMap, price);
  }, [selectedProductId, selectedSize, recipeItems, packagingCost, fixedOverhead, ingredientsMap, menuItems]);

  return (
    <div className="space-y-4 pb-14 font-sans text-stone-900 animate-in fade-in duration-150">
      
      {/* ─────────────────────────────────────────────────────────────
          1. HEADER PRINCIPAL COM TÍTULO E BOTÕES DE AÇÃO
      ─────────────────────────────────────────────────────────────── */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-stone-200/90 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-[#083d07] text-[#d5af7a] shadow-2xs">
              <Layers size={18} />
            </span>
            <h1 className="text-lg sm:text-xl font-bold tracking-tight text-stone-900">
              Fichas Técnicas & Gestão de CMV
            </h1>
          </div>
          <p className="text-xs text-stone-500 mt-1 max-w-2xl leading-relaxed">
            Controle milimétrico do Custo de Mercadoria Vendida (CMV), custos de ingredientes, embalagens e margem real de lucro por pizza.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => {
              setEditingIngredient({
                name: '',
                category: 'laticinios',
                purchase_unit: 'kg',
                purchase_cost: 0,
                purchase_quantity: 1,
                usage_unit: 'g'
              });
              setIsIngredientModalOpen(true);
            }}
            className="h-8.5 px-3 bg-white hover:bg-stone-50 border border-stone-200 text-stone-700 font-bold text-xs rounded-xl flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer"
          >
            <Plus size={13} className="text-[#083d07]" />
            <span>Novo Insumo</span>
          </button>

          <button
            onClick={() => handleOpenNewRecipe()}
            className="h-8.5 px-3.5 bg-[#083d07] hover:bg-[#0b520a] text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer border border-[#d5af7a]/40"
          >
            <ChefHat size={14} className="text-[#d5af7a]" />
            <span>Nova Ficha Técnica</span>
          </button>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          2. NAVEGAÇÃO DE ABAS
      ─────────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-1 border-b border-stone-200 bg-white p-1 rounded-xl shadow-2xs">
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`flex-1 sm:flex-none h-8 px-4 rounded-lg font-bold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTab === 'dashboard'
              ? 'bg-[#083d07] text-white shadow-2xs'
              : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
          }`}
        >
          <TrendingUp size={13} />
          <span>Dashboard CMV & Lucro</span>
        </button>

        <button
          onClick={() => setActiveTab('recipes')}
          className={`flex-1 sm:flex-none h-8 px-4 rounded-lg font-bold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTab === 'recipes'
              ? 'bg-[#083d07] text-white shadow-2xs'
              : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
          }`}
        >
          <Pizza size={13} />
          <span>Fichas Técnicas ({recipes.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('ingredients')}
          className={`flex-1 sm:flex-none h-8 px-4 rounded-lg font-bold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTab === 'ingredients'
              ? 'bg-[#083d07] text-white shadow-2xs'
              : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
          }`}
        >
          <Package size={13} />
          <span>Insumos & Matérias-Primas ({ingredients.length})</span>
        </button>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          3. ABA 1: DASHBOARD CMV & LUCRATIVIDADE
      ─────────────────────────────────────────────────────────────── */}
      {activeTab === 'dashboard' && (
        <div className="space-y-4">
          
          {/* 4 Cards de Métricas */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
            <div className="bg-white p-3.5 rounded-xl border border-stone-200/90 shadow-2xs">
              <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block">
                CMV Médio Geral
              </span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className={`text-xl sm:text-2xl font-black font-mono tabular-nums ${
                  stats.avgCMV <= 30 ? 'text-emerald-700' : stats.avgCMV <= 38 ? 'text-amber-700' : 'text-rose-700'
                }`}>
                  {stats.avgCMV}%
                </span>
                <span className="text-[10px] font-sans font-semibold text-stone-500">
                  {stats.avgCMV <= 30 ? '🟢 Ótimo' : stats.avgCMV <= 38 ? '🟡 Padrão' : '🔴 Atenção'}
                </span>
              </div>
              <span className="text-[10px] text-stone-400 mt-0.5 block">Ideal para pizzaria: 25% a 32%</span>
            </div>

            <div className="bg-white p-3.5 rounded-xl border border-stone-200/90 shadow-2xs">
              <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block">
                Margem Bruta Média
              </span>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-xl sm:text-2xl font-black font-mono text-emerald-700 tabular-nums">
                  R$ {stats.avgMargin.toFixed(2)}
                </span>
                <span className="text-xs text-stone-500 font-mono">/ un</span>
              </div>
              <span className="text-[10px] text-stone-400 mt-0.5 block">Lucro bruto por pizza vendida</span>
            </div>

            <div className="bg-white p-3.5 rounded-xl border border-stone-200/90 shadow-2xs">
              <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block">
                Fichas Ativas
              </span>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-xl sm:text-2xl font-black font-mono text-stone-900 tabular-nums">
                  {recipes.length}
                </span>
                <span className="text-xs text-stone-400 font-sans">receitas mapeadas</span>
              </div>
              <span className="text-[10px] text-stone-400 mt-0.5 block">{stats.optimalCount} dentro da meta de 30%</span>
            </div>

            <div className="bg-white p-3.5 rounded-xl border border-stone-200/90 shadow-2xs">
              <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider block">
                Alertas de Custo Alto
              </span>
              <div className="flex items-baseline gap-1 mt-1">
                <span className={`text-xl sm:text-2xl font-black font-mono tabular-nums ${
                  stats.criticalCount > 0 ? 'text-rose-600' : 'text-emerald-700'
                }`}>
                  {stats.criticalCount}
                </span>
                <span className="text-xs text-stone-500 font-sans">acima de 38% CMV</span>
              </div>
              <span className="text-[10px] text-stone-400 mt-0.5 block">Requer ajuste de preço ou porção</span>
            </div>
          </div>

          {/* Tabela Executiva de Fichas e Rentabilidade */}
          <div className="bg-white rounded-2xl border border-stone-200 shadow-2xs overflow-hidden">
            <div className="p-3 sm:px-4 border-b border-stone-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-stone-50/70">
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-xs uppercase font-mono tracking-wider text-stone-700">
                  Matriz de Rentabilidade & Preço Sugerido
                </h3>
              </div>
              <div className="text-[11px] text-stone-500 font-mono">
                Cálculo em tempo real baseado no cardápio ativo
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-stone-50 text-stone-600 font-mono uppercase text-[10px] tracking-wider border-b border-stone-200">
                    <th className="py-2.5 px-3.5 font-bold">Produto / Sabor</th>
                    <th className="py-2.5 px-3 font-bold text-center">Tamanho</th>
                    <th className="py-2.5 px-3 font-bold text-right">Preço Venda</th>
                    <th className="py-2.5 px-3 font-bold text-right">Insumos</th>
                    <th className="py-2.5 px-3 font-bold text-right">Emb. + Fixo</th>
                    <th className="py-2.5 px-3 font-bold text-right">CMV Total</th>
                    <th className="py-2.5 px-3 font-bold text-right">Margem Bruta</th>
                    <th className="py-2.5 px-3 font-bold text-center">% CMV</th>
                    <th className="py-2.5 px-3 font-bold text-right">Preço Ideal (30%)</th>
                    <th className="py-2.5 px-3 font-bold text-center">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 font-sans">
                  {cmvSummaries.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="py-12 text-center text-stone-400">
                        Nenhuma ficha técnica cadastrada ainda.
                      </td>
                    </tr>
                  ) : (
                    cmvSummaries.map((s) => (
                      <tr key={s.recipe.id} className="hover:bg-amber-50/20 transition-colors">
                        <td className="py-2.5 px-3.5">
                          <span className="font-bold text-stone-900 block truncate max-w-[200px]">
                            {s.recipe.product_name}
                          </span>
                          <span className="text-[10px] text-stone-400 font-mono">
                            {s.recipe.items.length} ingredientes
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <span className="px-2 py-0.5 rounded font-mono font-bold text-[11px] bg-stone-100 text-stone-800 border border-stone-200">
                            {s.recipe.size}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-stone-900">
                          R$ {s.sale_price.toFixed(2)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-stone-600">
                          R$ {s.ingredients_cost.toFixed(2)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-stone-500">
                          R$ {(s.packaging_cost + s.fixed_overhead).toFixed(2)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-stone-900">
                          R$ {s.total_cost.toFixed(2)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-700">
                          R$ {s.gross_margin.toFixed(2)}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <span className={`inline-flex items-center gap-1 text-[11px] font-mono font-bold px-2 py-0.5 rounded-full border ${
                            s.health_status === 'optimal'
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                              : s.health_status === 'warning'
                              ? 'bg-amber-50 text-amber-900 border-amber-300'
                              : 'bg-rose-50 text-rose-800 border-rose-300'
                          }`}>
                            {s.cmv_percent}%
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-[#083d07]">
                          R$ {s.target_price_30.toFixed(2)}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <button
                            onClick={() => handleEditRecipe(s.recipe)}
                            className="p-1 text-stone-500 hover:text-[#083d07] rounded hover:bg-stone-100 transition-colors cursor-pointer"
                            title="Editar Ficha Técnica"
                          >
                            <Edit2 size={13} />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          4. ABA 2: FICHAS TÉCNICAS (CARDS & GERENCIAMENTO)
      ─────────────────────────────────────────────────────────────── */}
      {activeTab === 'recipes' && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {recipes.map((r) => {
            const price = getProductPrice(r.product_id, r.size);
            const summary = recipeService.calculateRecipeSummary(r, ingredientsMap, price);

            return (
              <div 
                key={r.id} 
                className="bg-white rounded-2xl border border-stone-200/90 shadow-2xs hover:shadow-md transition-all p-4 space-y-3 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 border-b border-stone-100 pb-2.5">
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-bold text-sm text-stone-900">{r.product_name}</span>
                        <span className="px-1.5 py-0.2 rounded font-mono font-bold text-[10px] bg-stone-100 text-stone-800 border border-stone-200">
                          {r.size}
                        </span>
                      </div>
                      <span className="text-[10px] text-stone-400 block mt-0.5">
                        {r.items.length} ingredientes na receita
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="text-[9.5px] uppercase font-bold text-stone-400 block">Venda</span>
                      <span className="text-sm font-black font-mono text-stone-900">R$ {price.toFixed(2)}</span>
                    </div>
                  </div>

                  {/* 3 Métricas Rápidas */}
                  <div className="grid grid-cols-3 gap-1.5 py-2 text-center font-mono">
                    <div className="bg-stone-50 p-1.5 rounded-lg border border-stone-100">
                      <span className="text-[9px] uppercase font-bold text-stone-400 block font-sans">CMV (R$)</span>
                      <span className="text-xs font-bold text-stone-800">R$ {summary.total_cost.toFixed(2)}</span>
                    </div>
                    <div className="bg-stone-50 p-1.5 rounded-lg border border-stone-100">
                      <span className="text-[9px] uppercase font-bold text-stone-400 block font-sans">Margem</span>
                      <span className="text-xs font-bold text-emerald-700">R$ {summary.gross_margin.toFixed(2)}</span>
                    </div>
                    <div className="bg-stone-50 p-1.5 rounded-lg border border-stone-100">
                      <span className="text-[9px] uppercase font-bold text-stone-400 block font-sans">% CMV</span>
                      <span className={`text-xs font-bold ${
                        summary.health_status === 'optimal' ? 'text-emerald-700' : summary.health_status === 'warning' ? 'text-amber-700' : 'text-rose-700'
                      }`}>
                        {summary.cmv_percent}%
                      </span>
                    </div>
                  </div>

                  {/* Lista de Insumos da Ficha */}
                  <div className="space-y-1 pt-1">
                    <span className="text-[9.5px] font-bold text-stone-400 uppercase tracking-wider block">
                      Composição da Pizza:
                    </span>
                    <div className="space-y-1 max-h-36 overflow-y-auto pr-1">
                      {r.items.map((it, idx) => {
                        const ing = ingredientsMap[it.ingredient_id];
                        if (!ing) return null;
                        const sub = (ing.cost_per_usage_unit || 0) * it.quantity;
                        return (
                          <div key={idx} className="flex items-center justify-between text-xs py-0.5 border-b border-stone-50">
                            <span className="text-stone-700 truncate pr-2">{ing.name}</span>
                            <span className="font-mono text-stone-500 whitespace-nowrap">
                              {it.quantity}{ing.usage_unit} <strong className="text-stone-900 font-bold ml-1">R$ {sub.toFixed(2)}</strong>
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Botões de Ação */}
                <div className="flex items-center justify-between pt-2.5 border-t border-stone-100">
                  <button
                    onClick={() => handleDeleteRecipe(r.id, `${r.product_name} (${r.size})`)}
                    className="p-1.5 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                    title="Excluir ficha"
                  >
                    <Trash2 size={13} />
                  </button>

                  <button
                    onClick={() => handleEditRecipe(r)}
                    className="h-7 px-3 bg-stone-100 hover:bg-stone-200 text-stone-800 font-bold text-xs rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Edit2 size={11} />
                    <span>Editar Ficha</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          5. ABA 3: INSUMOS & MATÉRIAS-PRIMAS
      ─────────────────────────────────────────────────────────────── */}
      {activeTab === 'ingredients' && (
        <div className="space-y-3">
          {/* Barra de Filtros e Busca de Insumos */}
          <div className="bg-white p-3 rounded-2xl border border-stone-200 shadow-2xs flex flex-col sm:flex-row justify-between items-center gap-2">
            <div className="relative flex-1 w-full max-w-md">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-stone-400" />
              <input
                type="text"
                placeholder="Buscar insumo por nome, categoria ou fornecedor..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full h-8 pl-8 pr-3 bg-stone-50 focus:bg-white border border-stone-200 focus:border-[#083d07] rounded-lg text-xs font-sans text-stone-900 focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-1 overflow-x-auto w-full sm:w-auto">
              {['todos', 'laticinios', 'carnes', 'massas', 'molhos', 'vegetais', 'embalagens'].map((cat) => (
                <button
                  key={cat}
                  onClick={() => setCategoryFilter(cat)}
                  className={`h-7 px-2.5 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-colors cursor-pointer whitespace-nowrap ${
                    categoryFilter === cat
                      ? 'bg-[#083d07] text-white'
                      : 'bg-stone-100 hover:bg-stone-200 text-stone-600'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Tabela de Insumos */}
          <div className="bg-white rounded-2xl border border-stone-200 shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-stone-50 text-stone-600 font-mono uppercase text-[10px] tracking-wider border-b border-stone-200">
                    <th className="py-2.5 px-3.5 font-bold">Insumo / Matéria-Prima</th>
                    <th className="py-2.5 px-3 font-bold">Categoria</th>
                    <th className="py-2.5 px-3 font-bold text-right">Compra (Embalagem)</th>
                    <th className="py-2.5 px-3 font-bold text-right">Custo por Unidade de Uso</th>
                    <th className="py-2.5 px-3 font-bold">Fornecedor</th>
                    <th className="py-2.5 px-3 font-bold text-center">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 font-sans">
                  {ingredients
                    .filter(i => {
                      if (categoryFilter !== 'todos' && i.category !== categoryFilter) return false;
                      if (search && !i.name.toLowerCase().includes(search.toLowerCase()) && !i.supplier?.toLowerCase().includes(search.toLowerCase())) return false;
                      return true;
                    })
                    .map((ing) => (
                      <tr key={ing.id} className="hover:bg-amber-50/20 transition-colors">
                        <td className="py-2.5 px-3.5">
                          <span className="font-bold text-stone-900 block">{ing.name}</span>
                          {ing.notes && <span className="text-[10px] text-stone-400 block">{ing.notes}</span>}
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="px-2 py-0.5 rounded text-[10px] uppercase font-bold font-mono bg-stone-100 text-stone-700 border border-stone-200">
                            {ing.category}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-stone-700">
                          R$ {ing.purchase_cost.toFixed(2)} por {ing.purchase_quantity} {ing.purchase_unit}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-800">
                          R$ {ing.cost_per_usage_unit.toFixed(4)} / {ing.usage_unit}
                          {ing.usage_unit === 'g' && (
                            <span className="text-[10px] text-stone-400 block font-normal">
                              (R$ {(ing.cost_per_usage_unit * 1000).toFixed(2)}/kg)
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-stone-600">
                          {ing.supplier || '-'}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => {
                                setEditingIngredient(ing);
                                setIsIngredientModalOpen(true);
                              }}
                              className="p-1 text-stone-500 hover:text-[#083d07] rounded hover:bg-stone-100 transition-colors cursor-pointer"
                              title="Editar"
                            >
                              <Edit2 size={13} />
                            </button>
                            <button
                              onClick={() => handleDeleteIngredient(ing.id, ing.name)}
                              className="p-1 text-stone-400 hover:text-rose-600 rounded hover:bg-rose-50 transition-colors cursor-pointer"
                              title="Excluir"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          MODAL: CADASTRO / EDIÇÃO DE INSUMO
      ─────────────────────────────────────────────────────────────── */}
      {isIngredientModalOpen && editingIngredient && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-stone-950/60 backdrop-blur-xs animate-in fade-in"
          onClick={() => setIsIngredientModalOpen(false)}
        >
          <div 
            className="bg-white rounded-2xl w-full max-w-lg p-5 shadow-2xl border border-stone-200 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <h3 className="font-bold text-base text-stone-900">
                {editingIngredient.id ? 'Editar Insumo' : 'Novo Insumo'}
              </h3>
              <button 
                onClick={() => setIsIngredientModalOpen(false)}
                className="p-1 text-stone-400 hover:text-stone-700 rounded-lg cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveIngredient} className="space-y-3 text-xs">
              <div>
                <label className="block text-[10px] font-bold text-stone-600 uppercase mb-1">Nome do Insumo</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Queijo Mussarela Scala"
                  value={editingIngredient.name || ''}
                  onChange={(e) => setEditingIngredient({ ...editingIngredient, name: e.target.value })}
                  className="w-full h-8 px-2.5 bg-stone-50 border border-stone-200 rounded-lg focus:bg-white focus:border-[#083d07] focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-bold text-stone-600 uppercase mb-1">Categoria</label>
                  <select
                    value={editingIngredient.category || 'laticinios'}
                    onChange={(e) => setEditingIngredient({ ...editingIngredient, category: e.target.value as any })}
                    className="w-full h-8 px-2 bg-stone-50 border border-stone-200 rounded-lg font-medium"
                  >
                    <option value="laticinios">Laticínios & Queijos</option>
                    <option value="carnes">Carnes & Frios</option>
                    <option value="massas">Massas & Farinhas</option>
                    <option value="molhos">Molhos & Tomates</option>
                    <option value="vegetais">Vegetais & Hortifrúti</option>
                    <option value="temperos">Temperos & Azeites</option>
                    <option value="embalagens">Embalagens & Caixas</option>
                    <option value="outros">Outros</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-stone-600 uppercase mb-1">Fornecedor (Opcional)</label>
                  <input
                    type="text"
                    placeholder="Ex: Laticínios Scala"
                    value={editingIngredient.supplier || ''}
                    onChange={(e) => setEditingIngredient({ ...editingIngredient, supplier: e.target.value })}
                    className="w-full h-8 px-2.5 bg-stone-50 border border-stone-200 rounded-lg focus:outline-none"
                  />
                </div>
              </div>

              {/* Bloco de Conversão de Preço */}
              <div className="p-3 bg-amber-50/50 rounded-xl border border-amber-200/80 space-y-2">
                <span className="text-[10px] font-bold text-amber-900 uppercase tracking-wider block">
                  Embalagem de Compra & Conversão
                </span>
                
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-[9.5px] font-semibold text-stone-600 uppercase mb-0.5">Preço Pago (R$)</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      min="0.01"
                      value={editingIngredient.purchase_cost ?? ''}
                      onChange={(e) => setEditingIngredient({ ...editingIngredient, purchase_cost: parseFloat(e.target.value) || 0 })}
                      className="w-full h-8 px-2 bg-white border border-stone-200 rounded text-stone-900 font-mono font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[9.5px] font-semibold text-stone-600 uppercase mb-0.5">Qtd Compra</label>
                    <input
                      type="number"
                      step="0.001"
                      required
                      min="0.001"
                      value={editingIngredient.purchase_quantity ?? ''}
                      onChange={(e) => setEditingIngredient({ ...editingIngredient, purchase_quantity: parseFloat(e.target.value) || 1 })}
                      className="w-full h-8 px-2 bg-white border border-stone-200 rounded text-stone-900 font-mono font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[9.5px] font-semibold text-stone-600 uppercase mb-0.5">Unidade</label>
                    <select
                      value={editingIngredient.purchase_unit || 'kg'}
                      onChange={(e) => {
                        const pu = e.target.value as PurchaseUnit;
                        const uu = (pu === 'kg' || pu === 'g') ? 'g' : (pu === 'l' || pu === 'ml') ? 'ml' : 'un';
                        setEditingIngredient({ ...editingIngredient, purchase_unit: pu, usage_unit: uu });
                      }}
                      className="w-full h-8 px-1 bg-white border border-stone-200 rounded font-semibold text-xs"
                    >
                      <option value="kg">Quilo (kg)</option>
                      <option value="g">Grama (g)</option>
                      <option value="l">Litro (l)</option>
                      <option value="ml">Mililitro (ml)</option>
                      <option value="un">Unidade (un)</option>
                    </select>
                  </div>
                </div>

                {/* Resultado da Conversão ao Vivo */}
                <div className="flex items-center justify-between text-xs pt-1.5 border-t border-amber-200/60 font-mono">
                  <span className="text-stone-600">Custo de uso calculado:</span>
                  <span className="font-bold text-[#083d07]">
                    R$ {recipeService.calculateCostPerUsageUnit(
                      Number(editingIngredient.purchase_cost || 0),
                      Number(editingIngredient.purchase_quantity || 1),
                      editingIngredient.purchase_unit || 'kg',
                      editingIngredient.usage_unit || 'g'
                    ).toFixed(4)} por {editingIngredient.usage_unit || 'g'}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-stone-600 uppercase mb-1">Observações Internas</label>
                <textarea
                  rows={2}
                  placeholder="Ex: Marca preferencial, rendimento médio..."
                  value={editingIngredient.notes || ''}
                  onChange={(e) => setEditingIngredient({ ...editingIngredient, notes: e.target.value })}
                  className="w-full p-2 bg-stone-50 border border-stone-200 rounded-lg resize-none text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsIngredientModalOpen(false)}
                  className="h-8 px-3 text-stone-600 hover:text-stone-900 font-bold text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="h-8 px-4 bg-[#083d07] hover:bg-[#0b520a] text-white font-bold text-xs rounded-xl shadow-2xs cursor-pointer"
                >
                  Salvar Insumo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          MODAL / EDITOR DE FICHA TÉCNICA
      ─────────────────────────────────────────────────────────────── */}
      {isRecipeModalOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-stone-950/60 backdrop-blur-xs animate-in fade-in"
          onClick={() => setIsRecipeModalOpen(false)}
        >
          <div 
            className="bg-white rounded-2xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl border border-stone-200 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header Modal */}
            <div className="p-4 border-b border-stone-200 flex items-center justify-between bg-stone-50">
              <div className="flex items-center gap-2">
                <ChefHat size={18} className="text-[#083d07]" />
                <h3 className="font-bold text-base text-stone-900">
                  {editingRecipe?.id ? 'Editar Ficha Técnica' : 'Montar Ficha Técnica'}
                </h3>
              </div>
              <button 
                onClick={() => setIsRecipeModalOpen(false)}
                className="p-1 text-stone-400 hover:text-stone-700 rounded-lg cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-5">
              
              {/* Coluna Esquerda: Configuração e Insumos da Receita */}
              <div className="lg:col-span-7 space-y-4">
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[10px] font-bold text-stone-600 uppercase mb-1">Produto do Cardápio</label>
                    <select
                      value={selectedProductId}
                      onChange={(e) => setSelectedProductId(e.target.value)}
                      className="w-full h-8.5 px-2 bg-stone-50 border border-stone-200 rounded-lg text-xs font-bold text-stone-900 focus:outline-none"
                    >
                      {menuItems.map(m => (
                        <option key={m.id} value={m.id}>{m.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-stone-600 uppercase mb-1">Tamanho / Porção</label>
                    <select
                      value={selectedSize}
                      onChange={(e) => setSelectedSize(e.target.value as any)}
                      className="w-full h-8.5 px-2 bg-stone-50 border border-stone-200 rounded-lg text-xs font-bold text-stone-900 focus:outline-none"
                    >
                      <option value="G">Grande (G)</option>
                      <option value="M">Média (M)</option>
                      <option value="Big">Big (Família)</option>
                      <option value="P">Broto (P)</option>
                      <option value="Unidade">Unidade / Sobremesa / Bebida</option>
                    </select>
                  </div>
                </div>

                {/* Lista de Insumos da Receita */}
                <div className="bg-stone-50 p-3 rounded-xl border border-stone-200/90 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10.5px] font-bold text-stone-700 uppercase tracking-wider">
                      Ingredientes da Pizza
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        const firstIng = ingredients[0]?.id || 'ing-mussarela';
                        setRecipeItems([...recipeItems, { ingredient_id: firstIng, quantity: 50 }]);
                      }}
                      className="px-2 py-1 bg-white hover:bg-stone-100 border border-stone-200 text-stone-800 font-bold text-[11px] rounded-md shadow-2xs flex items-center gap-1 cursor-pointer"
                    >
                      <Plus size={11} /> Adicionar Insumo
                    </button>
                  </div>

                  <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
                    {recipeItems.map((item, idx) => {
                      const ing = ingredientsMap[item.ingredient_id];
                      const cost = ing ? (ing.cost_per_usage_unit || 0) * (item.quantity || 0) : 0;

                      return (
                        <div key={idx} className="flex items-center gap-2 p-1.5 bg-white rounded-lg border border-stone-200 text-xs">
                          <select
                            value={item.ingredient_id}
                            onChange={(e) => {
                              const updated = [...recipeItems];
                              updated[idx].ingredient_id = e.target.value;
                              setRecipeItems(updated);
                            }}
                            className="flex-1 h-7 px-1.5 bg-stone-50 border border-stone-200 rounded text-xs text-stone-800 font-medium"
                          >
                            {ingredients.map(i => (
                              <option key={i.id} value={i.id}>{i.name} ({i.usage_unit})</option>
                            ))}
                          </select>

                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              step="1"
                              min="1"
                              value={item.quantity}
                              onChange={(e) => {
                                const updated = [...recipeItems];
                                updated[idx].quantity = parseFloat(e.target.value) || 0;
                                setRecipeItems(updated);
                              }}
                              className="w-16 h-7 px-1.5 text-center bg-stone-50 border border-stone-200 rounded font-mono font-bold text-xs"
                            />
                            <span className="text-[10px] text-stone-400 font-mono w-5">
                              {ing?.usage_unit || 'g'}
                            </span>
                          </div>

                          <span className="font-mono font-bold text-stone-900 text-xs w-16 text-right">
                            R$ {cost.toFixed(2)}
                          </span>

                          <button
                            type="button"
                            onClick={() => {
                              setRecipeItems(recipeItems.filter((_, i) => i !== idx));
                            }}
                            className="p-1 text-stone-400 hover:text-rose-600 rounded cursor-pointer"
                            title="Remover insumo"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Custos Complementares: Embalagem e Operacional */}
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[10px] font-bold text-stone-600 uppercase mb-0.5">Custo Embalagem (R$)</label>
                    <input
                      type="number"
                      step="0.05"
                      min="0"
                      value={packagingCost}
                      onChange={(e) => setPackagingCost(parseFloat(e.target.value) || 0)}
                      className="w-full h-8 px-2 bg-stone-50 border border-stone-200 rounded-lg text-xs font-mono font-bold text-stone-900"
                    />
                    <span className="text-[9.5px] text-stone-400">Caixa, lacre, plástico térmico</span>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-stone-600 uppercase mb-0.5">Custo Fixo / Forno (R$)</label>
                    <input
                      type="number"
                      step="0.05"
                      min="0"
                      value={fixedOverhead}
                      onChange={(e) => setFixedOverhead(parseFloat(e.target.value) || 0)}
                      className="w-full h-8 px-2 bg-stone-50 border border-stone-200 rounded-lg text-xs font-mono font-bold text-stone-900"
                    />
                    <span className="text-[9.5px] text-stone-400">Gás, lenha e energia estimada</span>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-stone-600 uppercase mb-0.5">Modo de Montagem / Instruções</label>
                  <textarea
                    rows={2}
                    placeholder="Instruções para o pizzaiolo (ex: fornear a 350°C, azeite antes de entrar...)"
                    value={recipeNotes}
                    onChange={(e) => setRecipeNotes(e.target.value)}
                    className="w-full p-2 bg-stone-50 border border-stone-200 rounded-lg text-xs resize-none"
                  />
                </div>
              </div>

              {/* Coluna Direita: Simulador de CMV & Rentabilidade em Tempo Real */}
              <div className="lg:col-span-5 bg-gradient-to-b from-stone-50 to-white p-4 rounded-2xl border border-stone-200 space-y-3 flex flex-col justify-between">
                <div>
                  <span className="text-[10px] font-bold text-[#083d07] uppercase tracking-wider block font-mono">
                    Simulador de Rentabilidade ao Vivo
                  </span>

                  <div className="mt-2 p-3 bg-white rounded-xl border border-stone-200 shadow-2xs space-y-2">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-stone-500 font-sans">Preço no Cardápio:</span>
                      <span className="font-bold font-mono text-base text-stone-900">
                        R$ {currentPreviewSummary.sale_price.toFixed(2)}
                      </span>
                    </div>

                    <div className="space-y-1 text-xs border-t border-stone-100 pt-2 font-mono">
                      <div className="flex justify-between text-stone-600">
                        <span>Custo Insumos:</span>
                        <span>R$ {currentPreviewSummary.ingredients_cost.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-stone-600">
                        <span>Embalagem + Fixo:</span>
                        <span>R$ {(currentPreviewSummary.packaging_cost + currentPreviewSummary.fixed_overhead).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-stone-900 font-bold border-t border-dashed border-stone-200 pt-1">
                        <span>CMV Total (R$):</span>
                        <span>R$ {currentPreviewSummary.total_cost.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-emerald-700 font-bold">
                        <span>Margem Bruta (R$):</span>
                        <span>R$ {currentPreviewSummary.gross_margin.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Indicador Visual de Saúde do CMV */}
                  <div className="p-3 bg-white rounded-xl border border-stone-200 shadow-2xs space-y-1.5 mt-2.5">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-bold text-stone-700">Índice CMV:</span>
                      <span className={`font-mono font-bold text-base ${
                        currentPreviewSummary.health_status === 'optimal'
                          ? 'text-emerald-700'
                          : currentPreviewSummary.health_status === 'warning'
                          ? 'text-amber-700'
                          : 'text-rose-700'
                      }`}>
                        {currentPreviewSummary.cmv_percent}%
                      </span>
                    </div>

                    <div className="w-full bg-stone-100 rounded-full h-2 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          currentPreviewSummary.health_status === 'optimal'
                            ? 'bg-emerald-600'
                            : currentPreviewSummary.health_status === 'warning'
                            ? 'bg-amber-500'
                            : 'bg-rose-600'
                        }`}
                        style={{ width: `${Math.min(100, Math.max(5, currentPreviewSummary.cmv_percent))}%` }}
                      />
                    </div>

                    <div className="flex justify-between text-[10px] text-stone-400 font-mono pt-0.5">
                      <span>Meta &lt; 30%</span>
                      <span>Alerta &gt; 38%</span>
                    </div>
                  </div>

                  {/* Sugestão de Preço Ideal */}
                  <div className="p-2.5 bg-emerald-50 rounded-xl border border-emerald-200/80 text-xs text-emerald-950 mt-2.5 space-y-0.5">
                    <span className="font-bold block text-[10.5px]">💡 Sugestão para Meta de 30% CMV:</span>
                    <p className="text-[11px] text-emerald-900 leading-tight">
                      Para operar com margem saudável de 70%, o preço sugerido de venda para este produto é de <strong className="font-mono text-emerald-950">R$ {currentPreviewSummary.target_price_30.toFixed(2)}</strong>.
                    </p>
                  </div>
                </div>

                <div className="pt-3 border-t border-stone-200 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsRecipeModalOpen(false)}
                    className="h-8.5 px-3 text-stone-600 hover:text-stone-900 font-bold text-xs cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveRecipe}
                    className="h-8.5 px-4 bg-[#083d07] hover:bg-[#0b520a] text-white font-bold text-xs rounded-xl shadow-2xs cursor-pointer border border-[#d5af7a]/40"
                  >
                    Salvar Ficha Técnica
                  </button>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

    </div>
  );
}
