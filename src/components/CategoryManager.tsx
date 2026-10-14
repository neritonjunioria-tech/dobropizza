import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { Plus, Edit2, Trash2, Save, X, GripVertical, Check, Loader2, Layers } from 'lucide-react';
import { Reorder, useDragControls } from 'motion/react';

export default function CategoryManager() {
  const [categories, setCategories] = useState<any[]>([]);
  const [itemCounts, setItemCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState("");
  const [orderSaving, setOrderSaving] = useState(false);
  const [orderSaved, setOrderSaved] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCat, setEditingCat] = useState<any>(null);

  useEffect(() => {
    if (!isModalOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsModalOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isModalOpen]);

  const loadData = async () => {
    setLoading(true);
    try {
      const { data } = await supabase.from('categories').select('*').neq('id', 'system_config').order('order_index');
      if (data) setCategories(data);
    } catch (e) {
      console.error("Erro ao carregar categorias", e);
    }
    try {
      const { data: items } = await supabase.from('menu_items').select('category').neq('category', 'system_config');
      const counts: Record<string, number> = {};
      (items || []).forEach((it: any) => {
        counts[it.category] = (counts[it.category] || 0) + 1;
      });
      setItemCounts(counts);
    } catch (e) {
      console.error("Erro ao carregar contagem de itens", e);
    }
    setLoading(false);
  };
  useEffect(() => { loadData(); }, []);

  const persistOrder = useCallback(async (ordered: any[]) => {
    setOrderSaving(true);
    setOrderSaved(false);
    try {
      await Promise.all(
        ordered.map((cat, index) =>
          supabase.from('categories').update({ order_index: index + 1 }).eq('id', cat.id)
        )
      );
      setOrderSaved(true);
      setTimeout(() => setOrderSaved(false), 2500);
    } catch (err: any) {
      console.error("Erro ao salvar ordem", err);
      setFeedback("Erro ao salvar ordem: " + (err?.message || String(err)));
      setTimeout(() => setFeedback(""), 3000);
    } finally {
      setOrderSaving(false);
    }
  }, []);

  const handleReorder = (next: any[]) => {
    setCategories(next);
    persistOrder(next);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback("Salvando...");
    const payload = {
      ...editingCat,
      display_group: editingCat.display_group || null,
    };
    const { error } = await supabase.from('categories').upsert(payload, { onConflict: 'id' });
    if (error) setFeedback("Erro: " + error.message);
    else {
      setFeedback("Salvo com sucesso!");
      setIsModalOpen(false);
      loadData();
    }
    setTimeout(() => setFeedback(""), 3000);
  };

  const handleDelete = async (id: string) => {
    if(!window.confirm("Tem certeza que deseja excluir esta categoria? Os produtos atrelados a ela podem sumir do app. Considere apenas desativar, em vez de excluir.")) return;
    setFeedback("Excluindo...");
    const { error } = await supabase.from('categories').delete().eq('id', id);
    if(error) setFeedback("Erro: " + error.message);
    else { setFeedback("Excluído!"); loadData(); }
    setTimeout(() => setFeedback(""), 3000);
  };

  const handleToggleActive = async (cat: any) => {
    const { error } = await supabase.from('categories').update({ is_active: !cat.is_active }).eq('id', cat.id);
    if (!error) loadData();
  };

  const handleMove = async (cat: any, direction: 'up' | 'down') => {
    const idx = categories.findIndex(c => c.id === cat.id);
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= categories.length) return;
    const neighbor = categories[swapIdx];
    setFeedback("Reordenando...");
    await Promise.all([
      supabase.from('categories').update({ order_index: neighbor.order_index }).eq('id', cat.id),
      supabase.from('categories').update({ order_index: cat.order_index }).eq('id', neighbor.id),
    ]);
    setFeedback("");
    loadData();
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-xl border border-[#E7E5E1] shadow-[0_1px_2px_rgba(28,25,23,0.04),0_1px_8px_rgba(28,25,23,0.04)]">
        <div>
          <h3 className="font-bold text-xl text-[#1C1917]">Categorias</h3>
          <p className="text-xs text-[#78716C] mt-0.5">
            {categories.length > 0
              ? `${categories.length} ${categories.length === 1 ? 'seção cadastrada' : 'seções cadastradas'} · arraste a alça para reordenar`
              : 'Gerencie as seções do seu cardápio'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {(orderSaving || orderSaved) && (
            <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full border transition-colors ${orderSaved ? 'bg-[#F0FDF4] text-[#15803D] border-[#15803D]/20' : 'bg-[#FAFAF9] text-[#78716C] border-[#E7E5E1]'}`}>
              {orderSaving ? (
                <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Salvando ordem...</>
              ) : (
                <><Check className="w-3.5 h-3.5" /> Ordem salva</>
              )}
            </span>
          )}
          <button onClick={() => { setEditingCat({ id: '', name: '', order_index: categories.length + 1 }); setIsModalOpen(true); }} className="flex items-center gap-2 px-4 py-2.5 bg-[#083d07] hover:bg-[#0b520a] text-[#fdfbf7] font-bold rounded-lg text-sm transition-all duration-200 active:scale-95 shadow-sm cursor-pointer border border-[#d5af7a]/60">
            <Plus size={16}/> Nova Categoria
          </button>
        </div>
      </div>

      {feedback && <div className="p-3 bg-[#EFF6FF] text-[#1D4ED8] rounded-lg text-sm border border-[#BFDBFE]">{feedback}</div>}

      {loading ? (
        <div className="space-y-2.5">
          {[0, 1, 2].map(i => (
            <div key={i} className="h-[68px] rounded-xl border border-[#E7E5E1] bg-white animate-pulse" />
          ))}
        </div>
      ) : categories.length === 0 ? (
        <div className="bg-white rounded-xl border border-dashed border-[#D6D3D1] p-10 flex flex-col items-center justify-center text-center">
          <div className="w-12 h-12 rounded-xl bg-[#FAFAF9] border border-[#E7E5E1] flex items-center justify-center mb-3">
            <Layers className="w-6 h-6 text-[#A8A29E]" />
          </div>
          <p className="font-bold text-[#1C1917]">Nenhuma categoria ainda</p>
          <p className="text-xs text-[#78716C] mt-1 mb-4 max-w-xs">Crie a primeira seção do cardápio para começar a organizar seus produtos.</p>
          <button onClick={() => { setEditingCat({ id: '', name: '', order_index: 1 }); setIsModalOpen(true); }} className="flex items-center gap-2 px-4 py-2.5 bg-[#083d07] hover:bg-[#0b520a] text-[#fdfbf7] font-bold rounded-lg text-sm transition-all duration-200 active:scale-95 shadow-sm cursor-pointer border border-[#d5af7a]/60">
            <Plus size={16}/> Criar Categoria
          </button>
        </div>
      ) : (
        <Reorder.Group axis="y" values={categories} onReorder={handleReorder} className="space-y-2.5">
          {categories.map((cat, index) => (
            <CategoryRow
              key={cat.id}
              cat={cat}
              position={index + 1}
              itemCount={itemCounts[cat.id] ?? 0}
              onEdit={() => { setEditingCat(cat); setIsModalOpen(true); }}
              onDelete={() => handleDelete(cat.id)}
            />
          ))}
        </Reorder.Group>
      )}

      {isModalOpen && editingCat && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4"
          onClick={() => setIsModalOpen(false)}
        >
          <form 
            onSubmit={handleSave} 
            className="bg-white p-6 rounded-xl w-full max-w-md shadow-2xl border border-[#E7E5E1] space-y-4 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center pb-2 border-b border-[#E7E5E1]">
              <h3 className="font-bold text-lg text-[#1C1917]">{categories.find(c=>c.id === editingCat.id) ? 'Editar Categoria' : 'Nova Categoria'}</h3>
              <button type="button" onClick={() => setIsModalOpen(false)} className="text-[#A8A29E] hover:text-[#1C1917] p-1"><X size={20}/></button>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wide text-[#A8A29E]">ID da Categoria (sem espaços)</label>
              <input required type="text" value={editingCat.id} onChange={e => setEditingCat({...editingCat, id: e.target.value.toLowerCase().replace(/\s+/g, '-')})} disabled={!!categories.find(c=>c.id === editingCat.id)} className="w-full p-2.5 bg-[#FAFAF9] border border-[#E7E5E1] rounded-lg font-mono text-sm focus:outline-none focus:border-[#083d07] focus:ring-1 focus:ring-[#083d07]/20" placeholder="ex: doces"/>
              <p className="text-xs text-[#78716C]">Este ID é usado pelo sistema. Não pode ser alterado depois.</p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wide text-[#A8A29E]">Nome Interno</label>
              <input required type="text" value={editingCat.name} onChange={e => setEditingCat({...editingCat, name: e.target.value})} className="w-full p-2.5 bg-white border border-[#E7E5E1] rounded-lg text-sm text-[#1C1917] focus:outline-none focus:border-[#083d07] focus:ring-1 focus:ring-[#083d07]/20" placeholder="ex: Doces Finos"/>
              <p className="text-xs text-[#78716C]">Usado internamente no painel. Pode ser simples.</p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wide text-[#A8A29E]">Ícone (emoji, opcional)</label>
              <input type="text" value={editingCat.icon || ''} onChange={e => setEditingCat({...editingCat, icon: e.target.value})} className="w-full p-2.5 bg-white border border-[#E7E5E1] rounded-lg text-sm text-[#1C1917] focus:outline-none focus:border-[#083d07] focus:ring-1 focus:ring-[#083d07]/20" placeholder="🍕"/>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wide text-[#A8A29E]">Rótulo Exibido no Cardápio</label>
              <input type="text" value={editingCat.display_label || ''} onChange={e => setEditingCat({...editingCat, display_label: e.target.value})} className="w-full p-2.5 bg-white border border-[#E7E5E1] rounded-lg text-sm text-[#1C1917] focus:outline-none focus:border-[#083d07] focus:ring-1 focus:ring-[#083d07]/20" placeholder="ex: TRADICIONAIS 🍕"/>
              <p className="text-xs text-[#78716C]">Se vazio, usa o Nome Interno.</p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wide text-[#A8A29E]">Subtítulo</label>
              <input type="text" value={editingCat.display_sub || ''} onChange={e => setEditingCat({...editingCat, display_sub: e.target.value})} className="w-full p-2.5 bg-white border border-[#E7E5E1] rounded-lg text-sm text-[#1C1917] focus:outline-none focus:border-[#083d07] focus:ring-1 focus:ring-[#083d07]/20" placeholder="ex: Clássicas de sempre"/>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wide text-[#A8A29E]">Agrupar sob outra aba</label>
              <select value={editingCat.display_group || ''} onChange={e => setEditingCat({...editingCat, display_group: e.target.value})} className="w-full p-2.5 bg-white border border-[#E7E5E1] rounded-lg text-sm text-[#1C1917] focus:outline-none focus:border-[#083d07] focus:ring-1 focus:ring-[#083d07]/20">
                <option value="">— Aba própria —</option>
                {categories.filter(c => c.id !== editingCat.id).map(c => (
                  <option key={c.id} value={c.id}>{c.display_label || c.name}</option>
                ))}
              </select>
              <p className="text-xs text-[#78716C]">Ex: 3 categorias de esfihas podem aparecer juntas sob uma aba "Esfihas".</p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wide text-[#A8A29E]">Ordem de Exibição</label>
              <input required type="number" value={editingCat.order_index} onChange={e => setEditingCat({...editingCat, order_index: parseInt(e.target.value)})} className="w-full p-2.5 bg-white border border-[#E7E5E1] rounded-lg font-mono text-sm text-[#1C1917] focus:outline-none focus:border-[#083d07] focus:ring-1 focus:ring-[#083d07]/20" />
              <p className="text-xs text-[#78716C]">Dica: use o arrastar-e-soltar da listagem para definir a ordem de forma visual.</p>
            </div>

            <label className="flex items-center gap-2 text-sm text-[#1C1917] font-medium">
              <input type="checkbox" checked={editingCat.is_active !== false} onChange={e => setEditingCat({...editingCat, is_active: e.target.checked})} className="w-4 h-4 accent-[#083d07] rounded" />
              Categoria ativa (visível no cardápio)
            </label>

            <div className="pt-2">
              <button type="submit" className="w-full bg-[#083d07] hover:bg-[#0b520a] text-[#fdfbf7] py-2.5 rounded-lg font-bold transition-colors shadow-sm border border-[#d5af7a]/60 cursor-pointer">Salvar Categoria</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

function CategoryRow({ cat, position, itemCount, onEdit, onDelete }: {
  key?: React.Key;
  cat: any;
  position: number;
  itemCount: number;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const controls = useDragControls();

  return (
    <Reorder.Item
      value={cat}
      dragListener={false}
      dragControls={controls}
      whileDrag={{
        scale: 1.02,
        boxShadow: '0 24px 48px -12px rgba(28,25,23,0.28), 0 8px 16px -8px rgba(28,25,23,0.18)',
        borderColor: '#D4AF6A',
        zIndex: 30,
      }}
      className="group relative bg-white border border-[#E7E5E1] rounded-xl px-4 py-3.5 flex items-center gap-4 shadow-[0_1px_2px_rgba(28,25,23,0.04),0_1px_8px_rgba(28,25,23,0.04)] hover:border-[#D4AF6A]/50 hover:shadow-[0_4px_12px_rgba(28,25,23,0.08),0_2px_4px_rgba(28,25,23,0.06)] transition-colors cursor-default select-none"
    >
      <button
        onPointerDown={(e) => controls.start(e)}
        className="cursor-grab active:cursor-grabbing p-1.5 -m-1.5 rounded-lg text-[#A8A29E] hover:text-[#083d07] hover:bg-[#FDEEF0] transition-colors touch-none"
        title="Arraste para reordenar"
        aria-label={`Reordenar ${cat.name}`}
      >
        <GripVertical className="w-5 h-5" />
      </button>

      <span className="w-8 h-8 shrink-0 rounded-lg bg-[#FAFAF9] border border-[#E7E5E1] text-xs font-bold font-mono text-[#78716C] flex items-center justify-center group-hover:border-[#D4AF6A]/40 transition-colors">
        {position}
      </span>

      <div className="flex-1 min-w-0">
        <div className="font-bold text-[#1C1917] truncate">{cat.name}</div>
        <div className="text-xs text-[#78716C] font-mono truncate mt-0.5">
          {cat.id}
          {itemCount > 0 && <span className="text-[#A8A29E]"> · {itemCount} {itemCount === 1 ? 'produto' : 'produtos'}</span>}
        </div>
      </div>

      <div className="flex gap-1.5 shrink-0">
        <button onClick={onEdit} className="p-2 text-[#78716C] hover:text-[#1D4ED8] hover:bg-[#EFF6FF] rounded-lg transition-colors cursor-pointer" title="Editar categoria"><Edit2 size={16}/></button>
        <button onClick={onDelete} className="p-2 text-[#78716C] hover:text-[#B91C1C] hover:bg-[#FEF2F2] rounded-lg transition-colors cursor-pointer" title="Excluir categoria"><Trash2 size={16}/></button>
      </div>
    </Reorder.Item>
  );
}