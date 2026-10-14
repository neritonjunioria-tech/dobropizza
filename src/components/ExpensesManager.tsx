import React, { useState, useMemo, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { 
  Plus, Trash2, Calendar, CreditCard, Wallet, 
  Search, Check, AlertCircle, X, CheckCircle2,
  RotateCcw, ArrowUpDown, Printer, ChevronDown, 
  Building, DollarSign, Smartphone, TrendingDown
} from 'lucide-react';

export interface Expense {
  id: number | string;
  description: string;
  amount: number;
  category: string;
  payment_method: string;
  created_at: string;
}

interface ExpensesManagerProps {
  expenses: Expense[];
  onExpenseChange: () => void;
}

const DEFAULT_CATEGORIES = [
  'Fornecedores & Insumos',
  'Salários & Equipe',
  'Água, Luz, Gás & Net',
  'Aluguel / Renda',
  'Embalagens & Descartáveis',
  'Marketing & Anúncios',
  'Manutenção & Equipamentos',
  'Impostos & Taxas',
  'Outros Gastos'
];

const SUGGESTIONS = [
  { label: 'Queijo Mozzarella', cat: 'Fornecedores & Insumos' },
  { label: 'Farinha de Trigo', cat: 'Fornecedores & Insumos' },
  { label: 'Molho de Tomate', cat: 'Fornecedores & Insumos' },
  { label: 'Caixas de Pizza 8 Fatias', cat: 'Embalagens & Descartáveis' },
  { label: 'Conta de Energia (Luz)', cat: 'Água, Luz, Gás & Net' },
  { label: 'Gás de Cozinha', cat: 'Água, Luz, Gás & Net' },
  { label: 'Diária / Freelancer', cat: 'Salários & Equipe' },
  { label: 'Hortifruti & Verduras', cat: 'Fornecedores & Insumos' },
  { label: 'Bebidas & Refrigerantes', cat: 'Fornecedores & Insumos' },
];

const PAYMENT_METHODS = [
  { id: 'Dinheiro', label: 'Dinheiro', icon: DollarSign },
  { id: 'Pix', label: 'Pix', icon: Smartphone },
  { id: 'Cartão', label: 'Cartão (maquininha)', icon: CreditCard },
  { id: 'Transferência', label: 'Transferência', icon: Building }
];

type PeriodFilterType = 'todos' | 'hoje' | 'ontem' | '7dias' | '30dias' | 'este_mes' | 'mes_passado' | 'custom';
type SortOptionType = 'date_desc' | 'date_asc' | 'amount_desc' | 'amount_asc' | 'desc_asc';

const PERIOD_OPTIONS: { id: PeriodFilterType; label: string }[] = [
  { id: 'todos', label: 'Todos os períodos' },
  { id: 'hoje', label: 'Hoje' },
  { id: 'ontem', label: 'Ontem' },
  { id: '7dias', label: 'Últimos 7 dias' },
  { id: '30dias', label: 'Últimos 30 dias' },
  { id: 'este_mes', label: 'Este mês' },
  { id: 'mes_passado', label: 'Mês passado' },
  { id: 'custom', label: 'Personalizado' },
];

export default function ExpensesManager({ expenses = [], onExpenseChange }: ExpensesManagerProps) {
  // Form States
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState(DEFAULT_CATEGORIES[0]);
  const [isCustomCategory, setIsCustomCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Dinheiro');
  const [autoSangria, setAutoSangria] = useState(true);
  const [expenseDate, setExpenseDate] = useState(() => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  });
  
  // Filter & Search States
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodFilterType>('todos');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('all');
  const [sortBy, setSortBy] = useState<SortOptionType>('date_desc');

  // Period Popover Dropdown State
  const [isPeriodOpen, setIsPeriodOpen] = useState(false);
  const periodPopoverRef = useRef<HTMLDivElement>(null);

  // Close period popover when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (periodPopoverRef.current && !periodPopoverRef.current.contains(e.target as Node)) {
        setIsPeriodOpen(false);
      }
    };
    if (isPeriodOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isPeriodOpen]);

  // UI state
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<number | string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const descInputRef = useRef<HTMLInputElement>(null);

  // Auto-dismiss feedback message
  useEffect(() => {
    if (feedback) {
      const timer = setTimeout(() => setFeedback(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [feedback]);

  // Focus description input when form opens
  useEffect(() => {
    if (isFormOpen) {
      setTimeout(() => descInputRef.current?.focus(), 150);
    }
  }, [isFormOpen]);

  // Combine default categories with custom categories already recorded in expenses
  const allCategories = useMemo(() => {
    const existing = new Set<string>(DEFAULT_CATEGORIES);
    expenses.forEach(e => {
      if (e.category && e.category.trim()) {
        existing.add(e.category.trim());
      }
    });
    return Array.from(existing);
  }, [expenses]);

  // Distinct payment methods available
  const availablePaymentMethods = useMemo(() => {
    const methods = new Set<string>(['Dinheiro', 'Pix', 'Cartão', 'Transferência']);
    expenses.forEach(e => {
      if (e.payment_method && e.payment_method.trim()) {
        methods.add(e.payment_method.trim());
      }
    });
    return Array.from(methods);
  }, [expenses]);

  // Safe Date parsing helper
  const parseExpenseDate = (dateStr: string | Date | undefined): Date | null => {
    if (!dateStr) return null;
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? null : d;
  };

  // Filtered & Sorted expenses list
  const filteredExpenses = useMemo(() => {
    const getLocalDateStr = (dateObj: Date): string => {
      const y = dateObj.getFullYear();
      const m = String(dateObj.getMonth() + 1).padStart(2, '0');
      const d = String(dateObj.getDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    };

    const now = new Date();
    const todayStr = getLocalDateStr(now);

    // Yesterday string
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    const yesterdayStr = getLocalDateStr(yesterday);

    // 7 days ago
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(now.getDate() - 6);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    // 30 days ago
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(now.getDate() - 29);
    thirtyDaysAgo.setHours(0, 0, 0, 0);

    // Month calculations
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;

    const filtered = expenses.filter(exp => {
      // 1. Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesDesc = (exp.description || '').toLowerCase().includes(q);
        const matchesCat = (exp.category || '').toLowerCase().includes(q);
        const matchesPay = (exp.payment_method || '').toLowerCase().includes(q);
        const matchesAmt = String(exp.amount || '').includes(q);
        if (!matchesDesc && !matchesCat && !matchesPay && !matchesAmt) {
          return false;
        }
      }

      // 2. Category Filter
      if (selectedCategory !== 'all' && exp.category !== selectedCategory) {
        return false;
      }

      // 3. Payment Method Filter
      if (selectedPaymentMethod !== 'all' && exp.payment_method !== selectedPaymentMethod) {
        return false;
      }

      // 4. Period Filter
      if (selectedPeriod !== 'todos') {
        const d = parseExpenseDate(exp.created_at);
        if (!d) return false;

        const expDateStr = getLocalDateStr(d);

        if (selectedPeriod === 'hoje') {
          if (expDateStr !== todayStr) return false;
        } else if (selectedPeriod === 'ontem') {
          if (expDateStr !== yesterdayStr) return false;
        } else if (selectedPeriod === '7dias') {
          if (d < sevenDaysAgo) return false;
        } else if (selectedPeriod === '30dias') {
          if (d < thirtyDaysAgo) return false;
        } else if (selectedPeriod === 'este_mes') {
          if (d.getMonth() !== currentMonth || d.getFullYear() !== currentYear) return false;
        } else if (selectedPeriod === 'mes_passado') {
          if (d.getMonth() !== lastMonth || d.getFullYear() !== lastMonthYear) return false;
        } else if (selectedPeriod === 'custom') {
          if (customStartDate) {
            const start = new Date(`${customStartDate}T00:00:00`);
            if (d < start) return false;
          }
          if (customEndDate) {
            const end = new Date(`${customEndDate}T23:59:59.999`);
            if (d > end) return false;
          }
        }
      }

      return true;
    });

    // 5. Sorting
    return filtered.sort((a, b) => {
      const dateA = new Date(a.created_at).getTime() || 0;
      const dateB = new Date(b.created_at).getTime() || 0;
      const amtA = Number(a.amount) || 0;
      const amtB = Number(b.amount) || 0;

      if (sortBy === 'date_desc') return dateB - dateA;
      if (sortBy === 'date_asc') return dateA - dateB;
      if (sortBy === 'amount_desc') return amtB - amtA;
      if (sortBy === 'amount_asc') return amtA - amtB;
      if (sortBy === 'desc_asc') return (a.description || '').localeCompare(b.description || '');
      return dateB - dateA;
    });
  }, [expenses, searchQuery, selectedCategory, selectedPaymentMethod, selectedPeriod, customStartDate, customEndDate, sortBy]);

  // Financial Stats
  const filteredTotalAmount = useMemo(() => {
    return filteredExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  }, [filteredExpenses]);

  const topCategory = useMemo(() => {
    if (filteredExpenses.length === 0) return { name: 'Nenhuma', amount: 0, percent: 0 };
    const counts: Record<string, number> = {};
    filteredExpenses.forEach(e => {
      const cat = e.category || 'Outros Gastos';
      counts[cat] = (counts[cat] || 0) + (Number(e.amount) || 0);
    });
    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    if (sorted.length > 0) {
      const topAmt = sorted[0][1];
      const pct = filteredTotalAmount > 0 ? (topAmt / filteredTotalAmount) * 100 : 0;
      return { name: sorted[0][0], amount: topAmt, percent: pct };
    }
    return { name: 'Nenhuma', amount: 0, percent: 0 };
  }, [filteredExpenses, filteredTotalAmount]);

  const topPaymentMethod = useMemo(() => {
    if (filteredExpenses.length === 0) return { name: 'Nenhum', count: 0, amount: 0 };
    const counts: Record<string, { count: number; amount: number }> = {};
    filteredExpenses.forEach(e => {
      const pay = e.payment_method || 'Dinheiro';
      if (!counts[pay]) counts[pay] = { count: 0, amount: 0 };
      counts[pay].count += 1;
      counts[pay].amount += Number(e.amount) || 0;
    });
    const sorted = Object.entries(counts).sort((a, b) => b[1].amount - a[1].amount);
    if (sorted.length > 0) {
      return { name: sorted[0][0], count: sorted[0][1].count, amount: sorted[0][1].amount };
    }
    return { name: 'Nenhum', count: 0, amount: 0 };
  }, [filteredExpenses]);

  const averageExpense = useMemo(() => {
    if (filteredExpenses.length === 0) return 0;
    return filteredTotalAmount / filteredExpenses.length;
  }, [filteredExpenses, filteredTotalAmount]);

  const hasActiveFilters = useMemo(() => {
    return (
      selectedPeriod !== 'todos' ||
      selectedCategory !== 'all' ||
      selectedPaymentMethod !== 'all' ||
      searchQuery.trim() !== ''
    );
  }, [selectedPeriod, selectedCategory, selectedPaymentMethod, searchQuery]);

  const handleResetFilters = () => {
    setSelectedPeriod('todos');
    setSelectedCategory('all');
    setSelectedPaymentMethod('all');
    setSearchQuery('');
    setCustomStartDate('');
    setCustomEndDate('');
    setSortBy('date_desc');
  };

  const getPeriodLabel = () => {
    switch (selectedPeriod) {
      case 'hoje': return 'Hoje';
      case 'ontem': return 'Ontem';
      case '7dias': return 'Últimos 7 dias';
      case '30dias': return 'Últimos 30 dias';
      case 'este_mes': return 'Este mês';
      case 'mes_passado': return 'Mês passado';
      case 'custom': {
        if (customStartDate && customEndDate) {
          const formatD = (iso: string) => {
            const parts = iso.split('-');
            return parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : iso;
          };
          return `${formatD(customStartDate)} — ${formatD(customEndDate)}`;
        }
        if (customStartDate) return `A partir de ${customStartDate}`;
        if (customEndDate) return `Até ${customEndDate}`;
        return 'Personalizado';
      }
      default: return 'Todos os períodos';
    }
  };

  const handlePrintExpenses = () => {
    window.print();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) {
      setFeedback({ type: 'error', message: 'A descrição da despesa é obrigatória.' });
      return;
    }
    const numAmount = parseFloat(amount.replace(',', '.'));
    if (isNaN(numAmount) || numAmount <= 0) {
      setFeedback({ type: 'error', message: 'Informe um valor numérico válido maior que zero.' });
      return;
    }

    const finalCategory = isCustomCategory ? newCategoryName.trim() : category;
    if (!finalCategory) {
      setFeedback({ type: 'error', message: 'Selecione ou informe uma categoria válida.' });
      return;
    }

    setSubmitting(true);
    try {
      const dateParts = expenseDate.split('-');
      const createdDate = new Date(Number(dateParts[0]), Number(dateParts[1]) - 1, Number(dateParts[2]), 12, 0, 0);

      const { error } = await supabase.from('expenses').insert({
        description: description.trim(),
        amount: Number(numAmount.toFixed(2)),
        category: finalCategory,
        payment_method: paymentMethod,
        created_at: createdDate.toISOString()
      });

      if (error) throw error;

      let sangriaPerformed = false;
      if (paymentMethod === 'Dinheiro' && autoSangria) {
        try {
          const { data: openSession } = await supabase
            .from('cash_sessions')
            .select('id')
            .eq('status', 'aberto')
            .order('opened_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          if (openSession) {
            const { data: userData } = await supabase.auth.getUser();
            const newMovement = {
              id: `mov-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
              session_id: openSession.id,
              type: 'sangria',
              amount: Number(numAmount.toFixed(2)),
              reason: `Despesa: ${description.trim()} (${finalCategory})`,
              created_by: userData?.user?.id || null,
              created_at: new Date().toISOString()
            };

            const { error: movErr } = await supabase.from('cash_movements').insert([newMovement]);
            if (!movErr) {
              sangriaPerformed = true;
            } else {
              const { data: settingRow } = await supabase
                .from('settings')
                .select('value')
                .eq('key', `cash_movements_${openSession.id}`)
                .maybeSingle();

              let currentList: any[] = [];
              try {
                if (settingRow?.value) currentList = JSON.parse(settingRow.value);
              } catch (e) {}
              currentList.unshift(newMovement);

              const { error: setErr } = await supabase.from('settings').upsert({
                key: `cash_movements_${openSession.id}`,
                value: JSON.stringify(currentList),
                updated_at: new Date().toISOString()
              }, { onConflict: 'key' });

              if (!setErr) sangriaPerformed = true;
            }
          }
        } catch (sangriaErr) {
          console.warn('Não foi possível registrar sangria automática para a despesa:', sangriaErr);
        }
      }

      setFeedback({ 
        type: 'success', 
        message: sangriaPerformed 
          ? 'Despesa registrada e sangria realizada no caixa aberto!' 
          : 'Despesa registrada com sucesso!' 
      });
      setDescription('');
      setAmount('');
      setIsCustomCategory(false);
      setNewCategoryName('');
      setIsFormOpen(false);
      onExpenseChange();
    } catch (err: any) {
      console.error('Erro ao lançar despesa:', err);
      setFeedback({ type: 'error', message: 'Erro ao salvar despesa: ' + (err.message || String(err)) });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number | string) => {
    if (!window.confirm('Tem certeza que deseja excluir esta despesa permanentemente?')) {
      return;
    }

    setDeletingId(id);
    try {
      const { error } = await supabase.from('expenses').delete().eq('id', id);
      if (error) throw error;
      setFeedback({ type: 'success', message: 'Despesa excluída com sucesso.' });
      onExpenseChange();
    } catch (err: any) {
      console.error('Erro ao excluir despesa:', err);
      setFeedback({ type: 'error', message: 'Erro ao excluir: ' + (err.message || String(err)) });
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="max-w-7xl mx-auto font-sans h-full flex flex-col pt-1">
      
      {/* CABEÇALHO REFINADO */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-stone-200/80 shrink-0">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-stone-900 flex items-center gap-2">
            Despesas &amp; Saídas
          </h1>
          <p className="text-xs text-stone-500 mt-0.5 max-w-2xl">
            Lançamento e controle de custos operacionais e contas a pagar.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          {filteredExpenses.length > 0 && (
            <button
              onClick={handlePrintExpenses}
              title="Imprimir extrato de despesas"
              className="inline-flex items-center gap-1.5 h-9 px-3.5 bg-white hover:bg-stone-50 text-stone-700 border border-stone-200 rounded-lg text-xs font-semibold transition-colors shadow-2xs"
            >
              <Printer size={14} className="text-stone-500" />
              <span>Imprimir</span>
            </button>
          )}
        </div>
      </div>

      {/* FEEDBACK NOTIFICATION */}
      {feedback && (
        <div className={`mt-3 p-3 rounded-lg text-xs font-medium flex items-center gap-2.5 border shadow-2xs transition-all shrink-0 ${
          feedback.type === 'success' 
            ? 'bg-emerald-50 text-emerald-900 border-emerald-200' 
            : 'bg-rose-50 text-rose-900 border-rose-200'
        }`}>
          {feedback.type === 'success' ? (
            <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle size={16} className="text-rose-600 shrink-0" />
          )}
          <span className="flex-1">{feedback.message}</span>
          <button onClick={() => setFeedback(null)} className="text-stone-400 hover:text-stone-700">
            <X size={14} />
          </button>
        </div>
      )}

      {/* 3-COLUMN COCKPIT LAYOUT */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 mt-4 flex-1 min-h-0">
        
        {/* COLUNA ESQUERDA: KPIs & Formulário (Fixo) */}
        <div className="lg:col-span-4 flex flex-col gap-4 overflow-y-auto pr-1 pb-4">
          
          {/* KPIs Grid */}
          <div className="grid grid-cols-2 gap-3 shrink-0">
            {/* Total */}
            <div className="bg-[#e5ddd4] text-[#44210f] rounded-xl p-4 shadow-xs flex flex-col justify-between col-span-2">
              <div className="flex items-start justify-between">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-[#745240]">Total</span>
                <span className="text-[10px] text-[#8a6f5c]">{filteredExpenses.length} {filteredExpenses.length === 1 ? 'saída' : 'saídas'}</span>
              </div>
              <p className="text-2xl font-bold tracking-tight text-[#44210f] mt-1 tabular-nums">
                R$ {filteredTotalAmount.toFixed(2)}
              </p>
            </div>
            
            {/* Maior Categoria */}
            <div className="bg-[#e5ddd4] text-[#44210f] rounded-xl p-3 border border-[#d3c8bb] shadow-2xs flex flex-col justify-between">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-[#8a6f5c] mb-1">Maior Cat.</span>
              <p className="text-sm font-bold tracking-tight truncate text-[#44210f]" title={topCategory.name}>
                {topCategory.name}
              </p>
              <span className="text-[10px] text-amber-700 font-medium tabular-nums mt-1">R$ {topCategory.amount.toFixed(2)}</span>
            </div>

            {/* Média */}
            <div className="bg-[#e5ddd4] text-[#44210f] rounded-xl p-3 border border-[#d3c8bb] shadow-2xs flex flex-col justify-between">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-[#8a6f5c] mb-1">Ticket Médio</span>
              <p className="text-sm font-bold tracking-tight text-[#44210f] tabular-nums">
                R$ {averageExpense.toFixed(2)}
              </p>
              <span className="text-[10px] text-[#8a6f5c] font-medium tabular-nums mt-1">por despesa</span>
            </div>
          </div>

          {/* Formulário Permanente */}
          <div className="bg-white rounded-xl border border-stone-200 shadow-xs flex flex-col shrink-0">
            <div className="p-4 border-b border-stone-100 bg-stone-50/50 rounded-t-xl">
              <h2 className="text-sm font-bold text-stone-900 flex items-center gap-1.5">
                <Plus size={15} className="text-amber-500" /> Nova Despesa
              </h2>
            </div>

            <form onSubmit={handleSubmit} className="p-4 space-y-3.5 flex-1">
              
              {/* Sugestões Rápidas */}
              <div className="pb-3 border-b border-stone-100">
                <span className="block text-[10px] font-semibold text-stone-500 uppercase tracking-wider mb-2">Sugestões Rápidas</span>
                <div className="flex flex-wrap gap-1.5">
                  {SUGGESTIONS.slice(0, 5).map(sug => (
                    <button
                      key={sug.label}
                      type="button"
                      onClick={() => {
                        setDescription(sug.label);
                        setCategory(sug.cat);
                        setIsCustomCategory(false);
                      }}
                      className="px-2 py-1 text-[10px] font-medium rounded bg-stone-100 hover:bg-stone-200 text-stone-700 transition-colors"
                    >
                      {sug.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Descrição */}
              <div className="space-y-1">
                <label className="block text-[11px] font-semibold text-stone-700">Descrição / Fornecedor *</label>
                <input
                  ref={descInputRef}
                  type="text"
                  required
                  placeholder="Ex: Fornecedor de Queijo"
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  className="w-full h-9 px-3 bg-stone-50 border border-stone-200 rounded-md text-xs font-medium text-stone-900 placeholder:text-stone-400 focus:bg-white focus:border-[#083d07] focus:ring-1 focus:ring-[#083d07] outline-none transition-all"
                />
              </div>

              {/* Valor & Data */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-[11px] font-semibold text-stone-700">Valor (R$) *</label>
                  <div className="relative">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-stone-400">R$</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      required
                      placeholder="0.00"
                      value={amount}
                      onChange={e => setAmount(e.target.value)}
                      className="w-full h-9 pl-6 pr-2 bg-stone-50 border border-stone-200 rounded-md text-xs font-bold text-stone-900 tabular-nums focus:bg-white focus:border-[#083d07] focus:ring-1 focus:ring-[#083d07] outline-none transition-all"
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="block text-[11px] font-semibold text-stone-700">Data *</label>
                  <input
                    type="date"
                    required
                    value={expenseDate}
                    onChange={e => setExpenseDate(e.target.value)}
                    className="w-full h-9 px-2 bg-stone-50 border border-stone-200 rounded-md text-xs font-medium text-stone-900 focus:bg-white focus:border-[#083d07] focus:ring-1 focus:ring-[#083d07] outline-none transition-all"
                  />
                </div>
              </div>

              {/* Categoria */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="block text-[11px] font-semibold text-stone-700">Categoria *</label>
                  <button
                    type="button"
                    onClick={() => setIsCustomCategory(!isCustomCategory)}
                    className="text-[10px] font-semibold text-amber-700 hover:underline"
                  >
                    {isCustomCategory ? 'Escolher existente' : '+ Nova'}
                  </button>
                </div>
                {isCustomCategory ? (
                  <input
                    type="text"
                    required
                    placeholder="Nova categoria..."
                    value={newCategoryName}
                    onChange={e => setNewCategoryName(e.target.value)}
                    className="w-full h-9 px-3 bg-stone-50 border border-stone-200 rounded-md text-xs font-medium text-stone-900 focus:bg-white focus:border-[#083d07] outline-none"
                  />
                ) : (
                  <select
                    value={category}
                    onChange={e => setCategory(e.target.value)}
                    className="w-full h-9 px-2 bg-stone-50 border border-stone-200 rounded-md text-xs font-medium text-stone-900 focus:bg-white focus:border-[#083d07] outline-none"
                  >
                    {allCategories.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                )}
              </div>

              {/* Meio de Pagamento */}
              <div className="space-y-1.5">
                <label className="block text-[11px] font-semibold text-stone-700">Meio de Pagamento *</label>
                <div className="grid grid-cols-2 gap-2">
                  {PAYMENT_METHODS.map(pm => {
                    const isSelected = paymentMethod === pm.id;
                    const Icon = pm.icon;
                    return (
                      <button
                        key={pm.id}
                        type="button"
                        onClick={() => setPaymentMethod(pm.id)}
                        className={`h-8 flex items-center justify-center gap-1.5 rounded text-[11px] font-semibold transition-all border ${
                          isSelected 
                            ? 'bg-[#083d07] text-white border-[#083d07]' 
                            : 'bg-white text-stone-700 border-stone-200 hover:bg-stone-50'
                        }`}
                      >
                        <Icon size={12} className={isSelected ? 'text-amber-400' : 'text-stone-400'} />
                        <span className="truncate">{pm.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Auto-Sangria Toggle */}
              {paymentMethod === 'Dinheiro' && (
                <div className="flex items-center justify-between p-2.5 rounded bg-amber-50/50 border border-amber-200/60">
                  <div className="flex items-center gap-2">
                    <Wallet size={14} className="text-amber-600 shrink-0" />
                    <span className="text-[11px] font-semibold text-stone-900 leading-tight">
                      Descontar do Caixa<br/>
                      <span className="text-[9px] text-stone-500 font-normal">Registra como sangria</span>
                    </span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={autoSangria}
                      onChange={e => setAutoSangria(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-8 h-4 bg-stone-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-amber-500"></div>
                  </label>
                </div>
              )}

              {/* Botão de Salvar */}
              <div className="pt-3 border-t border-stone-100">
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full h-10 bg-[#083d07] hover:bg-[#0b520a] disabled:opacity-50 text-[#fdfbf7] font-bold text-xs rounded-lg transition-all shadow-xs border border-[#d5af7a]/60 flex items-center justify-center gap-1.5"
                >
                  <Plus size={14} className="stroke-[2.5]" />
                  <span>{submitting ? 'Salvando...' : 'Confirmar Lançamento'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* COLUNA DIREITA: Filtros e Tabela (Extrato) */}
        <div className="lg:col-span-8 flex flex-col h-[calc(100vh-140px)] min-h-[500px]">
          
          {/* BARRA DE FILTROS CONDENSADA */}
          <div className="bg-white rounded-t-xl border border-stone-200 border-b-0 p-3 shrink-0 flex flex-wrap items-center gap-2.5">
            
            {/* Busca Principal */}
            <div className="flex-1 min-w-[200px] relative">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-stone-400" />
              <input
                type="text"
                placeholder="Buscar descrição ou fornecedor..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full h-8 pl-8 pr-7 bg-stone-50 border border-stone-200 focus:bg-white rounded text-xs font-medium text-stone-900 placeholder:text-stone-400 focus:border-[#083d07] focus:ring-1 focus:ring-[#083d07] outline-none transition-colors"
              />
              {searchQuery && (
                <button 
                  onClick={() => setSearchQuery('')} 
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700"
                >
                  <X size={13} />
                </button>
              )}
            </div>

            {/* Categorias */}
            <div className="w-36 relative shrink-0">
              <select
                value={selectedCategory}
                onChange={e => setSelectedCategory(e.target.value)}
                className={`w-full h-8 px-2.5 border rounded text-[11px] font-medium focus:border-[#083d07] outline-none transition-colors appearance-none pr-6 ${
                  selectedCategory !== 'all' ? 'border-amber-400 bg-amber-50 text-stone-900' : 'bg-white border-stone-200'
                }`}
              >
                <option value="all">Todas as cats.</option>
                {allCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
              </select>
              <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" />
            </div>

            {/* Período */}
            <div className="w-36 relative shrink-0" ref={periodPopoverRef}>
              <button
                type="button"
                onClick={() => setIsPeriodOpen(!isPeriodOpen)}
                className={`w-full h-8 px-2.5 border rounded text-[11px] font-medium flex items-center justify-between gap-1 transition-colors ${
                  selectedPeriod !== 'todos' ? 'border-amber-400 bg-amber-50 text-stone-900' : 'bg-white border-stone-200'
                }`}
              >
                <span className="truncate">{getPeriodLabel()}</span>
                <Calendar size={12} className={selectedPeriod !== 'todos' ? 'text-amber-600' : 'text-stone-400'} />
              </button>

              {isPeriodOpen && (
                <div className="absolute right-0 mt-1 w-64 bg-white rounded-lg border border-stone-200 shadow-lg z-30 p-2 animate-in fade-in">
                  <div className="px-2 py-1 text-[10px] font-bold text-stone-400 uppercase tracking-wider mb-1">Período</div>
                  {PERIOD_OPTIONS.map(opt => (
                    <button
                      key={opt.id}
                      onClick={() => { setSelectedPeriod(opt.id); if(opt.id !== 'custom') setIsPeriodOpen(false); }}
                      className={`w-full text-left px-2 py-1.5 rounded text-xs font-medium ${selectedPeriod === opt.id ? 'bg-stone-100 text-stone-900' : 'text-stone-600 hover:bg-stone-50'}`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

          </div>

          {/* TABELA COM ROLAGEM INDEPENDENTE */}
          <div className="bg-white rounded-b-xl border border-stone-200 shadow-sm flex-1 flex flex-col min-h-0 overflow-hidden relative">
            <div className="flex-1 overflow-y-auto">
              <table className="w-full text-left border-collapse min-w-[600px]">
                <thead className="bg-stone-50 text-stone-500 uppercase text-[10px] font-bold tracking-wider sticky top-0 z-10 shadow-sm">
                  <tr>
                    <th className="px-4 py-2.5 font-semibold">Data</th>
                    <th className="px-4 py-2.5 font-semibold">Descrição</th>
                    <th className="px-4 py-2.5 font-semibold">Categoria</th>
                    <th className="px-4 py-2.5 font-semibold text-right">Valor</th>
                    <th className="px-4 py-2.5 font-semibold text-center w-12"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 text-[11px] font-medium text-stone-700">
                  {filteredExpenses.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-0">
                        {/* ONBOARDING: EMPTY STATE */}
                        <div className="flex flex-col items-center justify-center p-12 text-center h-[300px]">
                          <div className="w-12 h-12 bg-amber-50 rounded-xl flex items-center justify-center mb-4 border border-amber-100 shadow-sm">
                            <TrendingDown size={20} className="text-amber-500" />
                          </div>
                          <h3 className="text-sm font-bold text-stone-900 mb-1">
                            {hasActiveFilters ? 'Nenhuma despesa nos filtros' : 'Nenhuma despesa registrada'}
                          </h3>
                          <p className="text-xs text-stone-500 max-w-[260px] mb-4 leading-relaxed">
                            {hasActiveFilters 
                              ? 'Tente remover alguns filtros para encontrar o que procura.' 
                              : 'Controle seus custos operacionais para visualizar seu lucro real com precisão.'}
                          </p>
                          {hasActiveFilters ? (
                            <button
                              onClick={handleResetFilters}
                              className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-lg text-xs font-semibold transition-colors shadow-xs border border-stone-200"
                            >
                              Limpar Filtros
                            </button>
                          ) : (
                            <div className="text-[10px] font-semibold text-amber-700 bg-amber-50 px-3 py-1.5 rounded-full border border-amber-200 flex items-center gap-1.5 shadow-xs">
                              <span>⬅</span> Utilize o formulário ao lado para começar
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredExpenses.map((exp) => {
                      const d = new Date(exp.created_at);
                      const formattedDate = !isNaN(d.getTime()) ? d.toLocaleDateString('pt-BR').slice(0, 5) : '-';
                      const isBeingDeleted = deletingId === exp.id;

                      return (
                        <tr key={exp.id} className="hover:bg-stone-50/80 transition-colors group">
                          <td className="px-4 py-3 text-stone-500 tabular-nums">{formattedDate}</td>
                          <td className="px-4 py-3 font-semibold text-stone-900">
                            {exp.description}
                            <div className="text-[9px] text-stone-400 font-normal mt-0.5">{exp.payment_method}</div>
                          </td>
                          <td className="px-4 py-3">
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold bg-stone-100 border border-stone-200 text-stone-600">
                              {exp.category || 'Outros'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right font-bold text-stone-900 tabular-nums">
                            R$ {Number(exp.amount || 0).toFixed(2)}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <button
                              onClick={() => handleDelete(exp.id)}
                              disabled={isBeingDeleted}
                              className="p-1.5 text-stone-400 hover:text-rose-700 hover:bg-rose-100 rounded transition-colors disabled:opacity-30"
                              title="Excluir despesa"
                            >
                              <Trash2 size={13} />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* RODAPÉ DO EXTRATO */}
            {filteredExpenses.length > 0 && (
              <div className="bg-stone-50 border-t border-stone-200 p-3 shrink-0 flex items-center justify-between text-xs font-semibold text-stone-700">
                <span>Total Filtrado ({filteredExpenses.length})</span>
                <span className="text-stone-900 text-sm tabular-nums">R$ {filteredTotalAmount.toFixed(2)}</span>
              </div>
            )}
          </div>

        </div>

      </div>
    </div>
  );
}
