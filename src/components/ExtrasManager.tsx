import React, { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Plus, Trash2, ChevronUp, ChevronDown, Check, Loader2 } from 'lucide-react';

// Menu extras (table `extras`).
// mode "full"  -> Produtos: create, rename, change price, choose where it appears, reorder, pause, delete.
// mode "pause" -> Cardápio Digital: only pause / reactivate (same data, so a pause shows in both places).

interface ExtraRow {
  id: string;
  group_id: string;
  name: string;
  price: number;
  is_active: boolean;
  sort_order: number;
  categories: string[] | null;
}

// Where an extra can appear. Pizzas cover both pizza sections of the menu.
const PLACES = [
  { key: 'pizzas', label: 'Pizzas', categories: ['mais-pedidos', 'premium'] },
  { key: 'sandubas', label: 'Sandubas', categories: ['sandubas'] },
];

const placesOf = (cats: string[] | null) =>
  !cats || cats.length === 0 ? PLACES.map((p) => p.key) : PLACES.filter((p) => p.categories.some((c) => cats.includes(c))).map((p) => p.key);

// All places selected = offered everywhere (stored as null)
const categoriesFor = (keys: string[]) =>
  keys.length === PLACES.length ? null : PLACES.filter((p) => keys.includes(p.key)).flatMap((p) => p.categories);

const parsePrice = (v: string) => {
  const n = Number(String(v).replace(/[^\d,.-]/g, '').replace(',', '.'));
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) / 100 : null;
};
const brl = (v: number) => Number(v || 0).toFixed(2).replace('.', ',');

