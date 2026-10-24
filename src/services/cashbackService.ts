import { supabase } from '../lib/supabase';

export interface CashbackSettings {
  enabled: boolean;
  percent: number; // ex: 5.0 para 5%
  minOrderValue: number; // ex: 30.00
  maxDiscountPercent: number; // ex: 50.0 (abater até 50% do pedido)
  expiryDays: number; // ex: 60 dias
}

export interface CashbackTransaction {
  id: string;
  customer_id?: string;
  customer_phone: string;
  order_id?: string;
  type: 'credit' | 'debit' | 'manual_adjustment' | 'expired';
  amount: number;
  balance_after: number;
  description: string;
  created_at: string;
}

const DEFAULT_SETTINGS: CashbackSettings = {
  enabled: true,
  percent: 5.0,
  minOrderValue: 30.0,
  maxDiscountPercent: 50.0,
  expiryDays: 60
};

const STORAGE_SETTINGS_KEY = 'dobro_cashback_settings_v1';

export const cashbackService = {
  // Carrega configurações de cashback
  async getSettings(): Promise<CashbackSettings> {
    try {
      const { data, error } = await supabase
        .from('settings')
        .select('key, value')
        .in('key', [
          'cashback_enabled',
          'cashback_percent',
          'cashback_min_order_value',
          'cashback_max_discount_percent',
          'cashback_expiry_days'
        ]);

      if (error) throw error;

      if (data && data.length > 0) {
        const settings: CashbackSettings = { ...DEFAULT_SETTINGS };
        data.forEach((row) => {
          if (row.key === 'cashback_enabled') settings.enabled = row.value === 'true' || row.value === true;
          if (row.key === 'cashback_percent') settings.percent = Number(row.value) || DEFAULT_SETTINGS.percent;
          if (row.key === 'cashback_min_order_value') settings.minOrderValue = Number(row.value) || 0;
          if (row.key === 'cashback_max_discount_percent') settings.maxDiscountPercent = Number(row.value) || 100;
          if (row.key === 'cashback_expiry_days') settings.expiryDays = Number(row.value) || DEFAULT_SETTINGS.expiryDays;
        });
        localStorage.setItem(STORAGE_SETTINGS_KEY, JSON.stringify(settings));
        return settings;
      }
    } catch (e) {
      console.warn('[cashbackService] Usando configurações em cache/fallback', e);
    }

    try {
      const cached = localStorage.getItem(STORAGE_SETTINGS_KEY);
      if (cached) return JSON.parse(cached);
    } catch {}

    return DEFAULT_SETTINGS;
  },

  // Salva configurações de cashback no Supabase
  async saveSettings(settings: CashbackSettings): Promise<boolean> {
    try {
      localStorage.setItem(STORAGE_SETTINGS_KEY, JSON.stringify(settings));
      const now = new Date().toISOString();
      const rows = [
        { key: 'cashback_enabled', value: String(settings.enabled), updated_at: now },
        { key: 'cashback_percent', value: String(settings.percent), updated_at: now },
        { key: 'cashback_min_order_value', value: String(settings.minOrderValue), updated_at: now },
        { key: 'cashback_max_discount_percent', value: String(settings.maxDiscountPercent), updated_at: now },
        { key: 'cashback_expiry_days', value: String(settings.expiryDays), updated_at: now }
      ];

      const { error } = await supabase.from('settings').upsert(rows, { onConflict: 'key' });
      if (error) throw error;
      return true;
    } catch (e) {
      console.error('[cashbackService] Erro ao salvar configurações:', e);
      return false;
    }
  },

  // Consulta saldo e dados de cashback pelo telefone do cliente
  async getCustomerBalance(rawPhone: string): Promise<{ balance: number; customerId?: string }> {
    const cleanPhone = String(rawPhone || '').replace(/\D/g, '');
    if (!cleanPhone || cleanPhone.length < 8) return { balance: 0 };

    try {
      const { data, error } = await supabase
        .from('customers')
        .select('id, cashback_balance')
        .or(`phone.eq.${cleanPhone},phone.ilike.%${cleanPhone.slice(-8)}%`)
        .limit(1)
        .maybeSingle();

      if (!error && data) {
        return {
          balance: Number(data.cashback_balance) || 0,
          customerId: data.id
        };
      }
    } catch (e) {
      console.warn('[cashbackService] Erro ao consultar saldo de cashback:', e);
    }

    // Fallback: tenta buscar na tabela de transações
    try {
      const { data } = await supabase
        .from('cashback_transactions')
        .select('balance_after')
        .ilike('customer_phone', `%${cleanPhone.slice(-8)}%`)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (data && data.balance_after !== undefined) {
        return { balance: Number(data.balance_after) || 0 };
      }
    } catch {}

    return { balance: 0 };
  },

  // Calcula o valor máximo de cashback utilizável em um pedido
  calculateMaxDiscount(
    subtotal: number,
    balance: number,
    settings: CashbackSettings
  ): number {
    if (!settings.enabled || balance <= 0 || subtotal < settings.minOrderValue) {
      return 0;
    }
    const maxPercentDiscount = (subtotal * settings.maxDiscountPercent) / 100;
    return Math.min(balance, maxPercentDiscount, subtotal);
  },

  // Calcula o novo cashback a ser gerado por um pedido
  calculateEarnedCashback(amountPaid: number, settings: CashbackSettings): number {
    if (!settings.enabled || amountPaid <= 0 || settings.percent <= 0) return 0;
    return Math.round(amountPaid * (settings.percent / 100) * 100) / 100;
  },

  // Extrato de transações de um cliente
  async getCustomerTransactions(rawPhone: string): Promise<CashbackTransaction[]> {
    const cleanPhone = String(rawPhone || '').replace(/\D/g, '');
    if (!cleanPhone) return [];

    try {
      const { data, error } = await supabase
        .from('cashback_transactions')
        .select('*')
        .ilike('customer_phone', `%${cleanPhone.slice(-8)}%`)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      return (data || []).map((t: any) => ({
        id: t.id,
        customer_id: t.customer_id,
        customer_phone: t.customer_phone,
        order_id: t.order_id,
        type: t.type,
        amount: Number(t.amount) || 0,
        balance_after: Number(t.balance_after) || 0,
        description: t.description || '',
        created_at: t.created_at
      }));
    } catch (e) {
      console.warn('[cashbackService] Erro ao carregar transações:', e);
      return [];
    }
  },

  // Ajuste manual de saldo pelo gestor (CRM)
  async adjustBalance(
    rawPhone: string,
    newBalance: number,
    reason: string,
    customerId?: string
  ): Promise<boolean> {
    const cleanPhone = String(rawPhone || '').replace(/\D/g, '');
    if (!cleanPhone) return false;

    try {
      const current = await this.getCustomerBalance(cleanPhone);
      const diff = newBalance - current.balance;
      const type = diff >= 0 ? 'manual_adjustment' : 'debit';

      // 1. Atualiza na tabela customers
      if (customerId || current.customerId) {
        await supabase
          .from('customers')
          .update({ cashback_balance: newBalance })
          .eq('id', customerId || current.customerId);
      } else {
        await supabase
          .from('customers')
          .update({ cashback_balance: newBalance })
          .eq('phone', cleanPhone);
      }

      // 2. Registra a transação
      await supabase.from('cashback_transactions').insert({
        customer_id: customerId || current.customerId || null,
        customer_phone: cleanPhone,
        type,
        amount: Math.abs(diff),
        balance_after: newBalance,
        description: reason || 'Ajuste manual pelo gestor'
      });

      return true;
    } catch (e) {
      console.error('[cashbackService] Erro ao ajustar saldo:', e);
      return false;
    }
  },

  // Registra utilização de cashback ao criar pedido
  async applyOrderCashback(
    orderId: string | undefined,
    rawPhone: string,
    usedAmount: number,
    earnedAmount: number
  ): Promise<void> {
    const cleanPhone = String(rawPhone || '').replace(/\D/g, '');
    if (!cleanPhone) return;

    try {
      const { balance, customerId } = await this.getCustomerBalance(cleanPhone);
      let runningBalance = balance;

      if (usedAmount > 0) {
        runningBalance = Math.max(0, runningBalance - usedAmount);
        await supabase.from('cashback_transactions').insert({
          customer_id: customerId || null,
          customer_phone: cleanPhone,
          order_id: orderId || null,
          type: 'debit',
          amount: usedAmount,
          balance_after: runningBalance,
          description: `Resgate no pedido #${orderId || ''}`
        });
      }

      if (earnedAmount > 0) {
        runningBalance += earnedAmount;
        await supabase.from('cashback_transactions').insert({
          customer_id: customerId || null,
          customer_phone: cleanPhone,
          order_id: orderId || null,
          type: 'credit',
          amount: earnedAmount,
          balance_after: runningBalance,
          description: `Cashback gerado no pedido #${orderId || ''}`
        });
      }

      if (customerId) {
        await supabase
          .from('customers')
          .update({ cashback_balance: runningBalance })
          .eq('id', customerId);
      } else {
        await supabase
          .from('customers')
          .update({ cashback_balance: runningBalance })
          .eq('phone', cleanPhone);
      }
    } catch (e) {
      console.warn('[cashbackService] Não foi possível registrar cashback no banco:', e);
    }
  }
};
