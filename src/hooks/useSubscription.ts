import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export interface SubscriptionData {
  id?: string;
  planName: string;
  monthlyAmount: number;
  currency: string;
  dueDay: number; // 16
  gracePeriodDays: number; // 5 dias corridos
  status: 'active' | 'past_due' | 'blocked';
  currentPeriodDue: string; // YYYY-MM-DD
  lastPaymentDate: string | null;
  pixCode: string;
  pixQrUrl: string;
  stripePaymentLink: string;
  isManuallyOverridden: boolean;
  notes?: string;
  updatedAt?: string;
}

export interface SubscriptionStatusInfo {
  status: 'active' | 'past_due' | 'blocked';
  isBlocked: boolean;
  isGracePeriod: boolean;
  daysOverdue: number;
  deadlineDateStr: string;
}

export interface InvoiceHistory {
  id: string;
  month: string;
  dueDate: string;
  paidDate: string;
  amount: number;
  method: string;
  status: 'pago' | 'pendente' | 'cancelado';
}

const STORAGE_KEY = 'admin_system_subscription_state_v3';

export function useSubscription() {
  const [loading, setLoading] = useState(true);

  // 30 dias gratuitos a contar de hoje (22/10/2026) -> próximo vencimento 22/11/2026
  const calculateCurrentDueDate = (): string => {
    return '2026-11-22';
  };

  const defaultSubscription: SubscriptionData = {
    planName: 'Período Gratuito Dobro Pizza (30 dias)',
    monthlyAmount: 0.00,
    currency: 'BRL',
    dueDay: 22,
    gracePeriodDays: 30,
    status: 'active',
    currentPeriodDue: '2026-11-22',
    lastPaymentDate: '2026-10-22T00:00:00.000Z',
    pixCode: '00020126360014BR.GOV.BCB.PIX0114+55419965600805204000053039865406490.005802BR5914SISTEMA GESTOR6008CURITIBA62150511MENSALIDADE6304F9A7',
    pixQrUrl: 'https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=00020126360014BR.GOV.BCB.PIX0114%2B55419965600805204000053039865406490.005802BR5914SISTEMA%20GESTOR6008CURITIBA62150511MENSALIDADE6304F9A7',
    stripePaymentLink: 'https://buy.stripe.com/test_gestor_delivery_490',
    isManuallyOverridden: true,
    notes: 'Sistema 100% liberado sem mensalidade (30 dias grátis a contar de 22/10/2026).'
  };

  const [subscription, setSubscription] = useState<SubscriptionData>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        // Garante que o status liberado de 30 dias prevaleça
        if (parsed.status === 'blocked' || !parsed.isManuallyOverridden) {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultSubscription));
          return defaultSubscription;
        }
        return { ...defaultSubscription, ...parsed };
      }
    } catch (e) {
      console.error("Erro ao ler localStorage de assinatura", e);
    }
    return defaultSubscription;
  });

  const [invoices, setInvoices] = useState<InvoiceHistory[]>([
    {
      id: 'INV-2026-09',
      month: 'Setembro / 2026',
      dueDate: '16/09/2026',
      paidDate: '15/09/2026 14:30',
      amount: 490.00,
      method: 'PIX Direto',
      status: 'pago'
    },
    {
      id: 'INV-2026-08',
      month: 'Agosto / 2026',
      dueDate: '16/08/2026',
      paidDate: '15/08/2026 14:32',
      amount: 490.00,
      method: 'PIX Direto',
      status: 'pago'
    },
    {
      id: 'INV-2026-07',
      month: 'Julho / 2026',
      dueDate: '16/07/2026',
      paidDate: '16/07/2026 09:15',
      amount: 490.00,
      method: 'PIX Direto',
      status: 'pago'
    },
    {
      id: 'INV-2026-06',
      month: 'Junho / 2026',
      dueDate: '16/06/2026',
      paidDate: '14/06/2026 18:20',
      amount: 490.00,
      method: 'PIX Direto',
      status: 'pago'
    }
  ]);

  // Avaliação temporal e semântica de carência
  const evaluateStatus = useCallback((sub: SubscriptionData) => {
    if (sub.isManuallyOverridden || sub.monthlyAmount === 0) {
      return {
        status: 'active' as const,
        isBlocked: false,
        isGracePeriod: false,
        daysOverdue: 0,
        deadlineDateStr: ''
      };
    }

    const now = new Date();
    const nowTime = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

    // Data de vencimento (dia 16)
    const [dueY, dueM, dueD] = sub.currentPeriodDue.split('-').map(Number);
    const dueDate = new Date(dueY, (dueM || 1) - 1, dueD || 16);
    const dueDateTime = dueDate.getTime();

    // Data limite de carência (dia 16 + 5 dias = dia 21)
    const graceDeadline = new Date(dueDate);
    graceDeadline.setDate(graceDeadline.getDate() + (sub.gracePeriodDays || 5));
    const graceDeadlineTime = graceDeadline.getTime();

    const diffDaysFromDue = Math.floor((nowTime - dueDateTime) / (1000 * 60 * 60 * 24));
    const deadlineDateStr = graceDeadline.toLocaleDateString('pt-BR');

    // Se já tiver sido marcado como pago no período atual
    if (sub.status === 'active' && sub.lastPaymentDate) {
      const lastPay = new Date(sub.lastPaymentDate);
      if (lastPay >= dueDate) {
        return {
          status: 'active' as const,
          isBlocked: false,
          isGracePeriod: false,
          daysOverdue: 0,
          deadlineDateStr
        };
      }
    }

    // Se hoje for depois do vencimento (dia 17 em diante)
    if (nowTime > dueDateTime) {
      // Se ainda estiver dentro dos 5 dias de tolerância (dias 17 a 21)
      if (nowTime <= graceDeadlineTime) {
        return {
          status: 'past_due' as const,
          isBlocked: false,
          isGracePeriod: true,
          daysOverdue: diffDaysFromDue,
          deadlineDateStr
        };
      } else {
        // A partir do dia 22 (passou de 5 dias corridos): BLOQUEIO TOTAL
        return {
          status: 'blocked' as const,
          isBlocked: true,
          isGracePeriod: false,
          daysOverdue: diffDaysFromDue,
          deadlineDateStr
        };
      }
    }

    // Antes ou no dia do vencimento
    return {
      status: 'active' as const,
      isBlocked: false,
      isGracePeriod: false,
      daysOverdue: 0,
      deadlineDateStr
    };
  }, []);

  const currentStatusInfo = evaluateStatus(subscription);

  // Sincronização com Supabase (com fallback resiliente local)
  const fetchSubscriptionFromDb = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('system_subscription')
        .select('*')
        .limit(1)
        .maybeSingle();

      if (data && !error) {
        const formatted: SubscriptionData = {
          id: data.id,
          planName: data.plan_name || 'Licença Gestor Delivery Pro',
          monthlyAmount: Number(data.monthly_amount) || 490.00,
          currency: data.currency || 'BRL',
          dueDay: Number(data.due_day) || 16,
          gracePeriodDays: Number(data.grace_period_days) || 5,
          status: data.status || 'active',
          currentPeriodDue: data.current_period_due || calculateCurrentDueDate(),
          lastPaymentDate: data.last_payment_date,
          pixCode: data.pix_copy_paste || defaultSubscription.pixCode,
          pixQrUrl: data.pix_qr_code || defaultSubscription.pixQrUrl,
          stripePaymentLink: data.stripe_payment_link || defaultSubscription.stripePaymentLink,
          isManuallyOverridden: !!data.is_manually_overridden,
          notes: data.notes
        };
        setSubscription(formatted);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(formatted));
      }
    } catch (err) {
      console.warn("Tabela system_subscription ainda não encontrada no Supabase, usando estado local gerenciado.", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSubscriptionFromDb();
  }, [fetchSubscriptionFromDb]);

  // Função para salvar atualização de assinatura
  const updateSubscription = async (updates: Partial<SubscriptionData>) => {
    const updated = { ...subscription, ...updates, updatedAt: new Date().toISOString() };
    setSubscription(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));

    try {
      await supabase.from('system_subscription').upsert({
        plan_name: updated.planName,
        monthly_amount: updated.monthlyAmount,
        currency: updated.currency,
        due_day: updated.dueDay,
        grace_period_days: updated.gracePeriodDays,
        status: updated.status,
        current_period_due: updated.currentPeriodDue,
        last_payment_date: updated.lastPaymentDate,
        pix_copy_paste: updated.pixCode,
        pix_qr_code: updated.pixQrUrl,
        stripe_payment_link: updated.stripePaymentLink,
        is_manually_overridden: updated.isManuallyOverridden,
        updated_at: new Date().toISOString()
      });
    } catch (err) {
      console.warn("Não foi possível persistir no Supabase, mantido em cache local.", err);
    }
  };

  // Confirmar pagamento (desbloqueia na hora e projeta próximo vencimento)
  const confirmPayment = async () => {
    const now = new Date();
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 16);
    const nextDueDateStr = `${nextMonth.getFullYear()}-${String(nextMonth.getMonth() + 1).padStart(2, '0')}-16`;

    const newInvoice: InvoiceHistory = {
      id: `INV-${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`,
      month: now.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }),
      dueDate: `16/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`,
      paidDate: now.toLocaleDateString('pt-BR') + ' ' + now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      amount: subscription.monthlyAmount,
      method: 'PIX Instantâneo (Stripe)',
      status: 'pago'
    };

    setInvoices(prev => [newInvoice, ...prev]);

    await updateSubscription({
      status: 'active',
      lastPaymentDate: now.toISOString(),
      currentPeriodDue: nextDueDateStr,
      isManuallyOverridden: false
    });
  };

  // Simulações para testes em desenvolvimento
  const simulateState = (state: 'active' | 'warning' | 'blocked') => {
    const now = new Date();
    let simulatedDueDate = calculateCurrentDueDate();

    if (state === 'active') {
      // Vencimento futuro (dia 16 do mês seguinte)
      const nextM = new Date(now.getFullYear(), now.getMonth() + 1, 16);
      simulatedDueDate = `${nextM.getFullYear()}-${String(nextM.getMonth() + 1).padStart(2, '0')}-16`;
      updateSubscription({
        status: 'active',
        currentPeriodDue: simulatedDueDate,
        lastPaymentDate: now.toISOString(),
        isManuallyOverridden: false
      });
    } else if (state === 'warning') {
      // Venceu há 2 dias atrás (dentro dos 5 dias de carência)
      const twoDaysAgo = new Date(now);
      twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
      simulatedDueDate = `${twoDaysAgo.getFullYear()}-${String(twoDaysAgo.getMonth() + 1).padStart(2, '0')}-${String(twoDaysAgo.getDate()).padStart(2, '0')}`;
      updateSubscription({
        status: 'past_due',
        currentPeriodDue: simulatedDueDate,
        lastPaymentDate: null,
        isManuallyOverridden: false
      });
    } else if (state === 'blocked') {
      // Venceu há 8 dias atrás (passou dos 5 dias de carência = BLOQUEIO)
      const eightDaysAgo = new Date(now);
      eightDaysAgo.setDate(eightDaysAgo.getDate() - 8);
      simulatedDueDate = `${eightDaysAgo.getFullYear()}-${String(eightDaysAgo.getMonth() + 1).padStart(2, '0')}-${String(eightDaysAgo.getDate()).padStart(2, '0')}`;
      updateSubscription({
        status: 'blocked',
        currentPeriodDue: simulatedDueDate,
        lastPaymentDate: null,
        isManuallyOverridden: false
      });
    }
  };

  return {
    subscription,
    invoices,
    loading,
    statusInfo: currentStatusInfo,
    confirmPayment,
    updateSubscription,
    simulateState,
    refreshSubscription: fetchSubscriptionFromDb
  };
}