export default function ExtrasManager({ mode = 'full' }: { mode?: 'full' | 'pause' }) {
  const [rows, setRows] = useState<ExtraRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  const [newPrice, setNewPrice] = useState('7,00');
  const [newPlaces, setNewPlaces] = useState<string[]>(PLACES.map((p) => p.key));
  const [adding, setAdding] = useState(false);

  const load = useCallback(async () => {
    const { data, error: err } = await supabase
      .from('extras')
      .select('id, group_id, name, price, is_active, sort_order, categories')
      .order('sort_order');
    if (err) setError('Não foi possível carregar os adicionais: ' + err.message);
    else { setError(null); setRows((data || []).map((r: any) => ({ ...r, price: Number(r.price) }))); }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    const channel = supabase
      .channel(`admin-extras-${mode}-${Math.random().toString(36).slice(2, 8)}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'extras' }, () => load())
      .subscribe();
    return () => { try { supabase.removeChannel(channel); } catch { /* ignore */ } };
  }, [load, mode]);

  const update = async (id: string, patch: Partial<ExtraRow>) => {
    setSavingId(id);
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
    const { error: err } = await supabase.from('extras').update(patch).eq('id', id);
    if (err) { setError('Não foi possível salvar: ' + err.message); load(); }
    setSavingId(null);
  };

  const add = async () => {
    const price = parsePrice(newPrice);
    if (!newName.trim()) { setError('Informe o nome do adicional.'); return; }
    if (price === null) { setError('Preço inválido. Use, por exemplo, 7,00.'); return; }
    if (newPlaces.length === 0) { setError('Escolha onde o adicional aparece (Pizzas e/ou Sandubas).'); return; }
    setAdding(true);
    let groupId = rows[0]?.group_id;
    if (!groupId) {
      const { data: g } = await supabase.from('extra_groups').select('id').eq('name', 'Adicionais Extras').maybeSingle();
      groupId = g?.id;
      if (!groupId) {
        const { data: created, error: gErr } = await supabase.from('extra_groups').insert({ name: 'Adicionais Extras' }).select('id').single();
        if (gErr) { setError('Não foi possível criar o grupo de adicionais: ' + gErr.message); setAdding(false); return; }
        groupId = created.id;
      }
    }
    const { error: err } = await supabase.from('extras').insert({
      group_id: groupId,
      name: newName.trim(),
      price,
      is_active: true,
      sort_order: (rows.reduce((m, r) => Math.max(m, r.sort_order), 0) || 0) + 1,
      categories: categoriesFor(newPlaces),
    });
    if (err) setError('Não foi possível cadastrar: ' + err.message);
    else { setError(null); setNewName(''); setNewPrice('7,00'); setNewPlaces(PLACES.map((p) => p.key)); await load(); }
    setAdding(false);
  };

  const remove = async (row: ExtraRow) => {
    if (!window.confirm(`Excluir o adicional "${row.name}"? Para tirar só por um tempo, use a pausa.`)) return;
    const { error: err } = await supabase.from('extras').delete().eq('id', row.id);
    if (err) setError('Não foi possível excluir: ' + err.message);
    load();
  };

  const move = async (index: number, dir: -1 | 1) => {
    const target = index + dir;
    if (target < 0 || target >= rows.length) return;
    const a = rows[index], b = rows[target];
    const reordered = [...rows];
    reordered[index] = { ...b, sort_order: a.sort_order };
    reordered[target] = { ...a, sort_order: b.sort_order };
    setRows(reordered);
    await Promise.all([
      supabase.from('extras').update({ sort_order: b.sort_order }).eq('id', a.id),
      supabase.from('extras').update({ sort_order: a.sort_order }).eq('id', b.id),
    ]);
    load();
  };

  const togglePlace = (row: ExtraRow, key: string) => {
    const current = placesOf(row.categories);
    const next = current.includes(key) ? current.filter((k) => k !== key) : [...current, key];
    if (next.length === 0) { setError('O adicional precisa aparecer em pelo menos um lugar. Para tirar do cardápio, use a pausa.'); return; }
    update(row.id, { categories: categoriesFor(next) });
  };

  const Switch = ({ row }: { row: ExtraRow }) => (
    <div className="flex flex-col items-center">
      <button
        type="button"
        onClick={() => update(row.id, { is_active: !row.is_active })}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${row.is_active ? 'bg-emerald-500' : 'bg-stone-300'}`}
        aria-label={row.is_active ? `Pausar ${row.name}` : `Reativar ${row.name}`}
      >
        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${row.is_active ? 'translate-x-6' : 'translate-x-1'}`} />
      </button>
      <span className={`text-[10px] font-mono font-bold mt-1 ${row.is_active ? 'text-emerald-600' : 'text-red-500'}`}>
        {row.is_active ? 'ATIVO' : 'PAUSADO'}
      </span>
    </div>
  );

  if (loading) return <div className="p-6 text-center text-sm text-stone-500">Carregando adicionais...</div>;

  if (mode === 'pause') {
    return (
      <div className="space-y-3">
        {error && <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg p-2">{error}</p>}
        {rows.length === 0 ? (
          <p className="text-sm text-stone-500">Nenhum adicional cadastrado. Cadastre em Produtos › Adicionais Extras.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {rows.map((row) => (
              <div key={row.id} className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 ${row.is_active ? 'border-[#E7E5E1] bg-white' : 'border-rose-200 bg-rose-50/50'}`}>
                <div className="min-w-0">
                  <p className={`font-bold text-sm truncate ${row.is_active ? 'text-stone-900' : 'text-stone-500 line-through'}`}>{row.name}</p>
                  <p className="text-xs text-stone-500 font-mono">
                    R$ {brl(row.price)} · {placesOf(row.categories).map((k) => PLACES.find((p) => p.key === k)?.label).join(' e ')}
                  </p>
                </div>
                <Switch row={row} />
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-base font-bold text-[#1C1917]">Adicionais Extras</h3>
        <p className="text-xs text-[#78716C]">
          O que o cliente pode acrescentar no produto. Pausar tira do cardápio na hora, sem apagar; a pausa também aparece em Cardápio Digital.
        </p>
      </div>

      {error && <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg p-2.5">{error}</p>}

      {/* New extra */}
      <div className="bg-[#FAFAF9] border border-[#E7E5E1] rounded-xl p-4 grid grid-cols-1 sm:grid-cols-[1fr_110px_auto_auto] gap-3 items-end">
        <label className="space-y-1">
          <span className="block text-[10px] font-mono font-bold text-stone-600 uppercase tracking-wider">Nome do adicional</span>
          <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Ex.: Extra Bacon"
            className="w-full px-3 py-2 bg-white border border-stone-200 rounded-lg text-sm font-semibold outline-none focus:border-[#083d07]" />
        </label>
        <label className="space-y-1">
          <span className="block text-[10px] font-mono font-bold text-stone-600 uppercase tracking-wider">Preço (R$)</span>
          <input value={newPrice} onChange={(e) => setNewPrice(e.target.value)} inputMode="decimal"
            className="w-full px-3 py-2 bg-white border border-stone-200 rounded-lg text-sm font-mono font-bold outline-none focus:border-[#083d07]" />
        </label>
        <div className="space-y-1">
          <span className="block text-[10px] font-mono font-bold text-stone-600 uppercase tracking-wider">Aparece em</span>
          <div className="flex gap-1.5">
            {PLACES.map((p) => {
              const on = newPlaces.includes(p.key);
              return (
                <button key={p.key} type="button"
                  onClick={() => setNewPlaces(on ? newPlaces.filter((k) => k !== p.key) : [...newPlaces, p.key])}
                  className={`px-3 py-2 rounded-lg text-xs font-bold border transition-colors cursor-pointer flex items-center gap-1 ${on ? 'bg-[#083d07] text-[#fdfbf7] border-[#083d07]' : 'bg-white text-stone-600 border-stone-200'}`}>
                  {on && <Check size={12} />}{p.label}
                </button>
              );
            })}
          </div>
        </div>
        <button type="button" onClick={add} disabled={adding}
          className="px-4 py-2 bg-[#083d07] text-[#fdfbf7] font-bold rounded-lg text-sm hover:bg-[#0b520a] transition-colors flex items-center justify-center gap-2 border border-[#d5af7a]/60 cursor-pointer disabled:opacity-60">
          {adding ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />} Cadastrar
        </button>
      </div>

      {/* List */}
      <div className="bg-white rounded-xl border border-[#E7E5E1] overflow-hidden overflow-x-auto">
        <table className="min-w-full text-left border-collapse">
          <thead>
            <tr className="bg-[#FAFAF9] border-b border-[#E7E5E1] text-[11px] font-mono font-bold text-[#78716C] uppercase tracking-wider">
              <th className="py-3 px-3 w-16">Ordem</th>
              <th className="py-3 px-3">Adicional</th>
              <th className="py-3 px-3">Preço</th>
              <th className="py-3 px-3">Aparece em</th>
              <th className="py-3 px-3 text-center">Status</th>
              <th className="py-3 px-3 text-right">Excluir</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#F0EFED] text-sm">
            {rows.map((row, i) => (
              <tr key={row.id} className={row.is_active ? 'hover:bg-stone-50/50' : 'bg-rose-50/40'}>
                <td className="py-2.5 px-3">
                  <div className="flex flex-col">
                    <button type="button" onClick={() => move(i, -1)} disabled={i === 0} className="p-0.5 text-stone-400 hover:text-stone-800 disabled:opacity-25 cursor-pointer" aria-label="Subir"><ChevronUp size={16} /></button>
                    <button type="button" onClick={() => move(i, 1)} disabled={i === rows.length - 1} className="p-0.5 text-stone-400 hover:text-stone-800 disabled:opacity-25 cursor-pointer" aria-label="Descer"><ChevronDown size={16} /></button>
                  </div>
                </td>
                <td className="py-2.5 px-3">
                  <input defaultValue={row.name} key={`n-${row.id}-${row.name}`}
                    onBlur={(e) => { const v = e.target.value.trim(); if (v && v !== row.name) update(row.id, { name: v }); }}
                    className="w-full min-w-[180px] px-2 py-1 font-bold text-[#1C1917] border border-transparent hover:border-stone-200 focus:border-[#083d07] rounded-md outline-none bg-transparent" />
                </td>
                <td className="py-2.5 px-3">
                  <div className="flex items-center gap-1">
                    <span className="text-stone-500 font-mono">R$</span>
                    <input defaultValue={brl(row.price)} key={`p-${row.id}-${row.price}`} inputMode="decimal"
                      onBlur={(e) => { const v = parsePrice(e.target.value); if (v === null) { setError('Preço inválido. Use, por exemplo, 7,00.'); e.target.value = brl(row.price); return; } if (v !== row.price) update(row.id, { price: v }); }}
                      className="w-20 px-2 py-1 text-sm font-mono font-bold border border-stone-200 rounded-md outline-none focus:border-[#083d07]" />
                  </div>
                </td>
                <td className="py-2.5 px-3">
                  <div className="flex gap-1.5">
                    {PLACES.map((p) => {
                      const on = placesOf(row.categories).includes(p.key);
                      return (
                        <button key={p.key} type="button" onClick={() => togglePlace(row, p.key)}
                          className={`px-2.5 py-1 rounded-md text-[11px] font-bold border transition-colors cursor-pointer flex items-center gap-1 ${on ? 'bg-[#083d07] text-[#fdfbf7] border-[#083d07]' : 'bg-white text-stone-500 border-stone-200'}`}>
                          {on && <Check size={11} />}{p.label}
                        </button>
                      );
                    })}
                  </div>
                </td>
                <td className="py-2.5 px-3 text-center">
                  {savingId === row.id ? <Loader2 size={16} className="animate-spin text-stone-400 inline" /> : <Switch row={row} />}
                </td>
                <td className="py-2.5 px-3 text-right">
                  <button type="button" onClick={() => remove(row)} className="p-1.5 text-stone-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer" title="Excluir">
                    <Trash2 size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && <p className="text-center py-8 text-sm text-stone-500">Nenhum adicional cadastrado ainda.</p>}
      </div>
    </div>
  );
}
