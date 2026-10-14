import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { MenuItem, ALL_MENU_ITEMS } from '../data/menu';
import { Plus, Edit2, Trash2, Save, X, Image as ImageIcon, Search, ChevronDown, Check } from 'lucide-react';

export default function MenuManager() {
  const [categories, setCategories] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [feedback, setFeedback] = useState("");
  const [pausedItems, setPausedItems] = useState<string[]>([]);

  // Category dropdown combobox state
  const [isCatDropdownOpen, setIsCatDropdownOpen] = useState(false);
  const catDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (catDropdownRef.current && !catDropdownRef.current.contains(e.target as Node)) {
        setIsCatDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Dismiss on ESC
  useEffect(() => {
    if (!isModalOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isCatDropdownOpen) {
          setIsCatDropdownOpen(false);
        } else {
          setIsModalOpen(false);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isModalOpen, isCatDropdownOpen]);

  const loadData = async () => {
    setLoading(true);
    try {
      const timeout = new Promise<never>((_, reject) => setTimeout(() => reject(new Error("Timeout ao carregar dados do banco")), 15000));
      const [catsResult, itemsResult, pausedResult] = await Promise.race([
        Promise.all([
          supabase.from('categories').select('*').neq('id', 'system_config').order('order_index'),
          supabase.from('menu_items').select('*').neq('category', 'system_config').order('id'),
          supabase.from('paused_items').select('id')
        ]),
        timeout
      ]) as [any, any, any];

      const [cats, menuItems, paused] = catsResult && itemsResult ? [catsResult.data, itemsResult.data, pausedResult.data] : [null, null, null];

      if (catsResult.error) console.error("Erro ao carregar categorias:", catsResult.error);
      if (itemsResult.error) console.error("Erro ao carregar produtos:", itemsResult.error);
      if (cats) setCategories(cats);
      if (menuItems) setItems(menuItems);
      if (paused) setPausedItems(paused.map((p: any) => p.id));
    } catch (err: any) {
      console.error("Falha ao carregar cardápio:", err);
      setFeedback("Erro ao carregar produtos: " + (err?.message || String(err)) + ". Verifique sua conexão e tente novamente.");
      setTimeout(() => setFeedback(""), 5000);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Check and create 'mais-pedidos' category if missing
    supabase.from('categories').select('id').eq('id', 'mais-pedidos').then(({data}) => {
      if (!data || data.length === 0) {
        supabase.from('categories').insert({id: 'mais-pedidos', name: 'OS MAIS PEDIDOS 🔥', order_index: 2}).then(() => {
          loadData();
        });
      }
    });
    loadData();
  }, []);

  const handleMigrate = async () => {
    setFeedback("Iniciando migração... Por favor aguarde.");
    
    // Insert categories first
    const predefinedCategories = [
      { id: 'promocoes', name: 'PROMOÇÃO DO DIA', order_index: 1 },
      { id: 'mais-pedidos', name: 'OS MAIS PEDIDOS 🔥', order_index: 2 },
      { id: 'pizzas', name: 'Pizzas', order_index: 3 },
      { id: 'esfihas-salgadas-tradicionais', name: 'Esfihas Salgadas Tradicionais', order_index: 4 },
      { id: 'esfihas-salgadas-especiais', name: 'Esfihas Salgadas Especiais', order_index: 5 },
      { id: 'esfihas-doces', name: 'Esfihas Doces', order_index: 6 },
      { id: 'bebidas', name: 'Bebidas', order_index: 7 },
      { id: 'bordas', name: 'Bordas', order_index: 8 }
    ];

    for (const cat of predefinedCategories) {
      await supabase.from('categories').upsert(cat, { onConflict: 'id' });
    }

    // Insert items
    for (const item of ALL_MENU_ITEMS) {
      // mapping some specific categories that were grouped in menu.ts
      let catId = item.category;
      if (item.category === 'tradicionais' || item.category === 'especiais' || item.category === 'gourmet' || item.category === 'doces') {
        catId = 'pizzas'; 
      }
      
      let finalImg = item.imageUrl === 'none' ? null : item.imageUrl;
      if (finalImg && finalImg.startsWith('/')) {
        /* no op */
      } else if (finalImg && !finalImg.startsWith('http')) {
        /* no op */
      }

      const dbItem = {
        id: item.id,
        name: item.name,
        ingredients: item.ingredients || '',
        category: item.category,
        price_single: item.priceSingle || null,
        price_p: item.priceP || null,
        price_m: item.priceM || null,
        price_g: item.priceG || null,
        image_url: finalImg,
        day_of_week: item.dayOfWeek || null
      };
      
      // Ensure category exists
      const catExists = predefinedCategories.find(c => c.id === item.category) || ['tradicionais', 'especiais', 'gourmet', 'doces'].includes(item.category);
      if (['tradicionais', 'especiais', 'gourmet', 'doces'].includes(item.category)) {
          await supabase.from('categories').upsert({ id: item.category, name: 'Pizzas ' + item.category, order_index: 3 }, { onConflict: 'id' });
      }

      await supabase.from('menu_items').upsert(dbItem, { onConflict: 'id' });
    }
    
    setFeedback("Migração concluída com sucesso!");
    loadData();
  };


  const [uploadingImage, setUploadingImage] = useState(false);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploadingImage(true);
      setFeedback("Fazendo upload da imagem...");
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
      const filePath = `dobropizza/produtos/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('cardapio-dobropizza')
        .upload(filePath, file);

      if (uploadError) {
        throw uploadError;
      }

      const { data } = supabase.storage
        .from('cardapio-dobropizza')
        .getPublicUrl(filePath);

      setEditingItem({ ...editingItem, image_url: data.publicUrl });
      setFeedback("Upload de imagem concluído com sucesso!");
    } catch (error: any) {
      console.error(error);
      setFeedback("Erro no upload (certifique-se de que criou um bucket 'cardapio-dobropizza' público no Supabase): " + error.message);
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback("Salvando...");
    
    let finalImageUrl = editingItem.image_url || null;
    if (finalImageUrl && !finalImageUrl.startsWith('http') && !finalImageUrl.startsWith('/')) {
      // É só um nome de arquivo solto (veio do Storage do Supabase), então montamos a URL pública.
      finalImageUrl = `${import.meta.env.VITE_SUPABASE_URL || 'https://yexlnjznkxthffklovql.supabase.co'}/storage/v1/object/public/cardapio-dobropizza/${finalImageUrl}`;
    }

    const isPizza = ['pizzas', 'tradicionais', 'especiais', 'gourmet', 'doces'].includes(editingItem.category) || editingItem.id?.startsWith('p-');

    const parseNum = (val: any) => {
      if (val === undefined || val === null || val === '') return null;
      const parsed = parseFloat(String(val).replace(',', '.'));
      return isNaN(parsed) ? null : parsed;
    };

    const dbItem: any = {
      id: editingItem.id || `item-${Date.now()}`,
      name: editingItem.name,
      ingredients: editingItem.ingredients,
      category: editingItem.category,
      price_single: isPizza ? null : parseNum(editingItem.price_single),
      price_p: isPizza ? parseNum(editingItem.price_p) : null,
      price_m: isPizza ? parseNum(editingItem.price_m) : null,
      price_g: isPizza ? parseNum(editingItem.price_g) : null,
      image_url: finalImageUrl,
      day_of_week: editingItem.day_of_week || null,
      is_active: editingItem.is_active !== undefined ? editingItem.is_active : true,
      is_bestseller: editingItem.is_bestseller !== undefined ? editingItem.is_bestseller : false
    };

    // Apenas tenta enviar tamanhos extras se preenchidos em pizzas
    if (isPizza) {
      const pBig = parseNum(editingItem.price_big);
      const pSuperBig = parseNum(editingItem.price_super_big);
      if (pBig !== null) dbItem.price_big = pBig;
      if (pSuperBig !== null) dbItem.price_super_big = pSuperBig;
    }

    let { error } = await supabase.from('menu_items').upsert(dbItem, { onConflict: 'id' });
    
    // Auto-recuperação: se as colunas price_big/price_super_big não existirem no schema cache do Supabase,
    // remove esses campos extras e salva perfeitamente sem travar o gestor.
    if (error && (error.message.includes('price_big') || error.message.includes('price_super_big'))) {
      delete dbItem.price_big;
      delete dbItem.price_super_big;
      const retryResult = await supabase.from('menu_items').upsert(dbItem, { onConflict: 'id' });
      error = retryResult.error;
    }
    
    if (error) {
      setFeedback("Erro ao salvar: " + error.message);
    } else {
      setFeedback("Salvo com sucesso!");
      setIsModalOpen(false);
      loadData();
    }
    
    setTimeout(() => setFeedback(""), 3000);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("Tem certeza que deseja excluir este item?")) {
      await supabase.from('menu_items').delete().eq('id', id);
      loadData();
    }
  };

  const togglePauseItem = async (itemId: string) => {
    const isPaused = pausedItems.includes(itemId);
    try {
      if (isPaused) {
        setPausedItems(prev => prev.filter(id => id !== itemId));
        await supabase.from('paused_items').delete().eq('id', itemId);
      } else {
        setPausedItems(prev => [...prev, itemId]);
        await supabase.from('paused_items').upsert({ id: itemId }, { onConflict: 'id' });
      }
    } catch(e) {
      console.error(e);
      loadData(); // revert on error
    }
  };

  const handleQuickPriceEdit = async (itemId: string, field: string, value: string) => {
    const numVal = parseFloat(value.replace(',', '.'));
    if(isNaN(numVal)) return;

    try {
      // Optimistic UI update
      setItems(prev => prev.map(item => item.id === itemId ? { ...item, [field]: numVal } : item));
      const { error } = await supabase.from('menu_items').update({ [field]: numVal }).eq('id', itemId);
      if(error) throw error;
    } catch(e) {
      console.error(e);
      loadData(); // revert on error
    }
  };

  const openNewModal = () => {
    setEditingItem({
      id: `item-${Date.now()}`,
      name: '',
      ingredients: '',
      category: categories[0]?.id || '',
      price_single: '',
      price_p: '',
      price_m: '',
      price_g: '',
      price_big: '',
      price_super_big: '',
      image_url: '',
      is_bestseller: false
    });
    setIsCatDropdownOpen(false);
    setIsModalOpen(true);
  };

  if (loading) return <div className="p-8 text-center">Carregando dados do banco...</div>;

  const filteredItems = (activeCategory === 'all' ? items : items.filter(i => i.category === activeCategory))
    .filter(i => i.name.toLowerCase().includes(searchTerm.toLowerCase()) || (i.ingredients && i.ingredients.toLowerCase().includes(searchTerm.toLowerCase())));

  return (
    <div className="bg-white rounded-xl border border-[#E7E5E1] shadow-[0_1px_2px_rgba(28,25,23,0.04),0_1px_8px_rgba(28,25,23,0.04)] p-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <div>
          <h2 className="text-xl font-bold text-[#1C1917]">Gerenciar Cardápio</h2>
          <p className="text-sm text-[#78716C]">Controle total sobre seus produtos e categorias.</p>
        </div>
        <div className="flex gap-2">
          {items.length === 0 && (
            <button onClick={handleMigrate} className="px-4 py-2.5 bg-amber-600 text-white rounded-lg font-semibold text-sm hover:bg-amber-700 transition-colors">
              Puxar Cardápio Inicial (Migrar)
            </button>
          )}
          <button onClick={openNewModal} className="px-4 py-2.5 bg-[#083d07] text-[#fdfbf7] font-bold rounded-lg text-sm hover:bg-[#0b520a] transition-colors flex items-center gap-2 border border-[#d5af7a]/60 cursor-pointer shadow-sm">
            <Plus size={16} /> Novo Produto
          </button>
        </div>
      </div>

      {feedback && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#083d07] text-white px-4 py-2.5 rounded-xl shadow-2xl border border-stone-700 text-xs font-bold flex items-center gap-2.5 animate-in fade-in slide-in-from-bottom-4 duration-200">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          <span>{feedback}</span>
        </div>
      )}

      {/* Category Filter */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="flex overflow-x-auto gap-1.5 pb-2 scrollbar-hide flex-1">
          <button 
            onClick={() => setActiveCategory('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all duration-200 active:scale-95 cursor-pointer ${activeCategory === 'all' ? 'bg-[#1C1917] text-[#D4AF6A] shadow-md' : 'bg-[#FAFAF9] text-[#78716C] border border-[#E7E5E1] hover:bg-gray-100'}`}
          >
            Todos os Produtos
          </button>
          {categories.map(cat => (
            <button 
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all duration-200 active:scale-95 cursor-pointer ${activeCategory === cat.id ? 'bg-[#1C1917] text-[#D4AF6A] shadow-md' : 'bg-[#FAFAF9] text-[#78716C] border border-[#E7E5E1] hover:bg-gray-100'}`}
            >
              {cat.name}
            </button>
          ))}
        </div>
        <div className="w-full sm:w-72 flex-shrink-0 relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search size={16} className="text-stone-400" />
          </div>
          <input
            type="text"
            placeholder="Buscar produto..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-stone-300 bg-white text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-[#083d07] focus:border-[#083d07] shadow-sm transition-all"
          />
        </div>
      </div>

      {/* Items Table (Quick Edit) */}
      <div className="bg-white rounded-xl border border-[#E7E5E1] shadow-[0_1px_2px_rgba(28,25,23,0.04)] overflow-hidden overflow-x-auto">
        <table className="min-w-full text-left border-collapse">
          <thead>
            <tr className="bg-[#FAFAF9] border-b border-[#E7E5E1] text-[11px] font-mono font-bold text-[#78716C] uppercase tracking-wider">
              <th className="py-3 px-4">Produto</th>
              <th className="py-3 px-4">Preço(s)</th>
              <th className="py-3 px-4 text-center">Status</th>
              <th className="py-3 px-4 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#F0EFED] text-sm">
            {filteredItems.map(item => {
              const isPaused = pausedItems.includes(item.id);
              
              return (
                <tr key={item.id} className="hover:bg-stone-50/50 transition-colors">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-lg bg-stone-100 flex items-center justify-center overflow-hidden shrink-0 border border-stone-200">
                        {item.image_url ? (
                          <img src={item.image_url.startsWith('http') ? item.image_url : (item.image_url.startsWith('/') ? item.image_url : '/' + item.image_url)} alt={item.name} className="w-full h-full object-cover" />
                        ) : (
                          <ImageIcon size={16} className="text-stone-400" />
                        )}
                      </div>
                      <div>
                        <div className="font-bold text-[#1C1917] line-clamp-1">{item.name}</div>
                        <span className="text-[10px] uppercase font-mono font-semibold text-stone-500 bg-stone-100 px-1.5 py-0.5 rounded">
                          {categories.find(c => c.id === item.category)?.name || item.category}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    {item.price_single !== null ? (
                      <div className="flex items-center gap-1">
                        <span className="text-stone-500 font-mono">R$</span>
                        <input 
                          type="text" 
                          defaultValue={item.price_single}
                          onBlur={(e) => handleQuickPriceEdit(item.id, 'price_single', e.target.value)}
                          className="w-16 px-2 py-1 text-sm font-mono font-bold border border-stone-200 rounded-md focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none"
                        />
                      </div>
                    ) : (
                      <div className="flex items-center gap-3">
                        <div className="flex flex-col">
                          <span className="text-[9px] font-mono text-stone-400">Peq</span>
                          <div className="flex items-center gap-0.5">
                            <span className="text-stone-400 font-mono text-xs">R$</span>
                            <input type="text" defaultValue={item.price_p} onBlur={(e) => handleQuickPriceEdit(item.id, 'price_p', e.target.value)} className="w-12 px-1.5 py-0.5 text-xs font-mono font-bold border border-stone-200 rounded-md outline-none focus:border-amber-500" />
                          </div>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[9px] font-mono text-stone-400">Méd</span>
                          <div className="flex items-center gap-0.5">
                            <span className="text-stone-400 font-mono text-xs">R$</span>
                            <input type="text" defaultValue={item.price_m} onBlur={(e) => handleQuickPriceEdit(item.id, 'price_m', e.target.value)} className="w-12 px-1.5 py-0.5 text-xs font-mono font-bold border border-stone-200 rounded-md outline-none focus:border-amber-500" />
                          </div>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[9px] font-mono text-stone-400">Grd</span>
                          <div className="flex items-center gap-0.5">
                            <span className="text-stone-400 font-mono text-xs">R$</span>
                            <input type="text" defaultValue={item.price_g} onBlur={(e) => handleQuickPriceEdit(item.id, 'price_g', e.target.value)} className="w-12 px-1.5 py-0.5 text-xs font-mono font-bold border border-stone-200 rounded-md outline-none focus:border-amber-500" />
                          </div>
                        </div>
                      </div>
                    )}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <button
                      onClick={() => togglePauseItem(item.id)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${!isPaused ? 'bg-emerald-500' : 'bg-stone-300'}`}
                    >
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${!isPaused ? 'translate-x-6' : 'translate-x-1'}`} />
                    </button>
                    <div className={`text-[10px] font-mono font-bold mt-1 ${isPaused ? 'text-red-500' : 'text-emerald-600'}`}>
                      {isPaused ? 'PAUSADO' : 'ATIVO'}
                    </div>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => { setEditingItem(item); setIsModalOpen(true); }} className="p-1.5 text-stone-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors border border-transparent hover:border-blue-200" title="Editar Completo">
                        <Edit2 size={16} />
                      </button>
                      <button onClick={() => handleDelete(item.id)} className="p-1.5 text-stone-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-transparent hover:border-red-200" title="Excluir">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {items.length === 0 && (
         <div className="text-center py-12 text-gray-500">
           Nenhum produto cadastrado no banco de dados ainda. <br/>
           Clique em "Puxar Cardápio Inicial" para importar os dados do código.
         </div>
      )}

      {/* Editor Modal */}
      {isModalOpen && editingItem && (
        <div 
          className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
          onClick={() => setIsModalOpen(false)}
        >
          <div 
            className="bg-stone-50 rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl border border-[#0b520a]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-[#e5ddd4] p-4 sm:p-5 flex justify-between items-center z-10 border-b border-[#d3c8bb]">
              <h2 className="text-lg font-extrabold text-[#44210f] tracking-tight">
                {editingItem.id.startsWith('item-') && !editingItem.name ? 'Novo Produto' : 'Editar Produto'}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="p-2 text-stone-400 hover:text-white bg-[#083d07] hover:bg-rose-600 rounded-md transition-colors border border-[#0b520a] hover:border-rose-500">
                <X size={18} />
              </button>
            </div>
            
            <form onSubmit={handleSave} className="p-3 sm:p-4 space-y-2.5 bg-white">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
                <div className="space-y-1 md:col-span-2">
                  <label className="block text-[10px] font-mono font-bold text-stone-600 uppercase tracking-wider">Nome do Produto</label>
                  <input required type="text" value={editingItem.name} onChange={e => setEditingItem({...editingItem, name: e.target.value})} className="w-full px-3 py-1.5 bg-stone-50 border border-stone-200 rounded-md text-sm font-bold text-stone-900 outline-none focus:border-[#083d07] focus:bg-white transition-colors" placeholder="Ex: 61 - Bacon" />
                </div>

                <div ref={catDropdownRef} className="space-y-1 md:col-span-1 relative">
                  <label className="block text-[10px] font-mono font-bold text-stone-600 uppercase tracking-wider">Categoria</label>
                  <button
                    type="button"
                    onClick={() => setIsCatDropdownOpen(!isCatDropdownOpen)}
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-md text-xs font-bold text-stone-900 flex items-center justify-between hover:bg-stone-100/70 cursor-pointer transition-colors shadow-2xs"
                  >
                    <span className="truncate">
                      {categories.find(c => c.id === editingItem.category)?.name || editingItem.category || 'Selecione...'}
                    </span>
                    <ChevronDown size={14} className={`text-stone-400 shrink-0 ml-1 transition-transform ${isCatDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {isCatDropdownOpen && (
                    <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-stone-200 rounded-lg shadow-xl z-50 py-1 max-h-52 overflow-y-auto animate-in fade-in zoom-in-95 duration-100">
                      {categories.map(c => {
                        const isSelected = editingItem.category === c.id;
                        return (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => {
                              setEditingItem({ ...editingItem, category: c.id });
                              setIsCatDropdownOpen(false);
                            }}
                            className={`w-full px-3 py-2 text-left text-xs flex items-center justify-between transition-colors cursor-pointer ${
                              isSelected ? 'bg-amber-50 text-amber-950 font-black' : 'text-stone-800 hover:bg-stone-50 font-bold'
                            }`}
                          >
                            <span>{c.name}</span>
                            {isSelected && <Check size={12} className="text-amber-700" />}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] font-mono font-bold text-stone-600 uppercase tracking-wider">Ingredientes / Descrição</label>
                <textarea rows={1} value={editingItem.ingredients} onChange={e => setEditingItem({...editingItem, ingredients: e.target.value})} className="w-full px-3 py-1.5 bg-stone-50 border border-stone-200 rounded-md text-sm font-bold text-stone-900 outline-none focus:border-[#083d07] focus:bg-white transition-colors resize-y min-h-[40px]" placeholder="Lista de ingredientes..."></textarea>
              </div>

              
              <div className="space-y-1.5 bg-stone-50 p-2.5 rounded-md border border-stone-200">
                <label className="block text-[10px] font-mono font-bold text-stone-600 uppercase tracking-wider">Imagem do Produto (URL ou Upload)</label>
                
                {editingItem.image_url && (
                  <div className="w-full h-20 rounded-md overflow-hidden border border-stone-200 bg-white mb-1.5 flex items-center justify-center p-1 relative shadow-sm">
                    <img 
                      src={editingItem.image_url.startsWith('http') ? editingItem.image_url : (editingItem.image_url.startsWith('/') ? editingItem.image_url : '/' + editingItem.image_url)} 
                      alt="Preview proporcional" 
                      className="w-full h-full object-contain" 
                    />
                  </div>
                )}

                <div className="flex gap-2 items-center">
                  <input type="text" value={editingItem.image_url || ''} onChange={e => setEditingItem({...editingItem, image_url: e.target.value})} className="w-full px-3 py-1.5 bg-white border border-stone-200 rounded-md text-sm font-bold text-stone-900 outline-none focus:border-[#083d07] transition-colors" placeholder="URL da imagem (Ex: /pizza.png)" />
                </div>

                <div className="pt-2 border-t border-stone-200 mt-2 flex items-center justify-between">
                  <span className="block text-[10px] font-mono font-bold text-stone-500 uppercase tracking-wider">Enviar do PC:</span>
                  <label className="cursor-pointer bg-[#083d07] hover:bg-[#062b06] text-white px-3 py-1 rounded text-[10px] font-bold uppercase transition-colors shadow-sm">
                    {uploadingImage ? 'Enviando...' : 'Escolher Arquivo'}
                    <input 
                      type="file" 
                      accept="image/jpeg, image/png, image/webp" 
                      onChange={handleImageUpload}
                      disabled={uploadingImage}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              <div className="border-t border-stone-100 pt-2.5">
                {(() => {
                  const isPizza = ['pizzas', 'tradicionais', 'especiais', 'gourmet', 'doces'].includes(editingItem.category) || editingItem.id?.startsWith('p-');

                  if (isPizza) {
                    return (
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="text-[10px] font-black text-stone-700 uppercase tracking-wider flex items-center gap-1">
                            🍕 Preços por Tamanho da Pizza
                          </h3>
                          <span className="text-[9.5px] font-mono text-stone-400">Preencha os tamanhos disponíveis</span>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
                          <div className="p-2 rounded-lg bg-stone-50 border border-stone-200 space-y-1">
                            <label className="block text-[9.5px] font-mono font-bold text-stone-600 uppercase">Pequena (P)</label>
                            <div className="flex items-center gap-0.5">
                              <span className="text-xs font-mono font-bold text-stone-400">R$</span>
                              <input type="number" step="0.01" value={editingItem.price_p ?? ''} onChange={e => setEditingItem({...editingItem, price_p: e.target.value})} placeholder="0.00" className="w-full bg-white px-2 py-1 text-xs font-mono font-bold border border-stone-300 rounded focus:border-amber-500 outline-none" />
                            </div>
                          </div>
                          <div className="p-2 rounded-lg bg-stone-50 border border-stone-200 space-y-1">
                            <label className="block text-[9.5px] font-mono font-bold text-stone-600 uppercase">Média (M)</label>
                            <div className="flex items-center gap-0.5">
                              <span className="text-xs font-mono font-bold text-stone-400">R$</span>
                              <input type="number" step="0.01" value={editingItem.price_m ?? ''} onChange={e => setEditingItem({...editingItem, price_m: e.target.value})} placeholder="0.00" className="w-full bg-white px-2 py-1 text-xs font-mono font-bold border border-stone-300 rounded focus:border-amber-500 outline-none" />
                            </div>
                          </div>
                          <div className="p-2 rounded-lg bg-amber-50/50 border border-amber-300 space-y-1">
                            <label className="block text-[9.5px] font-mono font-bold text-amber-900 uppercase">Grande (G) *</label>
                            <div className="flex items-center gap-0.5">
                              <span className="text-xs font-mono font-bold text-amber-700">R$</span>
                              <input type="number" step="0.01" value={editingItem.price_g ?? ''} onChange={e => setEditingItem({...editingItem, price_g: e.target.value})} placeholder="0.00" className="w-full bg-white px-2 py-1 text-xs font-mono font-bold border border-amber-400 rounded focus:border-amber-600 outline-none" />
                            </div>
                          </div>
                          <div className="p-2 rounded-lg bg-stone-50 border border-stone-200 space-y-1">
                            <label className="block text-[9.5px] font-mono font-bold text-stone-600 uppercase">Big (Família)</label>
                            <div className="flex items-center gap-0.5">
                              <span className="text-xs font-mono font-bold text-stone-400">R$</span>
                              <input type="number" step="0.01" value={editingItem.price_big ?? ''} onChange={e => setEditingItem({...editingItem, price_big: e.target.value})} placeholder="0.00" className="w-full bg-white px-2 py-1 text-xs font-mono font-bold border border-stone-300 rounded focus:border-amber-500 outline-none" />
                            </div>
                          </div>
                          <div className="p-2 rounded-lg bg-stone-50 border border-stone-200 space-y-1">
                            <label className="block text-[9.5px] font-mono font-bold text-stone-600 uppercase">Super Big (GG)</label>
                            <div className="flex items-center gap-0.5">
                              <span className="text-xs font-mono font-bold text-stone-400">R$</span>
                              <input type="number" step="0.01" value={editingItem.price_super_big ?? ''} onChange={e => setEditingItem({...editingItem, price_super_big: e.target.value})} placeholder="0.00" className="w-full bg-white px-2 py-1 text-xs font-mono font-bold border border-stone-300 rounded focus:border-amber-500 outline-none" />
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div className="p-3 bg-emerald-50/40 border border-emerald-200 rounded-xl space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="block text-[10px] font-mono font-bold text-emerald-800 uppercase tracking-wider">
                          Preço do Produto (R$)
                        </label>
                        <span className="text-[9.5px] font-mono text-emerald-700">Valor único para venda individual</span>
                      </div>
                      <div className="relative max-w-xs">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono font-bold text-emerald-700 text-sm">R$</span>
                        <input
                          type="number"
                          step="0.01"
                          required
                          value={editingItem.price_single ?? ''}
                          onChange={e => setEditingItem({...editingItem, price_single: e.target.value})}
                          placeholder="0.00"
                          className="w-full pl-8 pr-3 py-2 bg-white border border-emerald-300 rounded-lg text-sm font-black font-mono text-emerald-950 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-200 outline-none shadow-2xs"
                        />
                      </div>
                    </div>
                  );
                })()}
              </div>

              <div className="pt-2 flex justify-between items-center border-t border-stone-100">
                <label className="flex items-center gap-2 text-xs text-[#1C1917] font-bold cursor-pointer">
                  <input type="checkbox" checked={editingItem.is_bestseller || false} onChange={e => setEditingItem({...editingItem, is_bestseller: e.target.checked})} className="w-4 h-4 accent-[#083d07] rounded cursor-pointer" />
                  🌟 Destaque
                </label>

                <div className="flex gap-2">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 rounded-md font-bold text-xs bg-stone-100 hover:bg-stone-200 text-stone-700 transition-colors cursor-pointer border border-stone-200">
                    Cancelar
                  </button>
                  <button type="submit" className="px-5 py-2 rounded-md font-bold text-xs bg-[#083d07] hover:bg-[#0b520a] text-[#fdfbf7] shadow-sm transition-all active:translate-y-px cursor-pointer flex items-center gap-1.5 border border-[#d5af7a]/60">
                    <Save size={14} /> Salvar
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
