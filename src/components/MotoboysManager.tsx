import React, { useState, useEffect, useMemo } from 'react';
import {
  Bike, Plus, X, Check, AlertCircle, CheckCircle2, Edit2, Trash2,
  RefreshCw, Phone, Wallet, RotateCcw, Lock, Power
} from 'lucide-react';
import { startOfDay, endOfDay, subDays, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { supabase } from '../lib/supabase';
import { isOrderActive, normalizePaymentMethod } from '../utils/paymentAndOrderHelper';
import {
  DeliveryProvider,
  Motoboy,
  PROVIDER_LABELS,
  DELIVERY_PLATFORMS,
  getDeliveryResponsibleLabel,
  isMotoboySchemaMissing,
} from '../utils/motoboys';
import PeriodFilterCompact, { PeriodFilterOption } from './PeriodFilterCompact';
import MotoboyAssignModal from './MotoboyAssignModal';

interface DeliveryRow {
  id: number | string;
  customerName: string;
  paymentMethod: string;
  status: string;
  totalAmount: number;
  deliveryAddress: string;
  deliveryZone: string;
  createdAt: string;
  deliveryProvider: DeliveryProvider | null;
  motoboyId: string | null;
  deliveryCost: number;
  motoboySettlementId: string | null;
}

interface Settlement {
  id: string;
  motoboy_id: string;
  period_start: string | null;
  period_end: string | null;
  deliveries_count: number;
  deliveries_total: number;
  extra_amount: number;
  discount_amount: number;
  total_paid: number;
  cash_collected: number;
  notes: string | null;
  created_at: string;
}

interface MotoboysManagerProps {
  /** Chamado após qualquer alteração que afete os pedidos (vínculo / fechamento). */
  onChange?: () => void;
}

type SectionTab = 'entregas' | 'motoboys' | 'fechamentos';
type DeliveryFilter = 'todos' | 'sem' | DeliveryProvider;

const ORDER_COLUMNS =
  'id, customer_name, order_type, payment_method, status, total_amount, delivery_address, delivery_zone, created_at, delivery_provider, motoboy_id, delivery_cost, motoboy_settlement_id';

const formatMoney = (val: any): string => `€ ${(Number(val) || 0).toFixed(2)}`;

const formatDateTime = (iso?: string | null): string => {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  return `${d.toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit' })} ${d.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}`;
};

const formatDate = (iso?: string | null): string => {
  if (!iso) return '—';
  const d = new Date(iso);
  return isNaN(d.getTime()) ? '—' : d.toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

const getPeriodRange = (period: PeriodFilterOption, start: string, end: string): { from: Date | null; to: Date | null } => {
  const now = new Date();
  switch (period) {
    case 'hoje': return { from: startOfDay(now), to: endOfDay(now) };
    case 'ontem': return { from: startOfDay(subDays(now, 1)), to: endOfDay(subDays(now, 1)) };
    case '7dias': return { from: startOfDay(subDays(now, 6)), to: endOfDay(now) };
    case '30dias': return { from: startOfDay(subDays(now, 29)), to: endOfDay(now) };
    case 'mes': return { from: startOfMonth(now), to: endOfDay(now) };
    case 'mes_passado': return { from: startOfMonth(subMonths(now, 1)), to: endOfMonth(subMonths(now, 1)) };
    case 'customizado':
      if (start && end) return { from: new Date(`${start}T00:00:00`), to: new Date(`${end}T23:59:59`) };
      return { from: null, to: null };
    default: return { from: null, to: null };
  }
};

const mapOrderRow = (o: any): DeliveryRow => ({
  id: o.id,
  customerName: o.customer_name || 'Cliente Sem Nome',
  paymentMethod: o.payment_method || '',
  status: o.status || 'Pendente',
  totalAmount: Number(o.total_amount) || 0,
  deliveryAddress: o.delivery_address || '',
  deliveryZone: o.delivery_zone || '',
  createdAt: o.created_at,
  deliveryProvider: o.delivery_provider || null,
  motoboyId: o.motoboy_id || null,
  deliveryCost: Number(o.delivery_cost) || 0,
  motoboySettlementId: o.motoboy_settlement_id || null,
});

const parseMoneyInput = (val: string): number => {
  const num = parseFloat((val || '').replace(',', '.'));
  return isNaN(num) ? 0 : num;
};

const inputClass =
  'w-full h-9 px-3 bg-stone-50 border border-stone-200 rounded-md text-xs font-medium text-stone-900 placeholder:text-stone-400 focus:bg-white focus:border-stone-900 focus:ring-1 focus:ring-stone-900 outline-none transition-all';

export default function MotoboysManager({ onChange }: MotoboysManagerProps) {
  const [section, setSection] = useState<SectionTab>('entregas');
  const [period, setPeriod] = useState<PeriodFilterOption>('hoje');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  const [motoboys, setMotoboys] = useState<Motoboy[]>([]);
  const [deliveries, setDeliveries] = useState<DeliveryRow[]>([]);
  const [openDeliveries, setOpenDeliveries] = useState<DeliveryRow[]>([]);
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [loading, setLoading] = useState(true);
  const [needsSetup, setNeedsSetup] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const [deliveryFilter, setDeliveryFilter] = useState<DeliveryFilter>('todos');
  const [assigningOrder, setAssigningOrder] = useState<DeliveryRow | null>(null);

  // Cadastro de motoboy
  const [editingMotoboy, setEditingMotoboy] = useState<Motoboy | 'new' | null>(null);
  const [formName, setFormName] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formFee, setFormFee] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Fechamento
  const [settlingMotoboy, setSettlingMotoboy] = useState<Motoboy | null>(null);
  const [settleFrom, setSettleFrom] = useState('');
  const [settleTo, setSettleTo] = useState('');
  const [settleExtra, setSettleExtra] = useState('');
  const [settleDiscount, setSettleDiscount] = useState('');
  const [settleNotes, setSettleNotes] = useState('');

  const loadData = async (isBackground = false) => {
    if (!isBackground) setLoading(true);
    try {
      const { from, to } = getPeriodRange(period, customStart, customEnd);

      let periodQuery = supabase
        .from('orders')
        .select(ORDER_COLUMNS)
        .or('order_type.ilike.entrega,order_type.ilike.delivery')
        .order('created_at', { ascending: false });
      if (from) periodQuery = periodQuery.gte('created_at', from.toISOString());
      if (to) periodQuery = periodQuery.lte('created_at', to.toISOString());

      const [motoboysRes, periodRes, openRes, settlementsRes] = await Promise.all([
        supabase.from('motoboys').select('*').order('name', { ascending: true }),
        periodQuery,
        // Entregas de motoboy próprio ainda não fechadas (independente do período)
        supabase
          .from('orders')
          .select(ORDER_COLUMNS)
          .eq('delivery_provider', 'proprio')
          .is('motoboy_settlement_id', null)
          .order('created_at', { ascending: true }),
        supabase.from('motoboy_settlements').select('*').order('created_at', { ascending: false }).limit(200),
      ]);

      const firstError = motoboysRes.error || periodRes.error || openRes.error || settlementsRes.error;
      if (firstError) {
        if (isMotoboySchemaMissing(firstError)) {
          setNeedsSetup(true);
          return;
        }
        throw firstError;
      }

      setNeedsSetup(false);
      setMotoboys((motoboysRes.data || []).map((m: any) => ({ ...m, default_fee: Number(m.default_fee) || 0 })));
      setDeliveries((periodRes.data || []).map(mapOrderRow));
      setOpenDeliveries((openRes.data || []).map(mapOrderRow).filter(o => isOrderActive(o.status)));
      setSettlements(settlementsRes.data || []);
    } catch (err: any) {
      console.error('Erro ao carregar controle de motoboys:', err);
      setFeedback({ type: 'error', message: 'Erro ao carregar dados: ' + (err.message || String(err)) });
    } finally {
      if (!isBackground) setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [period, customStart, customEnd]);

  const refreshAll = () => {
    loadData(true);
    onChange?.();
  };

  // Entregas válidas do período (canceladas não geram custo)
  const activeDeliveries = useMemo(() => deliveries.filter(o => isOrderActive(o.status)), [deliveries]);

  const stats = useMemo(() => {
    const byProvider: Record<DeliveryProvider, { count: number; cost: number }> = {
      proprio: { count: 0, cost: 0 },
      uber: { count: 0, cost: 0 },
      ifood: { count: 0, cost: 0 },
    };
    let unassigned = 0;
    activeDeliveries.forEach(o => {
      if (!o.deliveryProvider || !byProvider[o.deliveryProvider]) {
        unassigned += 1;
        return;
      }
      byProvider[o.deliveryProvider].count += 1;
      byProvider[o.deliveryProvider].cost += o.deliveryCost;
    });
    const totalCost = byProvider.proprio.cost + byProvider.uber.cost + byProvider.ifood.cost;
    const assignedCount = byProvider.proprio.count + byProvider.uber.count + byProvider.ifood.count;
    return {
      byProvider,
      unassigned,
      totalCost,
      assignedCount,
      averageCost: assignedCount > 0 ? totalCost / assignedCount : 0,
    };
  }, [activeDeliveries]);

  const summarizeByMotoboy = (rows: DeliveryRow[]) => {
    const map: Record<string, { count: number; total: number }> = {};
    rows.forEach(o => {
      if (o.deliveryProvider !== 'proprio' || !o.motoboyId) return;
      if (!map[o.motoboyId]) map[o.motoboyId] = { count: 0, total: 0 };
      map[o.motoboyId].count += 1;
      map[o.motoboyId].total += o.deliveryCost;
    });
    return map;
  };

  const periodByMotoboy = useMemo(() => summarizeByMotoboy(activeDeliveries), [activeDeliveries]);
  const openByMotoboy = useMemo(() => summarizeByMotoboy(openDeliveries), [openDeliveries]);

  const filteredDeliveries = useMemo(() => {
    if (deliveryFilter === 'todos') return deliveries;
    if (deliveryFilter === 'sem') return deliveries.filter(o => !o.deliveryProvider && isOrderActive(o.status));
    return deliveries.filter(o => o.deliveryProvider === deliveryFilter);
  }, [deliveries, deliveryFilter]);

  const filteredSettlements = useMemo(() => {
    const { from, to } = getPeriodRange(period, customStart, customEnd);
    return settlements.filter(s => {
      const d = new Date(s.created_at);
      if (from && d < from) return false;
      if (to && d > to) return false;
      return true;
    });
  }, [settlements, period, customStart, customEnd]);

  // ---------------------------------------------------------------------------
  // Cadastro de motoboys
  // ---------------------------------------------------------------------------
  const openMotoboyForm = (motoboy: Motoboy | 'new') => {
    setEditingMotoboy(motoboy);
    if (motoboy === 'new') {
      setFormName('');
      setFormPhone('');
      setFormFee('');
      setFormNotes('');
    } else {
      setFormName(motoboy.name);
      setFormPhone(motoboy.phone || '');
      setFormFee(Number(motoboy.default_fee || 0).toFixed(2));
      setFormNotes(motoboy.notes || '');
    }
  };

  const handleSaveMotoboy = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) return;
    const fee = parseMoneyInput(formFee);
    if (fee < 0) {
      setFeedback({ type: 'error', message: 'O valor por entrega não pode ser negativo.' });
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        name: formName.trim(),
        phone: formPhone.trim() || null,
        default_fee: Number(fee.toFixed(2)),
        notes: formNotes.trim() || null,
      };
      const { error } =
        editingMotoboy && editingMotoboy !== 'new'
          ? await supabase.from('motoboys').update(payload).eq('id', editingMotoboy.id)
          : await supabase.from('motoboys').insert(payload);
      if (error) throw error;

      setFeedback({ type: 'success', message: editingMotoboy === 'new' ? 'Motoboy cadastrado com sucesso!' : 'Motoboy atualizado com sucesso!' });
      setEditingMotoboy(null);
      refreshAll();
    } catch (err: any) {
      console.error('Erro ao salvar motoboy:', err);
      setFeedback({ type: 'error', message: 'Erro ao salvar motoboy: ' + (err.message || String(err)) });
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleActive = async (motoboy: Motoboy) => {
    try {
      const { error } = await supabase.from('motoboys').update({ is_active: !motoboy.is_active }).eq('id', motoboy.id);
      if (error) throw error;
      refreshAll();
    } catch (err: any) {
      console.error('Erro ao alterar status do motoboy:', err);
      setFeedback({ type: 'error', message: 'Erro ao alterar motoboy: ' + (err.message || String(err)) });
    }
  };

  const handleDeleteMotoboy = async (motoboy: Motoboy) => {
    if (!window.confirm(`Tem certeza que deseja excluir o motoboy "${motoboy.name}"?`)) return;
    try {
      const { error } = await supabase.from('motoboys').delete().eq('id', motoboy.id);
      if (error) throw error;
      setFeedback({ type: 'success', message: 'Motoboy excluído com sucesso.' });
      refreshAll();
    } catch (err: any) {
      console.error('Erro ao excluir motoboy:', err);
      // 23503 = violação de chave estrangeira: já existem entregas ou fechamentos deste motoboy
      setFeedback({
        type: 'error',
        message: err?.code === '23503'
          ? `"${motoboy.name}" já tem entregas ou fechamentos registrados e não pode ser excluído. Desative-o para que deixe de aparecer no despacho.`
          : 'Erro ao excluir: ' + (err.message || String(err)),
      });
    }
  };

  // ---------------------------------------------------------------------------
  // Fechamento
  // ---------------------------------------------------------------------------
  const openSettlement = (motoboy: Motoboy) => {
    setSettlingMotoboy(motoboy);
    setSettleFrom('');
    setSettleTo('');
    setSettleExtra('');
    setSettleDiscount('');
    setSettleNotes('');
  };

  const settlementRows = useMemo(() => {
    if (!settlingMotoboy) return [];
    const from = settleFrom ? new Date(`${settleFrom}T00:00:00`) : null;
    const to = settleTo ? new Date(`${settleTo}T23:59:59`) : null;
    return openDeliveries.filter(o => {
      if (o.motoboyId !== settlingMotoboy.id) return false;
      const d = new Date(o.createdAt);
      if (from && d < from) return false;
      if (to && d > to) return false;
      return true;
    });
  }, [settlingMotoboy, openDeliveries, settleFrom, settleTo]);

  const settlementTotals = useMemo(() => {
    const deliveriesTotal = settlementRows.reduce((sum, o) => sum + o.deliveryCost, 0);
    const cashCollected = settlementRows
      .filter(o => normalizePaymentMethod(o.paymentMethod) === 'Numerário')
      .reduce((sum, o) => sum + o.totalAmount, 0);
    const extra = Math.max(0, parseMoneyInput(settleExtra));
    const discount = Math.max(0, parseMoneyInput(settleDiscount));
    return { deliveriesTotal, cashCollected, extra, discount, total: deliveriesTotal + extra - discount };
  }, [settlementRows, settleExtra, settleDiscount]);

  const handleConfirmSettlement = async () => {
    if (!settlingMotoboy) return;
    if (settlementRows.length === 0 && settlementTotals.extra === 0) {
      setFeedback({ type: 'error', message: 'Não há entregas em aberto para fechar neste intervalo.' });
      return;
    }
    if (!window.confirm(`Confirmar o fechamento de ${settlingMotoboy.name} no valor de ${formatMoney(settlementTotals.total)}?`)) return;

    setSubmitting(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const { data: created, error } = await supabase
        .from('motoboy_settlements')
        .insert({
          motoboy_id: settlingMotoboy.id,
          period_start: settlementRows.length > 0 ? settlementRows[0].createdAt : null,
          period_end: settlementRows.length > 0 ? settlementRows[settlementRows.length - 1].createdAt : null,
          deliveries_count: settlementRows.length,
          deliveries_total: Number(settlementTotals.deliveriesTotal.toFixed(2)),
          extra_amount: Number(settlementTotals.extra.toFixed(2)),
          discount_amount: Number(settlementTotals.discount.toFixed(2)),
          total_paid: Number(settlementTotals.total.toFixed(2)),
          cash_collected: Number(settlementTotals.cashCollected.toFixed(2)),
          notes: settleNotes.trim() || null,
          created_by: userData?.user?.id || null,
        })
        .select('id')
        .single();
      if (error) throw error;

      if (settlementRows.length > 0) {
        const { error: linkError } = await supabase
          .from('orders')
          .update({ motoboy_settlement_id: created.id })
          .in('id', settlementRows.map(o => o.id))
          .is('motoboy_settlement_id', null);
        if (linkError) {
          // Sem as entregas vinculadas o fechamento ficaria órfão e elas seriam pagas de novo
          await supabase.from('motoboy_settlements').delete().eq('id', created.id);
          throw linkError;
        }
      }

      setFeedback({ type: 'success', message: `Fechamento de ${settlingMotoboy.name} registrado: ${formatMoney(settlementTotals.total)}.` });
      setSettlingMotoboy(null);
      setSection('fechamentos');
      refreshAll();
    } catch (err: any) {
      console.error('Erro ao registrar fechamento:', err);
      setFeedback({ type: 'error', message: 'Erro ao registrar fechamento: ' + (err.message || String(err)) });
    } finally {
      setSubmitting(false);
    }
  };

  const handleUndoSettlement = async (settlement: Settlement) => {
    const name = motoboys.find(m => m.id === settlement.motoboy_id)?.name || 'motoboy';
    if (!window.confirm(`Desfazer o fechamento de ${name} (${formatMoney(settlement.total_paid)})? As entregas voltam a ficar em aberto.`)) return;
    try {
      const { error } = await supabase.from('motoboy_settlements').delete().eq('id', settlement.id);
      if (error) throw error;
      setFeedback({ type: 'success', message: 'Fechamento desfeito. As entregas voltaram a ficar em aberto.' });
      refreshAll();
    } catch (err: any) {
      console.error('Erro ao desfazer fechamento:', err);
      setFeedback({ type: 'error', message: 'Erro ao desfazer fechamento: ' + (err.message || String(err)) });
    }
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  const pillClass = (active: boolean) =>
    `px-3 py-1 rounded-lg text-xs font-mono font-bold transition-all shrink-0 cursor-pointer border flex items-center gap-1.5 ${
      active
        ? 'bg-stone-900 text-[#fdde58] border-stone-900 shadow-2xs font-black'
        : 'bg-white text-stone-600 border-stone-200 hover:bg-stone-50 hover:text-stone-900'
    }`;

  const providerBadgeClass = (provider: DeliveryProvider | null) =>
    provider === 'proprio'
      ? 'bg-stone-100 text-stone-800 border-stone-200'
      : provider === 'uber'
      ? 'bg-stone-900 text-white border-stone-900'
      : provider === 'ifood'
      ? 'bg-rose-50 text-rose-800 border-rose-200'
      : 'bg-amber-100 text-amber-900 border-amber-300';

  if (needsSetup) {
    return (
      <div className="max-w-3xl mx-auto font-sans pt-1">
        <div className="bg-amber-50 border border-amber-300 text-amber-950 rounded-xl p-5 text-sm flex items-start gap-3">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-amber-700" />
          <div className="space-y-1.5">
            <p className="font-bold">Falta ativar o controle de motoboys no banco de dados</p>
            <p className="text-xs leading-relaxed">
              No painel do Supabase, abra o <b>SQL Editor</b>, cole o conteúdo do arquivo{' '}
              <span className="font-mono font-bold">supabase/migrations/20261013000000_motoboys.sql</span> e clique em <b>Run</b>.
              Depois volte aqui e recarregue.
            </p>
            <button
              onClick={() => loadData()}
              className="mt-1 inline-flex items-center gap-1.5 h-8 px-3 bg-white hover:bg-stone-50 text-stone-800 border border-amber-300 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
            >
              <RefreshCw size={13} />
              <span>Verificar novamente</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto w-full font-sans pt-1 pb-6">
      {/* CABEÇALHO */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-stone-200/80">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-stone-900">Motoboys &amp; Entregas</h1>
          <p className="text-xs text-stone-500 mt-0.5 max-w-2xl">
            Vínculo das entregas, gastos por plataforma e fechamento dos motoboys próprios.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <PeriodFilterCompact
            value={period}
            startDate={customStart}
            endDate={customEnd}
            onChange={(v) => {
              setPeriod(v.period);
              setCustomStart(v.startDate || '');
              setCustomEnd(v.endDate || '');
            }}
          />
          <button
            onClick={() => loadData()}
            title="Atualizar"
            className="h-7 w-7 flex items-center justify-center bg-white hover:bg-stone-50 text-stone-600 border border-stone-200 rounded-lg transition-colors cursor-pointer shadow-2xs"
          >
            <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
          </button>
          <button
            onClick={() => openMotoboyForm('new')}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-[#fdde58] hover:bg-[#e2c23f] active:bg-[#d8ba39] text-stone-950 rounded-lg text-xs font-black font-mono tracking-wide shadow-xs transition-all cursor-pointer border border-[#d8ba39]"
          >
            <Plus size={15} className="stroke-[2.5]" />
            <span>NOVO MOTOBOY</span>
          </button>
        </div>
      </div>

      {/* FEEDBACK */}
      {feedback && (
        <div className={`mt-3 p-3 rounded-lg text-xs font-medium flex items-center gap-2.5 border shadow-2xs ${
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
          <button onClick={() => setFeedback(null)} className="text-stone-400 hover:text-stone-700 cursor-pointer">
            <X size={14} />
          </button>
        </div>
      )}

      {/* KPIs DO PERÍODO */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-4">
        <div className="bg-stone-950 text-white rounded-xl p-4 shadow-xs flex flex-col justify-between col-span-2 lg:col-span-1">
          <div className="flex items-start justify-between">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-stone-400">Gasto com entregas</span>
            <span className="text-[10px] text-stone-500">{stats.assignedCount} {stats.assignedCount === 1 ? 'entrega' : 'entregas'}</span>
          </div>
          <p className="text-2xl font-bold tracking-tight text-white mt-1 tabular-nums">{formatMoney(stats.totalCost)}</p>
          <span className="text-[10px] text-amber-400/90 font-medium tabular-nums mt-1">
            Média {formatMoney(stats.averageCost)} por entrega
          </span>
        </div>

        {(['proprio', ...DELIVERY_PLATFORMS] as DeliveryProvider[]).map(p => (
          <div key={p} className="bg-white rounded-xl p-4 border border-stone-200 shadow-2xs flex flex-col justify-between">
            <div className="flex items-start justify-between">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-stone-500">
                {p === 'proprio' ? 'Motoboys próprios' : PROVIDER_LABELS[p]}
              </span>
              <span className="text-[10px] text-stone-400 tabular-nums">
                {stats.byProvider[p].count} {stats.byProvider[p].count === 1 ? 'entrega' : 'entregas'}
              </span>
            </div>
            <p className="text-xl font-bold tracking-tight text-stone-900 mt-1 tabular-nums">{formatMoney(stats.byProvider[p].cost)}</p>
            <span className="text-[10px] text-stone-500 font-medium tabular-nums mt-1">
              {stats.totalCost > 0 ? `${((stats.byProvider[p].cost / stats.totalCost) * 100).toFixed(0)}% do gasto` : '—'}
            </span>
          </div>
        ))}
      </div>

      {stats.unassigned > 0 && (
        <button
          type="button"
          onClick={() => { setSection('entregas'); setDeliveryFilter('sem'); }}
          className="mt-3 w-full text-left bg-amber-50 border border-amber-300 px-3 py-2 rounded-lg text-xs font-bold text-amber-950 flex items-center gap-2 cursor-pointer hover:bg-amber-100 transition-colors"
        >
          <AlertCircle size={14} className="text-amber-700 shrink-0" />
          <span>
            {stats.unassigned} {stats.unassigned === 1 ? 'entrega do período está' : 'entregas do período estão'} sem motoboy vinculado. Clique para ver e vincular.
          </span>
        </button>
      )}

      {/* ABAS INTERNAS */}
      <div className="flex items-center gap-1.5 mt-4 overflow-x-auto pb-1">
        <button type="button" onClick={() => setSection('entregas')} className={pillClass(section === 'entregas')}>
          <span>Entregas</span>
          <span className="opacity-70 tabular-nums font-normal">({deliveries.length})</span>
        </button>
        <button type="button" onClick={() => setSection('motoboys')} className={pillClass(section === 'motoboys')}>
          <span>Motoboys</span>
          <span className="opacity-70 tabular-nums font-normal">({motoboys.length})</span>
        </button>
        <button type="button" onClick={() => setSection('fechamentos')} className={pillClass(section === 'fechamentos')}>
          <span>Fechamentos</span>
          <span className="opacity-70 tabular-nums font-normal">({filteredSettlements.length})</span>
        </button>
      </div>

      {/* ENTREGAS */}
      {section === 'entregas' && (
        <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-2xs space-y-3 mt-3">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            {([
              { id: 'todos', label: 'Todas' },
              { id: 'sem', label: `Sem motoboy (${stats.unassigned})` },
              { id: 'proprio', label: 'Próprios' },
              { id: 'uber', label: 'Uber' },
              { id: 'ifood', label: 'iFood' },
            ] as { id: DeliveryFilter; label: string }[]).map(f => (
              <button key={f.id} type="button" onClick={() => setDeliveryFilter(f.id)} className={pillClass(deliveryFilter === f.id)}>
                {f.label}
              </button>
            ))}
          </div>

          {filteredDeliveries.length === 0 ? (
            <div className="py-12 text-center flex flex-col items-center justify-center text-stone-400 bg-stone-50/50 rounded-xl border border-dashed border-stone-200">
              <Bike size={36} className="mb-2 opacity-40 text-stone-500" />
              <p className="font-bold text-stone-700 text-sm">{loading ? 'Carregando entregas...' : 'Nenhuma entrega encontrada'}</p>
              {!loading && (
                <p className="text-stone-500 font-mono text-xs mt-0.5 max-w-sm">
                  Ajuste o período ou o filtro para visualizar as entregas.
                </p>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-stone-200">
              <table className="min-w-full text-left">
                <thead>
                  <tr className="border-b border-stone-200 text-[11px] font-mono font-bold text-stone-600 uppercase tracking-wider bg-stone-50">
                    <th className="py-3 px-4">Nº / Data</th>
                    <th className="py-3 px-4">Cliente / Zona</th>
                    <th className="py-3 px-4">Entregador</th>
                    <th className="py-3 px-4">Custo</th>
                    <th className="py-3 px-4">Situação</th>
                    <th className="py-3 px-4 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="text-xs font-mono divide-y divide-stone-100">
                  {filteredDeliveries.map(order => {
                    const isCanceled = !isOrderActive(order.status);
                    const responsible = getDeliveryResponsibleLabel(order.deliveryProvider, order.motoboyId, motoboys);
                    return (
                      <tr key={order.id} className={`hover:bg-stone-50/80 transition-colors ${isCanceled ? 'opacity-50' : ''}`}>
                        <td className="py-3 px-4">
                          <span className="font-black text-stone-900 tabular-nums">#{order.id}</span>
                          <div className="text-[11px] text-stone-500 mt-0.5">{formatDateTime(order.createdAt)}</div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-black text-stone-900 text-xs sm:text-sm font-sans">{order.customerName}</div>
                          <div className="text-[11px] text-stone-500 mt-0.5 max-w-xs truncate" title={order.deliveryAddress}>
                            {order.deliveryZone || order.deliveryAddress || '—'}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold border ${providerBadgeClass(order.deliveryProvider)}`}>
                            <Bike size={12} />
                            <span>{responsible || 'Sem motoboy'}</span>
                          </span>
                        </td>
                        <td className="py-3 px-4 font-black tabular-nums text-stone-900 text-sm">
                          {order.deliveryProvider ? formatMoney(order.deliveryCost) : '—'}
                        </td>
                        <td className="py-3 px-4">
                          {isCanceled ? (
                            <span className="text-[11px] font-bold text-rose-700">Cancelado</span>
                          ) : order.motoboySettlementId ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800">
                              <Lock size={11} /> Fechado
                            </span>
                          ) : order.deliveryProvider === 'proprio' ? (
                            <span className="text-[11px] font-bold text-amber-800">Em aberto</span>
                          ) : order.deliveryProvider ? (
                            <span className="text-[11px] font-bold text-stone-500">Plataforma</span>
                          ) : (
                            <span className="text-[11px] font-bold text-amber-800">Pendente de vínculo</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right">
                          {!isCanceled && !order.motoboySettlementId && (
                            <button
                              onClick={() => setAssigningOrder(order)}
                              className={`text-[11px] font-mono font-black px-2.5 py-1 rounded transition-colors cursor-pointer border shadow-2xs ${
                                order.deliveryProvider
                                  ? 'bg-white hover:bg-stone-100 text-stone-800 border-stone-200'
                                  : 'bg-[#fdde58] hover:bg-[#e2c23f] text-stone-950 border-[#d8ba39]'
                              }`}
                            >
                              {order.deliveryProvider ? 'ALTERAR' : 'VINCULAR'}
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* MOTOBOYS */}
      {section === 'motoboys' && (
        <div className="mt-3">
          {motoboys.length === 0 ? (
            <div className="py-12 text-center flex flex-col items-center justify-center text-stone-400 bg-white rounded-xl border border-dashed border-stone-200">
              <Bike size={36} className="mb-2 opacity-40 text-stone-500" />
              <p className="font-bold text-stone-700 text-sm">{loading ? 'Carregando motoboys...' : 'Nenhum motoboy próprio cadastrado'}</p>
              {!loading && (
                <p className="text-stone-500 font-mono text-xs mt-0.5 max-w-sm">
                  Cadastre os motoboys da casa para vinculá-los às entregas. Uber e iFood já estão disponíveis no despacho.
                </p>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {motoboys.map(m => {
                const open = openByMotoboy[m.id] || { count: 0, total: 0 };
                const inPeriod = periodByMotoboy[m.id] || { count: 0, total: 0 };
                return (
                  <div key={m.id} className={`bg-white rounded-xl border border-stone-200/90 shadow-sm flex flex-col overflow-hidden ${m.is_active ? '' : 'opacity-70'}`}>
                    <div className="p-3.5 border-b border-stone-100 bg-stone-50/40 flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-black text-stone-900 text-sm truncate">{m.name}</span>
                          {!m.is_active && (
                            <span className="text-[10px] font-mono font-black px-1.5 py-0.5 rounded bg-stone-200 text-stone-700 border border-stone-300">
                              INATIVO
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-stone-500 font-mono mt-0.5 flex items-center gap-2 flex-wrap">
                          {m.phone && (
                            <a href={`tel:${m.phone}`} className="flex items-center gap-1 hover:text-stone-900 font-bold transition-colors">
                              <Phone size={11} /> {m.phone}
                            </a>
                          )}
                          <span>{formatMoney(m.default_fee)} por entrega</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => openMotoboyForm(m)}
                          className="p-1.5 text-stone-700 hover:text-stone-950 bg-white hover:bg-stone-100 border border-stone-200 rounded-md transition-colors cursor-pointer"
                          title="Editar motoboy"
                        >
                          <Edit2 size={13} />
                        </button>
                        <button
                          onClick={() => handleToggleActive(m)}
                          className="p-1.5 text-stone-700 hover:text-stone-950 bg-white hover:bg-stone-100 border border-stone-200 rounded-md transition-colors cursor-pointer"
                          title={m.is_active ? 'Desativar motoboy' : 'Reativar motoboy'}
                        >
                          <Power size={13} />
                        </button>
                        <button
                          onClick={() => handleDeleteMotoboy(m)}
                          className="p-1.5 text-stone-400 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 rounded-md transition-colors cursor-pointer"
                          title="Excluir motoboy"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>

                    <div className="p-3.5 grid grid-cols-2 gap-3 flex-1">
                      <div>
                        <span className="block text-[10px] font-semibold uppercase tracking-wider text-stone-500">No período</span>
                        <p className="text-sm font-bold text-stone-900 tabular-nums mt-0.5">{formatMoney(inPeriod.total)}</p>
                        <span className="text-[10px] text-stone-500 tabular-nums">{inPeriod.count} {inPeriod.count === 1 ? 'entrega' : 'entregas'}</span>
                      </div>
                      <div>
                        <span className="block text-[10px] font-semibold uppercase tracking-wider text-stone-500">Em aberto (a pagar)</span>
                        <p className={`text-sm font-bold tabular-nums mt-0.5 ${open.count > 0 ? 'text-amber-800' : 'text-stone-900'}`}>{formatMoney(open.total)}</p>
                        <span className="text-[10px] text-stone-500 tabular-nums">{open.count} {open.count === 1 ? 'entrega' : 'entregas'}</span>
                      </div>
                    </div>

                    <div className="p-3 pt-2 border-t border-stone-100 bg-stone-50/50">
                      <button
                        type="button"
                        onClick={() => openSettlement(m)}
                        className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-stone-900 hover:bg-stone-950 active:bg-black text-[#fdde58] font-mono font-black text-xs shadow-2xs transition-all cursor-pointer border border-stone-800"
                      >
                        <Wallet size={14} />
                        <span>FAZER FECHAMENTO</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* FECHAMENTOS */}
      {section === 'fechamentos' && (
        <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-2xs mt-3">
          {filteredSettlements.length === 0 ? (
            <div className="py-12 text-center flex flex-col items-center justify-center text-stone-400 bg-stone-50/50 rounded-xl border border-dashed border-stone-200">
              <Wallet size={36} className="mb-2 opacity-40 text-stone-500" />
              <p className="font-bold text-stone-700 text-sm">Nenhum fechamento no período</p>
              <p className="text-stone-500 font-mono text-xs mt-0.5 max-w-sm">
                Use "Fazer fechamento" na aba Motoboys para acertar as entregas em aberto.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-stone-200">
              <table className="min-w-full text-left">
                <thead>
                  <tr className="border-b border-stone-200 text-[11px] font-mono font-bold text-stone-600 uppercase tracking-wider bg-stone-50">
                    <th className="py-3 px-4">Data</th>
                    <th className="py-3 px-4">Motoboy</th>
                    <th className="py-3 px-4">Entregas</th>
                    <th className="py-3 px-4">Extra / Desconto</th>
                    <th className="py-3 px-4">Numerário cobrado</th>
                    <th className="py-3 px-4">Total pago</th>
                    <th className="py-3 px-4 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="text-xs font-mono divide-y divide-stone-100">
                  {filteredSettlements.map(s => (
                    <tr key={s.id} className="hover:bg-stone-50/80 transition-colors">
                      <td className="py-3 px-4 font-bold text-stone-800">{formatDateTime(s.created_at)}</td>
                      <td className="py-3 px-4">
                        <div className="font-black text-stone-900 text-xs sm:text-sm font-sans">
                          {motoboys.find(m => m.id === s.motoboy_id)?.name || '—'}
                        </div>
                        {s.notes && <div className="text-[11px] text-stone-500 mt-0.5 max-w-xs truncate" title={s.notes}>{s.notes}</div>}
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-bold text-stone-900 tabular-nums">{s.deliveries_count}</span>
                        <span className="text-stone-500"> · {formatMoney(s.deliveries_total)}</span>
                        {s.period_start && (
                          <div className="text-[11px] text-stone-500 mt-0.5">
                            {formatDate(s.period_start)} a {formatDate(s.period_end)}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4 tabular-nums text-stone-700">
                        +{formatMoney(s.extra_amount)} / −{formatMoney(s.discount_amount)}
                      </td>
                      <td className="py-3 px-4 tabular-nums text-stone-700">{formatMoney(s.cash_collected)}</td>
                      <td className="py-3 px-4 font-black tabular-nums text-stone-900 text-sm">{formatMoney(s.total_paid)}</td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => handleUndoSettlement(s)}
                          className="inline-flex items-center gap-1 text-[11px] font-mono font-bold px-2 py-1 text-stone-500 hover:text-rose-600 hover:bg-rose-50 border border-stone-200 hover:border-rose-200 rounded-md transition-colors cursor-pointer"
                          title="Desfazer fechamento"
                        >
                          <RotateCcw size={12} />
                          <span>Desfazer</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* MODAL: CADASTRO DE MOTOBOY */}
      {editingMotoboy && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setEditingMotoboy(null)}>
          <form
            onSubmit={handleSaveMotoboy}
            className="bg-white rounded-xl w-full max-w-md shadow-2xl border border-stone-200 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-stone-100 bg-stone-50/50">
              <h2 className="text-sm font-bold text-stone-900 flex items-center gap-1.5">
                <Bike size={15} className="text-amber-500" />
                {editingMotoboy === 'new' ? 'Novo Motoboy' : 'Editar Motoboy'}
              </h2>
              <button type="button" onClick={() => setEditingMotoboy(null)} className="text-stone-400 hover:text-stone-700 cursor-pointer">
                <X size={16} />
              </button>
            </div>

            <div className="p-4 space-y-3.5">
              <div className="space-y-1">
                <label className="block text-[11px] font-semibold text-stone-700">Nome *</label>
                <input type="text" required autoFocus placeholder="Ex: João Silva" value={formName} onChange={e => setFormName(e.target.value)} className={inputClass} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-[11px] font-semibold text-stone-700">Telefone</label>
                  <input type="tel" placeholder="Ex: 912 345 678" value={formPhone} onChange={e => setFormPhone(e.target.value)} className={inputClass} />
                </div>
                <div className="space-y-1">
                  <label className="block text-[11px] font-semibold text-stone-700">Valor por entrega (€)</label>
                  <input type="number" step="0.01" min="0" placeholder="0.00" value={formFee} onChange={e => setFormFee(e.target.value)} className={`${inputClass} font-bold tabular-nums`} />
                </div>
              </div>
              <div className="space-y-1">
                <label className="block text-[11px] font-semibold text-stone-700">Observações</label>
                <input type="text" placeholder="Ex: Só sextas e sábados" value={formNotes} onChange={e => setFormNotes(e.target.value)} className={inputClass} />
              </div>
              <p className="text-[11px] text-stone-500 leading-snug">
                O valor por entrega é sugerido no despacho e pode ser ajustado em cada pedido.
              </p>
            </div>

            <div className="p-3 border-t border-stone-100 bg-stone-50/50 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditingMotoboy(null)}
                className="h-9 px-3.5 bg-white hover:bg-stone-50 text-stone-700 border border-stone-200 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="h-9 px-3.5 flex items-center gap-1.5 bg-[#fdde58] hover:bg-[#e2c23f] active:bg-[#d8ba39] text-stone-950 rounded-lg text-xs font-black font-mono tracking-wide shadow-xs transition-all cursor-pointer border border-[#d8ba39] disabled:opacity-50"
              >
                <Check size={14} className="stroke-[2.5]" />
                <span>{submitting ? 'SALVANDO...' : 'SALVAR'}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL: FECHAMENTO */}
      {settlingMotoboy && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setSettlingMotoboy(null)}>
          <div
            className="bg-white rounded-xl w-full max-w-2xl max-h-[92dvh] shadow-2xl border border-stone-200 overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-stone-100 bg-stone-50/50 shrink-0">
              <div>
                <h2 className="text-sm font-black text-stone-900 flex items-center gap-1.5">
                  <Wallet size={15} className="text-stone-700" />
                  Fechamento — {settlingMotoboy.name}
                </h2>
                <p className="text-[11px] text-stone-500 mt-0.5">Entregas em aberto, ainda não incluídas em nenhum fechamento.</p>
              </div>
              <button onClick={() => setSettlingMotoboy(null)} className="text-stone-400 hover:text-stone-700 cursor-pointer">
                <X size={16} />
              </button>
            </div>

            <div className="p-4 space-y-3.5 overflow-y-auto flex-1">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-[11px] font-semibold text-stone-700">Entregas de</label>
                  <input type="date" value={settleFrom} onChange={e => setSettleFrom(e.target.value)} className={inputClass} />
                </div>
                <div className="space-y-1">
                  <label className="block text-[11px] font-semibold text-stone-700">Até</label>
                  <input type="date" value={settleTo} onChange={e => setSettleTo(e.target.value)} className={inputClass} />
                </div>
              </div>

              {settlementRows.length === 0 ? (
                <div className="py-8 text-center text-stone-500 bg-stone-50/50 rounded-xl border border-dashed border-stone-200 text-xs font-mono">
                  Nenhuma entrega em aberto neste intervalo.
                </div>
              ) : (
                <div className="overflow-x-auto rounded-lg border border-stone-200 max-h-64 overflow-y-auto">
                  <table className="min-w-full text-left">
                    <thead className="sticky top-0">
                      <tr className="border-b border-stone-200 text-[11px] font-mono font-bold text-stone-600 uppercase tracking-wider bg-stone-50">
                        <th className="py-2 px-3">Nº / Data</th>
                        <th className="py-2 px-3">Cliente / Zona</th>
                        <th className="py-2 px-3">Pagamento</th>
                        <th className="py-2 px-3 text-right">Entrega</th>
                      </tr>
                    </thead>
                    <tbody className="text-xs font-mono divide-y divide-stone-100">
                      {settlementRows.map(o => (
                        <tr key={o.id}>
                          <td className="py-2 px-3">
                            <span className="font-black text-stone-900 tabular-nums">#{o.id}</span>
                            <span className="text-[11px] text-stone-500 ml-1.5">{formatDateTime(o.createdAt)}</span>
                          </td>
                          <td className="py-2 px-3 text-stone-700">
                            {o.customerName}
                            {o.deliveryZone ? <span className="text-stone-400"> · {o.deliveryZone}</span> : null}
                          </td>
                          <td className="py-2 px-3 text-stone-700">
                            {normalizePaymentMethod(o.paymentMethod)} · {formatMoney(o.totalAmount)}
                          </td>
                          <td className="py-2 px-3 text-right font-black tabular-nums text-stone-900">{formatMoney(o.deliveryCost)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-[11px] font-semibold text-stone-700">Diária / Extra (€)</label>
                  <input type="number" step="0.01" min="0" placeholder="0.00" value={settleExtra} onChange={e => setSettleExtra(e.target.value)} className={`${inputClass} font-bold tabular-nums`} />
                </div>
                <div className="space-y-1">
                  <label className="block text-[11px] font-semibold text-stone-700">Desconto / Vale (€)</label>
                  <input type="number" step="0.01" min="0" placeholder="0.00" value={settleDiscount} onChange={e => setSettleDiscount(e.target.value)} className={`${inputClass} font-bold tabular-nums`} />
                </div>
              </div>
              <div className="space-y-1">
                <label className="block text-[11px] font-semibold text-stone-700">Observações</label>
                <input type="text" placeholder="Ex: Pago em numerário no fim do turno" value={settleNotes} onChange={e => setSettleNotes(e.target.value)} className={inputClass} />
              </div>

              <div className="bg-stone-950 text-white rounded-xl p-4 space-y-1.5 text-xs font-mono">
                <div className="flex items-center justify-between text-stone-300">
                  <span>{settlementRows.length} {settlementRows.length === 1 ? 'entrega' : 'entregas'}</span>
                  <span className="tabular-nums">{formatMoney(settlementTotals.deliveriesTotal)}</span>
                </div>
                <div className="flex items-center justify-between text-stone-300">
                  <span>Diária / Extra</span>
                  <span className="tabular-nums">+ {formatMoney(settlementTotals.extra)}</span>
                </div>
                <div className="flex items-center justify-between text-stone-300">
                  <span>Desconto / Vale</span>
                  <span className="tabular-nums">− {formatMoney(settlementTotals.discount)}</span>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-stone-800 text-sm font-black">
                  <span>TOTAL A PAGAR</span>
                  <span className="tabular-nums text-[#fdde58] text-lg">{formatMoney(settlementTotals.total)}</span>
                </div>
                {settlementTotals.cashCollected > 0 && (
                  <div className="flex items-center justify-between pt-2 border-t border-stone-800 text-amber-400/90">
                    <span>Numerário cobrado nas entregas (a prestar contas)</span>
                    <span className="tabular-nums">{formatMoney(settlementTotals.cashCollected)}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="p-3 border-t border-stone-100 bg-stone-50/50 flex items-center justify-end gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setSettlingMotoboy(null)}
                className="h-9 px-3.5 bg-white hover:bg-stone-50 text-stone-700 border border-stone-200 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmSettlement}
                disabled={submitting || (settlementRows.length === 0 && settlementTotals.extra === 0)}
                className="h-9 px-3.5 flex items-center gap-1.5 bg-[#fdde58] hover:bg-[#e2c23f] active:bg-[#d8ba39] text-stone-950 rounded-lg text-xs font-black font-mono tracking-wide shadow-xs transition-all cursor-pointer border border-[#d8ba39] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Check size={14} className="stroke-[2.5]" />
                <span>{submitting ? 'REGISTRANDO...' : 'CONFIRMAR FECHAMENTO'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: VÍNCULO DE ENTREGA */}
      {assigningOrder && (
        <MotoboyAssignModal
          order={assigningOrder}
          motoboys={motoboys}
          onClose={() => setAssigningOrder(null)}
          onSaved={() => {
            setAssigningOrder(null);
            refreshAll();
          }}
        />
      )}
    </div>
  );
}
