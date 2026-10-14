import React, { useState } from 'react';
import { Bike, X, AlertCircle, Check, MapPin, Lock } from 'lucide-react';
import { supabase } from '../lib/supabase';
import {
  DeliveryProvider,
  Motoboy,
  PROVIDER_LABELS,
  isMotoboySchemaMissing,
} from '../utils/motoboys';

export interface AssignableOrder {
  id: number | string;
  customerName?: string;
  deliveryAddress?: string;
  deliveryZone?: string;
  deliveryProvider?: DeliveryProvider | null;
  motoboyId?: string | null;
  deliveryCost?: number | null;
  motoboySettlementId?: string | null;
}

interface MotoboyAssignModalProps {
  order: AssignableOrder;
  motoboys: Motoboy[];
  /** Se informado, o status do pedido é alterado junto com o vínculo (ex.: despacho). */
  nextStatus?: string;
  onClose: () => void;
  onSaved: () => void;
}

const PROVIDER_OPTIONS: DeliveryProvider[] = ['proprio', 'uber', 'ifood'];

export default function MotoboyAssignModal({ order, motoboys, nextStatus, onClose, onSaved }: MotoboyAssignModalProps) {
  // Motoboys ativos + o já vinculado ao pedido (mesmo que tenha sido desativado depois)
  const selectableMotoboys = motoboys.filter(m => m.is_active || m.id === order.motoboyId);
  const feeOf = (id: string) => {
    const found = motoboys.find(m => m.id === id);
    return found ? Number(found.default_fee || 0).toFixed(2) : '';
  };

  const initialMotoboyId = order.motoboyId || (selectableMotoboys.length === 1 ? selectableMotoboys[0].id : '');
  const [provider, setProvider] = useState<DeliveryProvider>(order.deliveryProvider || 'proprio');
  const [motoboyId, setMotoboyId] = useState<string>(initialMotoboyId);
  const [cost, setCost] = useState<string>(() => {
    if (order.deliveryCost !== null && order.deliveryCost !== undefined && Number(order.deliveryCost) > 0) {
      return Number(order.deliveryCost).toFixed(2).replace('.', ',');
    }
    const motoboyFee = (order.deliveryProvider || 'proprio') === 'proprio' && initialMotoboyId ? feeOf(initialMotoboyId) : '';
    return motoboyFee ? Number(motoboyFee).toFixed(2).replace('.', ',') : '10,00';
  });
  const [costTouched, setCostTouched] = useState(order.deliveryCost !== null && order.deliveryCost !== undefined);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const isLocked = !!order.motoboySettlementId;

  const handleSelectProvider = (p: DeliveryProvider) => {
    setProvider(p);
    setError('');
    if (!costTouched) {
      const f = p === 'proprio' && motoboyId ? feeOf(motoboyId) : '10.00';
      setCost(f ? Number(f).toFixed(2).replace('.', ',') : '10,00');
    }
  };

  const handleSelectMotoboy = (id: string) => {
    setMotoboyId(id);
    setError('');
    if (!costTouched) {
      const f = id ? feeOf(id) : '10.00';
      setCost(f ? Number(f).toFixed(2).replace('.', ',') : '10,00');
    }
  };

  const describeError = (err: any) =>
    isMotoboySchemaMissing(err)
      ? 'O controle de motoboys ainda não foi ativado no banco. Execute a migration "20261013000000_motoboys.sql" no SQL Editor do Supabase.'
      : 'Erro ao salvar: ' + (err?.message || String(err));

  const handleSave = async () => {
    if (provider === 'proprio' && !motoboyId) {
      setError('Selecione o motoboy que vai fazer a entrega.');
      return;
    }
    const numCost = parseFloat(cost.replace(',', '.'));
    if (cost.trim() === '' || isNaN(numCost) || numCost < 0) {
      setError('Informe o custo da entrega (use 0 se não houver custo).');
      return;
    }

    setSaving(true);
    try {
      const payload: Record<string, any> = {
        delivery_provider: provider,
        motoboy_id: provider === 'proprio' ? motoboyId : null,
        delivery_cost: Number(numCost.toFixed(2)),
      };
      if (nextStatus) payload.status = nextStatus;

      const { error: updateError } = await supabase.from('orders').update(payload).eq('id', order.id);
      if (updateError) throw updateError;
      onSaved();
    } catch (err: any) {
      console.error('Erro ao vincular motoboy:', err);
      setError(describeError(err));
    } finally {
      setSaving(false);
    }
  };

  const handleClear = async () => {
    if (!window.confirm(`Remover o vínculo de entrega do Pedido #${order.id}?`)) return;
    setSaving(true);
    try {
      const { error: updateError } = await supabase
        .from('orders')
        .update({ delivery_provider: null, motoboy_id: null, delivery_cost: null })
        .eq('id', order.id);
      if (updateError) throw updateError;
      onSaved();
    } catch (err: any) {
      console.error('Erro ao remover vínculo de motoboy:', err);
      setError(describeError(err));
    } finally {
      setSaving(false);
    }
  };

  const confirmLabel =
    nextStatus === 'Saiu para Entrega'
      ? 'CONFIRMAR E DESPACHAR'
      : nextStatus === 'Finalizado'
      ? 'CONFIRMAR E CONCLUIR'
      : 'SALVAR VÍNCULO';

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 no-print" onClick={onClose}>
      <div
        className="bg-white rounded-xl w-full max-w-md shadow-2xl border border-stone-200 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 p-4 border-b border-stone-100 bg-stone-50/50">
          <div className="min-w-0">
            <h2 className="text-sm font-black text-stone-900 flex items-center gap-1.5">
              <Bike size={15} className="text-stone-700" />
              <span>Entrega do Pedido #{order.id}</span>
            </h2>
            {order.customerName && (
              <p className="text-xs text-stone-600 font-medium mt-0.5 truncate">{order.customerName}</p>
            )}
            {(order.deliveryAddress || order.deliveryZone) && (
              <p className="text-[11px] text-stone-500 mt-0.5 flex items-start gap-1">
                <MapPin size={11} className="text-stone-400 shrink-0 mt-0.5" />
                <span className="leading-snug">
                  {order.deliveryAddress}
                  {order.deliveryZone ? ` (${order.deliveryZone})` : ''}
                </span>
              </p>
            )}
          </div>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-700 p-0.5 cursor-pointer" title="Fechar">
            <X size={16} />
          </button>
        </div>

        <div className="p-4 space-y-3.5">
          {isLocked && (
            <div className="p-2.5 rounded-lg text-xs font-medium flex items-start gap-2 border bg-stone-100 text-stone-700 border-stone-200">
              <Lock size={14} className="shrink-0 mt-0.5" />
              <span>Esta entrega já entrou em um fechamento de motoboy. Para alterar, desfaça o fechamento na aba Motoboys.</span>
            </div>
          )}

          <div className="space-y-1">
            <span className="block text-[11px] font-semibold text-stone-700">Quem faz a entrega? *</span>
            <div className="grid grid-cols-3 gap-2">
              {PROVIDER_OPTIONS.map(p => (
                <button
                  key={p}
                  type="button"
                  disabled={isLocked}
                  onClick={() => handleSelectProvider(p)}
                  className={`h-10 px-2 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer border disabled:opacity-50 disabled:cursor-not-allowed ${
                    provider === p
                      ? 'bg-[#745240] text-white border-[#745240] shadow-2xs font-black'
                      : 'bg-white text-stone-600 border-stone-200 hover:bg-stone-50 hover:text-stone-900'
                  }`}
                >
                  {p === 'proprio' ? 'Próprio' : PROVIDER_LABELS[p]}
                </button>
              ))}
            </div>
          </div>

          {provider === 'proprio' && (
            <div className="space-y-1">
              <label className="block text-[11px] font-semibold text-stone-700">Motoboy *</label>
              {selectableMotoboys.length === 0 ? (
                <p className="text-xs text-amber-900 bg-amber-50 border border-amber-200 rounded-lg p-2.5 font-medium">
                  Nenhum motoboy próprio cadastrado. Cadastre na aba Motoboys do gestor.
                </p>
              ) : (
                <select
                  value={motoboyId}
                  disabled={isLocked}
                  onChange={(e) => handleSelectMotoboy(e.target.value)}
                  className="w-full h-9 px-2 bg-stone-50 border border-stone-200 rounded-md text-xs font-medium text-stone-900 focus:bg-white focus:border-[#745240] outline-none cursor-pointer disabled:opacity-50"
                >
                  <option value="">Selecione...</option>
                  {selectableMotoboys.map(m => (
                    <option key={m.id} value={m.id}>
                      {m.name}{m.is_active ? '' : ' (inativo)'}
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}

          <div className="space-y-1">
            <label className="block text-[11px] font-semibold text-stone-700">
              {provider === 'proprio' ? 'Valor pago ao motoboy (R$) *' : `Valor cobrado pela plataforma ${PROVIDER_LABELS[provider]} (R$) *`}
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-stone-400 font-mono">R$</span>
              <input
                type="text"
                inputMode="decimal"
                placeholder="12,50"
                value={cost}
                disabled={isLocked}
                onFocus={(e) => e.target.select()}
                onChange={(e) => {
                  const val = e.target.value.replace(/[^0-9.,]/g, '');
                  setCost(val);
                  setCostTouched(true);
                }}
                onBlur={() => {
                  const cleaned = cost.replace(',', '.');
                  const num = parseFloat(cleaned);
                  if (!isNaN(num) && num >= 0) {
                    setCost(num.toFixed(2).replace('.', ','));
                  }
                }}
                className="w-full h-10 pl-10 pr-3 bg-stone-50 border border-stone-200 rounded-lg text-sm font-bold text-stone-900 font-mono focus:bg-white focus:border-[#745240] focus:ring-1 focus:ring-[#745240] outline-none transition-all disabled:opacity-50"
              />
            </div>
            <p className="text-[10px] text-stone-400 font-mono">Exemplo: R$ 12,50</p>
          </div>

          {error && (
            <div className="p-2.5 rounded-lg text-xs font-medium flex items-start gap-2 border bg-rose-50 text-rose-900 border-rose-200">
              <AlertCircle size={14} className="text-rose-600 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}
        </div>

        <div className="p-3 border-t border-stone-100 bg-stone-50/50 flex items-center justify-between gap-2">
          {order.deliveryProvider && !nextStatus && !isLocked ? (
            <button
              type="button"
              onClick={handleClear}
              disabled={saving}
              className="text-[11px] font-mono font-bold text-stone-500 hover:text-rose-600 transition-colors cursor-pointer disabled:opacity-50"
            >
              Remover vínculo
            </button>
          ) : (
            <span />
          )}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="h-9 px-3.5 bg-white hover:bg-stone-50 text-stone-700 border border-stone-200 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || isLocked}
              className="h-9 px-3.5 flex items-center gap-1.5 bg-[#745240] hover:bg-[#5c3a21] active:bg-[#44210f] text-[#fdfbf7] rounded-lg text-xs font-black font-mono tracking-wide shadow-xs transition-all cursor-pointer border border-[#d5af7a]/60 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Check size={14} className="stroke-[2.5]" />
              <span>{saving ? 'SALVANDO...' : confirmLabel}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
