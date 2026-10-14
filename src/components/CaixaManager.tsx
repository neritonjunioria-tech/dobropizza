import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { Lock, Unlock, Printer, BarChart3, ArrowDownCircle, ArrowUpCircle, AlertCircle, Search, ShoppingBag, Banknote, Smartphone, Wallet, CreditCard, Trash2 } from 'lucide-react';
import CashSessionDetailsModal from './reports/CashSessionDetailsModal';
import { normalizePaymentMethod, normalizeOrderType, isOrderActive } from '../utils/paymentAndOrderHelper';
import PeriodFilterCompact, { PeriodFilterOption } from './PeriodFilterCompact';

interface CaixaManagerProps {
  refreshSignal?: number;
}

export default function CaixaManager({ refreshSignal }: CaixaManagerProps = {}) {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [openingAmount, setOpeningAmount] = useState('0.00');
  const [isOpening, setIsOpening] = useState(false);
  const [showOpenModal, setShowOpenModal] = useState(false);
  const [closingAmount, setClosingAmount] = useState('');
  const [summary, setSummary] = useState({ numerario: 0, mbway: 0, cartao: 0, cartaoCredito: 0, cartaoDebito: 0, outros: 0, total: 0, count: 0 });
  const [history, setHistory] = useState<any[]>([]);
  const [historyPeriod, setHistoryPeriod] = useState<PeriodFilterOption>('todos');
  const [historyStart, setHistoryStart] = useState('');
  const [historyEnd, setHistoryEnd] = useState('');
  const [closedResult, setClosedResult] = useState<any>(null);
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [selectedSessionForDetails, setSelectedSessionForDetails] = useState<any>(null);

  // Estados de Movimentações
  const [movements, setMovements] = useState<any[]>([]);
  const [showMovementModal, setShowMovementModal] = useState(false);
  const [movementType, setMovementType] = useState<'sangria' | 'suprimento'>('sangria');
  const [movementAmount, setMovementAmount] = useState('');
  const [movementReason, setMovementReason] = useState('');
  const [isSubmittingMovement, setIsSubmittingMovement] = useState(false);
  const [movementError, setMovementError] = useState('');

  const totalSangrias = movements.filter(m => m.type === 'sangria').reduce((acc, m) => acc + Number(m.amount), 0);
  const totalSuprimentos = movements.filter(m => m.type === 'suprimento').reduce((acc, m) => acc + Number(m.amount), 0);
  const currentExpected = session ? Number(session.opening_amount) + summary.numerario + totalSuprimentos - totalSangrias : 0;

  // Dismiss on ESC
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showMovementModal) setShowMovementModal(false);
        else if (showCloseModal) setShowCloseModal(false);
        else if (showOpenModal) setShowOpenModal(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showMovementModal, showCloseModal, showOpenModal]);

  const loadSession = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('cash_sessions')
      .select('*')
      .eq('status', 'aberto')
      .order('opened_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    setSession(data || null);
    setLoading(false);
  };

  const loadHistory = async () => {
    let query = supabase
      .from('cash_sessions')
      .select('*')
      .eq('status', 'fechado')
      .order('closed_at', { ascending: false });

    const now = new Date();
    if (historyPeriod === 'hoje') {
      const s = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
      query = query.gte('closed_at', s.toISOString());
    } else if (historyPeriod === 'ontem') {
      const s = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 0, 0, 0);
      const e = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 23, 59, 59, 999);
      query = query.gte('closed_at', s.toISOString()).lte('closed_at', e.toISOString());
    } else if (historyPeriod === '7dias') {
      const s = new Date(now);
      s.setDate(s.getDate() - 6);
      s.setHours(0, 0, 0, 0);
      query = query.gte('closed_at', s.toISOString());
    } else if (historyPeriod === '30dias') {
      const s = new Date(now);
      s.setDate(s.getDate() - 29);
      s.setHours(0, 0, 0, 0);
      query = query.gte('closed_at', s.toISOString());
    } else if (historyPeriod === 'mes') {
      const s = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
      query = query.gte('closed_at', s.toISOString());
    } else if (historyPeriod === 'customizado' && historyStart && historyEnd) {
      query = query.gte('closed_at', historyStart + 'T00:00:00').lte('closed_at', historyEnd + 'T23:59:59.999');
    } else {
      query = query.limit(20);
    }

    const { data: sessionsData } = await query;
      
    if (!sessionsData) {
      setHistory([]);
      return;
    }

    const enrichedHistory = await Promise.all(sessionsData.map(async (session) => {
      let total_suprimentos = 0;
      let total_sangrias = 0;

      // Buscar movimentações
      try {
        const { data: movs } = await supabase
          .from('cash_movements')
          .select('type, amount')
          .eq('session_id', session.id);
        
        let movementsList = movs || [];
        if (!movs || movs.length === 0) {
          const { data: settingRow } = await supabase
            .from('settings')
            .select('value')
            .eq('key', `cash_movements_${session.id}`)
            .maybeSingle();
          if (settingRow?.value) {
            try { movementsList = JSON.parse(settingRow.value); } catch(e) {}
          }
        }

        movementsList.forEach((m: any) => {
          if (m.type === 'suprimento') total_suprimentos += Number(m.amount);
          if (m.type === 'sangria') total_sangrias += Number(m.amount);
        });
      } catch (e) {}

      const { data: orders } = await supabase
        .from('orders')
        .select('total_amount, status')
        .gte('created_at', session.opened_at)
        .lte('created_at', session.closed_at || new Date().toISOString());
        
      let total_faturado = 0;
      (orders || []).forEach(o => {
        if (isOrderActive(o)) {
          total_faturado += Number(o.total_amount || 0);
        }
      });

      return {
        ...session,
        total_suprimentos,
        total_sangrias,
        total_faturado
      };
    }));

    setHistory(enrichedHistory);
  };

  useEffect(() => {
    loadSession();
    loadHistory();
  }, []);

  useEffect(() => {
    loadHistory();
  }, [historyPeriod, historyStart, historyEnd]);

  const loadMovements = useCallback(async () => {
    if (!session?.id) return;
    let movList: any[] = [];
    try {
      const { data, error } = await supabase
        .from('cash_movements')
        .select('*')
        .eq('session_id', session.id)
        .order('created_at', { ascending: false });

      if (!error && data && data.length > 0) {
        movList = data;
      } else {
        // Fallback resiliente caso a tabela ainda não exista no schema cache de produção
        const { data: settingRow } = await supabase
          .from('settings')
          .select('value')
          .eq('key', `cash_movements_${session.id}`)
          .maybeSingle();
        if (settingRow?.value) {
          try {
            movList = JSON.parse(settingRow.value);
          } catch(e) {}
        }
      }
    } catch (e) {
      console.warn("Erro ao buscar movimentações:", e);
    }
    setMovements(movList);
  }, [session?.id]);

  const loadSummary = useCallback(async () => {
    if (!session?.opened_at) return;
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('payment_method, total_amount, status')
        .gte('created_at', session.opened_at);

      if (error) throw error;

      let numerario = 0;
      let mbway = 0;
      let cartao = 0;
      let outros = 0;
      let validCount = 0;

      (data || []).forEach((o: any) => {
        if (!isOrderActive(o)) return; // Exclui pedidos cancelados
        const amt = Number(o.total_amount || 0);
        validCount++;
        const norm = normalizePaymentMethod(o.payment_method);
        if (norm === 'Numerário') numerario += amt;
        else if (norm === 'Pix' || norm === 'MB Way') mbway += amt;
        else if (norm === 'Cartão' || norm === 'Cartão de Crédito' || norm === 'Cartão de Débito') cartao += amt;
        else outros += amt;
      });

      setSummary({
        numerario,
        mbway,
        cartao,
        outros,
        total: numerario + mbway + cartao + outros,
        count: validCount
      });
    } catch (err) {
      console.error("Erro ao carregar resumo de vendas do caixa:", err);
    }
  }, [session?.opened_at]);

  useEffect(() => {
    loadSummary();
    loadMovements();
  }, [session, refreshSignal, loadSummary, loadMovements]);

  // Realtime listener para atualização imediata das vendas e movimentações
  useEffect(() => {
    if (!session?.id) return;

    const channel = supabase
      .channel(`caixa-live-${session.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
        loadSummary();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'cash_movements' }, () => {
        loadMovements();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'settings' }, (payload: any) => {
        if (payload?.new?.key === `cash_movements_${session.id}`) {
          loadMovements();
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [session?.id, loadSummary, loadMovements]);

  const handleOpen = async () => {
    setIsOpening(true);
    try {
      const amount = parseFloat(openingAmount) || 0;
      const { data: userData } = await supabase.auth.getUser();
      const { data, error } = await supabase.from('cash_sessions').insert([{
        opening_amount: amount,
        opened_by: userData.user?.id,
        status: 'aberto'
      }]).select().single();
      if (!error && data) {
        // Ao abrir o caixa, também abre a loja automaticamente
        try {
          await supabase.from('settings').upsert([
            { key: 'store_status', value: 'open', updated_at: new Date().toISOString() },
            { key: 'manual_store_closed', value: false, updated_at: new Date().toISOString() },
            { key: 'paused_until', value: '', updated_at: new Date().toISOString() },
          ], { onConflict: 'key' });
        } catch (e) {
          console.error("Erro ao atualizar status da loja:", e);
        }
        setSession(data);
        setOpeningAmount('0.00');
        setClosedResult(null);
        setShowOpenModal(false);
      } else if (error) {
        console.error("Erro ao abrir caixa:", error);
        alert("Erro ao abrir caixa: " + error.message);
      }
    } finally {
      setIsOpening(false);
    }
  };

  const handleDeleteSession = async (id: string) => {
    if (window.confirm('TEM CERTEZA QUE DESEJA EXCLUIR ESTE FECHAMENTO DE CAIXA? Esta ação é irreversível e removerá todas as movimentações associadas a ele.')) {
      try {
        const { error } = await supabase.from('cash_sessions').delete().eq('id', id);
        if (error) throw error;
        setHistory(prev => prev.filter(h => h.id !== id));
      } catch (error: any) {
        console.error('Erro ao excluir sessão:', error);
        alert('Erro ao excluir fechamento: ' + error.message);
      }
    }
  };

  const handleRegisterMovement = async () => {
    setMovementError('');
    const amount = parseFloat(movementAmount);
    if (!amount || amount <= 0) {
      setMovementError('O valor deve ser maior que zero.');
      return;
    }
    
    setIsSubmittingMovement(true);
    const { data: userData } = await supabase.auth.getUser();
    const newMovement = {
      id: `mov-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      session_id: session.id,
      type: movementType,
      amount: amount,
      reason: movementReason || null,
      created_by: userData.user?.id || null,
      created_at: new Date().toISOString()
    };

    let registeredOk = false;

    try {
      const { error } = await supabase.from('cash_movements').insert([newMovement]);
      if (!error) {
        registeredOk = true;
      } else {
        console.warn("Fallback de registro de movimentação ativado (settings):", error.message);
        // Fallback resiliente e seguro na tabela settings para não bloquear o operador
        const { data: settingRow } = await supabase
          .from('settings')
          .select('value')
          .eq('key', `cash_movements_${session.id}`)
          .maybeSingle();

        let currentList: any[] = [];
        try {
          if (settingRow?.value) currentList = JSON.parse(settingRow.value);
        } catch(e) {}
        currentList.unshift(newMovement);

        const { error: setErr } = await supabase.from('settings').upsert({
          key: `cash_movements_${session.id}`,
          value: JSON.stringify(currentList),
          updated_at: new Date().toISOString()
        }, { onConflict: 'key' });

        if (!setErr) {
          registeredOk = true;
        } else {
          throw setErr;
        }
      }
    } catch (err: any) {
      setMovementError(err.message || 'Erro ao registrar movimentação.');
    } finally {
      setIsSubmittingMovement(false);
    }

    if (registeredOk) {
      setShowMovementModal(false);
      setMovementAmount('');
      setMovementReason('');
      await loadMovements();
    }
  };

  const handleClose = async () => {
    const counted = parseFloat(closingAmount) || 0;
    const expected = currentExpected;
    const difference = counted - expected;
    const { data: userData } = await supabase.auth.getUser();
    const { error } = await supabase.from('cash_sessions').update({
      status: 'fechado',
      closed_at: new Date().toISOString(),
      closed_by: userData.user?.id,
      closing_counted_amount: counted,
      expected_amount: expected,
      difference: difference
    }).eq('id', session.id);

    // Automagicamente fechar a loja
    await supabase.from('settings').upsert([
      { key: 'store_status', value: 'closed', updated_at: new Date().toISOString() },
      { key: 'paused_until', value: '', updated_at: new Date().toISOString() },
      { key: 'manual_store_closed', value: true, updated_at: new Date().toISOString() }
    ], { onConflict: 'key' });

    if (!error) {
      // Buscar dados detalhados para o relatório impresso/visual
      const { data: orders } = await supabase
        .from('orders')
        .select('*')
        .gte('created_at', session.opened_at);

      const itemsSummary: Record<string, { qty: number; total: number }> = {};
      const paySummary: Record<string, number> = {};
      let totalVendas = 0;
      let entregaCount = 0;
      let retiradaCount = 0;
      let validOrdersCount = 0;

      (orders || []).forEach((o: any) => {
        if (!isOrderActive(o)) return; // Exclui cancelados
        validOrdersCount++;
        const amt = Number(o.total_amount || 0);
        totalVendas += amt;
        const pm = normalizePaymentMethod(o.payment_method);
        paySummary[pm] = (paySummary[pm] || 0) + amt;

        const oType = normalizeOrderType(o.order_type);
        if (oType === 'retirada' || oType === 'balcao') {
          retiradaCount++;
        } else {
          entregaCount++;
        }

        let rawItems = o.items;
        if (typeof rawItems === 'string') {
          try { rawItems = JSON.parse(rawItems); } catch(e) { rawItems = []; }
        }
        if (Array.isArray(rawItems)) {
          rawItems.forEach((it: any) => {
            const name = it.name || 'Item';
            const qty = Number(it.quantity || 1);
            const price = Number(it.priceCalculated || it.price || 0) * qty;
            if (!itemsSummary[name]) itemsSummary[name] = { qty: 0, total: 0 };
            itemsSummary[name].qty += qty;
            itemsSummary[name].total += price;
          });
        }
      });

      const reportData = {
        openedAt: session.opened_at,
        closedAt: new Date().toISOString(),
        openingAmount: session.opening_amount,
        expected,
        counted,
        difference,
        ordersCount: (orders || []).length,
        totalVendas,
        paySummary,
        itemsSummary,
        entregaCount,
        retiradaCount,
        totalSangrias,
        totalSuprimentos
      };

      setClosedResult(reportData);
      setSession(null);
      setClosingAmount('');
      setShowCloseModal(false);
      loadHistory();
    }
  };

  const handlePrintReport = (report: any) => {
    const printWindow = window.open('', '_blank', 'width=400,height=600');
    if (!printWindow) return;

    const itemsRows = Object.entries(report.itemsSummary || {})
      .map(([name, val]: any) => `<tr><td style="padding:2px 0;">${val.qty}x ${name}</td><td style="text-align:right;padding:2px 0;">R$ ${val.total.toFixed(2).replace('.', ',')}</td></tr>`)
      .join('');

    const payRows = Object.entries(report.paySummary || {})
      .map(([pm, val]: any) => `<div style="display:flex;justify-content:space-between;margin-bottom:2px;"><span>${pm}:</span><span>R$ ${val.toFixed(2).replace('.', ',')}</span></div>`)
      .join('');

    printWindow.document.write(`
      <html>
        <head>
          <title>Relatório de Fechamento de Caixa</title>
          <style>
            :root { --print-text: #44210F; --print-success: #083D07; --print-danger: #be123c; }
            body { font-family: monospace; font-size: 13px; width: 280px; margin: 0 auto; padding: 10px; color: var(--print-text); }
            h2 { text-align: center; margin: 0 0 5px 0; font-size: 16px; font-weight: bold; color: #44210F; }
            p { margin: 2px 0; }
            .line { border-bottom: 1px dashed var(--print-text); margin: 8px 0; }
            .row { display: flex; justify-content: space-between; }
            .bold { font-weight: bold; }
            table { width: 100%; border-collapse: collapse; margin-top: 4px; font-size: 12px; }
          </style>
        </head>
        <body>
          <h2>DOBRO PIZZAS</h2>
          <p style="text-align:center;font-weight:bold;">RELATÓRIO DE FECHAMENTO DE CAIXA</p>
          <div class="line"></div>
          <p><b>Abertura:</b> ${new Date(report.openedAt).toLocaleString('pt-BR')}</p>
          <p><b>Fechamento:</b> ${new Date(report.closedAt).toLocaleString('pt-BR')}</p>
          <div class="line"></div>
          
          <div class="row"><span>Fundo Inicial:</span><span class="bold">R$ ${Number(report.openingAmount).toFixed(2).replace('.', ',')}</span></div>
          <div class="row"><span>Total Pedidos:</span><span class="bold">${report.ordersCount} (${report.entregaCount} Entregas / ${report.retiradaCount} Retiradas)</span></div>
          <div class="row"><span>Total Vendas:</span><span class="bold">R$ ${Number(report.totalVendas).toFixed(2).replace('.', ',')}</span></div>
          ${report.totalSuprimentos > 0 ? `<div class="row"><span>Suprimentos (+):</span><span class="bold" style="color:var(--print-success);">R$ ${Number(report.totalSuprimentos).toFixed(2).replace('.', ',')}</span></div>` : ''}
          ${report.totalSangrias > 0 ? `<div class="row"><span>Sangrias (-):</span><span class="bold" style="color:var(--print-danger);">R$ ${Number(report.totalSangrias).toFixed(2).replace('.', ',')}</span></div>` : ''}
          
          <div class="line"></div>
          <p class="bold">FORMAS DE PAGAMENTO:</p>
          ${payRows}
          
          <div class="line"></div>
          <div class="row"><span>Esperado em Dinheiro:</span><span class="bold">R$ ${Number(report.expected).toFixed(2).replace('.', ',')}</span></div>
          <div class="row"><span>Informado no Caixa:</span><span class="bold">R$ ${Number(report.counted).toFixed(2).replace('.', ',')}</span></div>
          <div class="row"><span>Diferença:</span><span class="bold">${Number(report.difference) >= 0 ? '+' : ''}R$ ${Number(report.difference).toFixed(2).replace('.', ',')}</span></div>
          
          <div class="line"></div>
          <p style="text-align:center;margin-top:15px;">--- FIM DO RELATÓRIO ---</p>
          <script>
            window.onload = function() { window.print(); window.close(); }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  if (loading) return <div className="p-8 text-center text-[#745240] font-mono text-xs">Carregando dados do caixa...</div>;

  return (
    <div className="space-y-4 font-sans">
      {/* 1. Barra Operacional Superior Sofisticada (Status e Ações Rápidas) */}
      {!session ? (
        <div className="space-y-4">
          <div className="bg-[#FDFBF7] rounded-2xl p-4 sm:px-6 sm:py-4 flex flex-col md:flex-row items-center justify-between gap-4 border border-[#E8D8D1] shadow-2xs">
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-[#F6E3DF]/80 text-[#745240] border border-[#E4C5B9] flex items-center justify-center shrink-0 shadow-2xs">
                <Lock className="w-5 h-5 text-[#745240]" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-sm sm:text-base text-[#44210F] tracking-tight leading-none">Caixa Fechado</h3>
                  <span className="bg-[#F6E3DF] text-[#745240] text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded-full border border-[#E4C5B9]">
                    Turno Inativo
                  </span>
                </div>
                <p className="text-xs text-[#745240] font-sans mt-1">Informe o fundo inicial de caixa para abrir o turno e registrar pedidos.</p>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full md:w-auto">
              <button
                onClick={() => setShowOpenModal(true)}
                className="w-full md:w-auto bg-[#44210F] hover:bg-[#32170a] active:scale-[0.98] text-[#FDFBF7] font-bold px-5 py-2.5 rounded-xl text-xs font-mono uppercase tracking-wider transition-all flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer shrink-0 border border-[#D5AF7A]/50 shadow-xs hover:shadow-sm"
              >
                <Unlock className="w-3.5 h-3.5 text-[#D5AF7A]" />
                <span>Abrir Caixa</span>
              </button>
            </div>
          </div>

          {closedResult && (
            <div className="bg-[#FDFBF7] border border-[#E8D8D1] rounded-2xl p-4 sm:p-5 space-y-3.5 shadow-2xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#E8D8D1] pb-3">
                <h4 className="font-bold text-[#44210F] text-xs font-mono uppercase tracking-wider flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-[#745240]" />
                  Resumo do Último Fechamento
                </h4>
                <button
                  onClick={() => handlePrintReport(closedResult)}
                  className="px-3.5 py-1.5 bg-[#44210F] hover:bg-[#32170a] text-[#FDFBF7] border border-[#D5AF7A]/40 rounded-xl text-xs font-mono font-semibold transition-colors flex items-center gap-1.5 self-start sm:self-auto cursor-pointer shadow-xs"
                >
                  <Printer className="w-3.5 h-3.5 text-[#D5AF7A]" />
                  Imprimir Cupom
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                <div className="bg-white p-3 rounded-xl border border-[#E8D8D1] shadow-2xs">
                  <span className="text-[10px] text-[#745240] font-mono font-bold uppercase tracking-wider block">Fundo Inicial</span>
                  <span className="font-bold font-mono tabular-nums text-sm text-[#44210F] mt-1 block">R$ {Number(closedResult.openingAmount || 0).toFixed(2).replace('.', ',')}</span>
                </div>
                <div className="bg-white p-3 rounded-xl border border-[#E8D8D1] shadow-2xs">
                  <span className="text-[10px] text-[#745240] font-mono font-bold uppercase tracking-wider block">Esperado</span>
                  <span className="font-bold font-mono tabular-nums text-sm text-[#44210F] mt-1 block">R$ {Number(closedResult.expected).toFixed(2).replace('.', ',')}</span>
                </div>
                <div className="bg-white p-3 rounded-xl border border-[#E8D8D1] shadow-2xs">
                  <span className="text-[10px] text-[#745240] font-mono font-bold uppercase tracking-wider block">Informado</span>
                  <span className="font-bold font-mono tabular-nums text-sm text-[#44210F] mt-1 block">R$ {Number(closedResult.counted).toFixed(2).replace('.', ',')}</span>
                </div>
                <div className={`p-3 rounded-xl border shadow-2xs ${closedResult.difference >= 0 ? 'bg-emerald-50/70 border-emerald-200' : 'bg-rose-50/70 border-rose-200'}`}>
                  <span className={`text-[10px] font-mono font-bold uppercase tracking-wider block ${closedResult.difference >= 0 ? 'text-emerald-800' : 'text-rose-800'}`}>Diferença</span>
                  <span className={`font-bold font-mono tabular-nums text-sm mt-1 block ${closedResult.difference >= 0 ? 'text-emerald-900' : 'text-rose-900'}`}>
                    {closedResult.difference >= 0 ? '+' : ''}R$ {Number(closedResult.difference).toFixed(2).replace('.', ',')}
                  </span>
                </div>
              </div>

              {closedResult.paySummary && (
                <div className="bg-white p-3 rounded-xl border border-[#E8D8D1] space-y-2">
                  <span className="text-[10px] text-[#745240] font-mono font-bold uppercase tracking-wider block">Discriminação por Pagamento</span>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                    {Object.entries(closedResult.paySummary).map(([pm, val]: any) => (
                      <div key={pm} className="bg-[#FAF7F2] p-2 rounded-lg border border-[#E8D8D1]">
                        <span className="text-[#745240] font-mono block text-[10px]">{pm}</span>
                        <span className="font-bold text-[#44210F] font-mono text-xs mt-0.5 block">R$ {val.toFixed(2).replace('.', ',')}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {/* Barra Operacional Sessão em Andamento */}
          <div className="bg-[#FDFBF7] rounded-2xl p-4 sm:px-6 sm:py-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border border-[#E8D8D1] shadow-2xs">
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-[#E8D8D1]/70 border border-[#D5AF7A]/60 text-[#083D07] flex items-center justify-center shrink-0 shadow-2xs">
                <Unlock className="w-5 h-5 text-[#083D07]" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-sm sm:text-base text-[#44210F] tracking-tight leading-none">Turno em Andamento</h3>
                  <span className="bg-[#E8D8D1] text-[#083D07] text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded-full border border-[#D5AF7A]/50 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#083D07] animate-pulse"></span>
                    Turno Ativo
                  </span>
                </div>
                <p className="text-xs text-[#745240] font-mono mt-1">
                  Aberto às <span className="text-[#44210F] font-bold">{new Date(session.opened_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span> · Fundo Inicial: <span className="text-[#44210F] font-bold">R$ {Number(session.opening_amount).toFixed(2).replace('.', ',')}</span>
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto self-end md:self-auto">
              <button
                onClick={() => {
                  setMovementType('sangria');
                  setShowMovementModal(true);
                }}
                className="bg-white hover:bg-rose-50 text-rose-700 border border-rose-200/80 font-semibold px-3.5 py-2 rounded-xl text-xs font-mono transition-colors flex items-center gap-1.5 shadow-2xs cursor-pointer"
              >
                <ArrowDownCircle className="w-3.5 h-3.5 text-rose-600" />
                <span>Sangria (-)</span>
              </button>
              <button
                onClick={() => {
                  setMovementType('suprimento');
                  setShowMovementModal(true);
                }}
                className="bg-white hover:bg-[#FAF7F2] text-[#083D07] border border-[#E8D8D1] hover:border-[#D5AF7A] font-semibold px-3.5 py-2 rounded-xl text-xs font-mono transition-colors flex items-center gap-1.5 shadow-2xs cursor-pointer"
              >
                <ArrowUpCircle className="w-3.5 h-3.5 text-[#083D07]" />
                <span>Suprimento (+)</span>
              </button>
              <button
                onClick={() => setShowCloseModal(true)}
                className="bg-[#44210F] hover:bg-[#32170a] text-[#FDFBF7] font-semibold px-4 py-2 rounded-xl text-xs font-mono uppercase tracking-wider transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer shrink-0 ml-auto md:ml-0 border border-[#D5AF7A]/40 shadow-xs active:scale-[0.98]"
              >
                <Lock className="w-3.5 h-3.5 text-[#D5AF7A]" />
                <span>Fechar Caixa</span>
              </button>
            </div>
          </div>

          {/* 2. Indicadores Financeiros em Primeiro Plano (5 Cards com Paleta Dobro) */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 sm:gap-3">
            <div className="bg-[#FDFBF7] border border-[#E8D8D1] p-3.5 rounded-xl shadow-2xs flex flex-col justify-between">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] text-[#745240] font-mono font-bold uppercase tracking-wider">Pedidos</span>
                <div className="w-6 h-6 rounded-lg bg-[#E8D8D1]/60 text-[#745240] flex items-center justify-center shrink-0">
                  <ShoppingBag size={12} strokeWidth={1.75} />
                </div>
              </div>
              <p className="text-xl sm:text-2xl font-bold font-mono tabular-nums text-[#44210F] tracking-tight">{summary.count}</p>
            </div>

            <div className="bg-[#FDFBF7] border border-[#E8D8D1] p-3.5 rounded-xl shadow-2xs flex flex-col justify-between">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] text-[#745240] font-mono font-bold uppercase tracking-wider">Dinheiro</span>
                <div className="w-6 h-6 rounded-lg bg-[#E8D8D1]/60 text-[#083D07] flex items-center justify-center shrink-0">
                  <Banknote size={12} strokeWidth={1.75} />
                </div>
              </div>
              <p className="text-xl sm:text-2xl font-bold font-mono tabular-nums text-[#44210F] tracking-tight">R$ {summary.numerario.toFixed(2).replace('.', ',')}</p>
            </div>

            <div className="bg-[#FDFBF7] border border-[#E8D8D1] p-3.5 rounded-xl shadow-2xs flex flex-col justify-between">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] text-[#745240] font-mono font-bold uppercase tracking-wider">Pix</span>
                <div className="w-6 h-6 rounded-lg bg-[#E8D8D1]/60 text-[#745240] flex items-center justify-center shrink-0">
                  <Smartphone size={12} strokeWidth={1.75} />
                </div>
              </div>
              <p className="text-xl sm:text-2xl font-bold font-mono tabular-nums text-[#44210F] tracking-tight">R$ {summary.mbway.toFixed(2).replace('.', ',')}</p>
            </div>

            <div className="bg-[#FDFBF7] border border-[#E8D8D1] p-3.5 rounded-xl shadow-2xs flex flex-col justify-between">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] text-[#745240] font-mono font-bold uppercase tracking-wider">Cartão</span>
                <div className="w-6 h-6 rounded-lg bg-[#E8D8D1]/60 text-[#745240] flex items-center justify-center shrink-0">
                  <CreditCard size={12} strokeWidth={1.75} />
                </div>
              </div>
              <p className="text-xl sm:text-2xl font-bold font-mono tabular-nums text-[#44210F] tracking-tight">R$ {summary.cartao.toFixed(2).replace('.', ',')}</p>
            </div>

            <div className="bg-gradient-to-br from-[#F6E3DF] to-[#E8D8D1]/70 border border-[#D5AF7A] p-3.5 rounded-xl shadow-2xs flex flex-col justify-between col-span-2 sm:col-span-1">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#44210F]">
                  Gaveta (Esperado)
                </span>
                <div className="w-6 h-6 rounded-lg bg-[#44210F] text-[#D5AF7A] flex items-center justify-center shrink-0 shadow-2xs">
                  <Wallet size={12} strokeWidth={1.75} />
                </div>
              </div>
              <p className="text-xl sm:text-2xl font-bold font-mono tabular-nums text-[#44210F] tracking-tight">
                R$ {currentExpected.toFixed(2).replace('.', ',')}
              </p>
            </div>
          </div>

          {/* 3. Movimentações Registradas no Turno */}
          {movements.length > 0 && (
            <div className="border border-[#E8D8D1] rounded-2xl overflow-hidden bg-[#FDFBF7] shadow-2xs">
              <div className="bg-[#FAF7F2] px-4 py-2.5 border-b border-[#E8D8D1] flex items-center justify-between">
                <h4 className="font-bold text-xs text-[#44210F] uppercase font-mono tracking-wider">Movimentações no Turno</h4>
                <span className="text-[10px] font-mono font-bold text-[#745240] bg-[#E8D8D1]/60 border border-[#E8D8D1] px-2 py-0.5 rounded-full">
                  {movements.length} {movements.length === 1 ? 'registro' : 'registros'}
                </span>
              </div>
              <div className="divide-y divide-[#E8D8D1]/60 max-h-48 overflow-y-auto custom-scrollbar">
                {movements.map((mov) => (
                  <div key={mov.id} className="p-3 px-4 flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 hover:bg-[#F6E3DF]/25 transition-colors">
                    <div className="flex items-center gap-2.5">
                      <span className={`text-[9px] font-mono font-bold uppercase px-2 py-0.5 rounded-full border shrink-0 ${mov.type === 'sangria' ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-emerald-50 text-emerald-800 border-emerald-200'}`}>
                        {mov.type}
                      </span>
                      <div className="text-xs">
                        <span className="font-mono text-[#745240]">{new Date(mov.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                        {mov.reason && (
                          <span className="text-[#44210F] font-medium ml-2 text-[11px]">
                            — {mov.reason}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className={`font-mono font-bold tabular-nums text-xs sm:text-right ${mov.type === 'sangria' ? 'text-rose-700' : 'text-emerald-800'}`}>
                      {mov.type === 'sangria' ? '-' : '+'} R$ {Number(mov.amount).toFixed(2).replace('.', ',')}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 4. Histórico de Fechamentos Recentes */}
      <div className="bg-[#FDFBF7] rounded-2xl border border-[#E8D8D1] p-5 sm:p-6 shadow-2xs">
        <div className="mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="font-bold text-sm sm:text-base text-[#44210F] tracking-tight">Histórico de Fechamentos Recentes</h3>
            <span className="text-xs text-[#745240] font-sans">Turnos arquivados e balanços de caixa</span>
          </div>
          <PeriodFilterCompact
            value={historyPeriod}
            startDate={historyStart}
            endDate={historyEnd}
            onChange={(res) => {
              setHistoryPeriod(res.period);
              if (res.startDate !== undefined) setHistoryStart(res.startDate);
              if (res.endDate !== undefined) setHistoryEnd(res.endDate);
            }}
          />
        </div>
        <div className="overflow-x-auto border border-[#E8D8D1] rounded-xl bg-white shadow-2xs">
          <table className="min-w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#E8D8D1] text-[11px] font-mono uppercase tracking-wider text-[#745240] bg-[#FAF7F2] font-bold">
                <th className="py-3 px-4">Data</th>
                <th className="py-3 px-4">Inicial</th>
                <th className="py-3 px-4">Depósito</th>
                <th className="py-3 px-4">Sangria</th>
                <th className="py-3 px-4">Faturado</th>
                <th className="py-3 px-4 text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="text-xs font-mono">
              {history.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-[#745240] font-mono">
                    Nenhum fechamento registrado até o momento.
                  </td>
                </tr>
              ) : (
                history.map((h) => (
                  <tr key={h.id} className="border-b border-[#E8D8D1]/60 hover:bg-[#F6E3DF]/25 transition-colors">
                    <td className="py-3 px-4 text-[#745240] tabular-nums font-sans">
                      {h.opened_at ? new Date(h.opened_at).toLocaleDateString('pt-BR') : '-'}
                    </td>
                    <td className="py-3 px-4 font-bold tabular-nums text-[#44210F]">R$ {Number(h.opening_amount || 0).toFixed(2).replace('.', ',')}</td>
                    <td className="py-3 px-4 font-bold tabular-nums text-[#083D07]">R$ {Number(h.total_suprimentos || 0).toFixed(2).replace('.', ',')}</td>
                    <td className="py-3 px-4 font-bold tabular-nums text-rose-700">R$ {Number(h.total_sangrias || 0).toFixed(2).replace('.', ',')}</td>
                    <td className="py-3 px-4 font-bold tabular-nums text-[#44210F]">R$ {Number(h.total_faturado || 0).toFixed(2).replace('.', ',')}</td>
                    <td className="py-3 px-4 text-right flex items-center justify-end gap-2">
                      <button
                        onClick={() => setSelectedSessionForDetails(h)}
                        className="text-xs font-semibold text-[#745240] bg-[#E8D8D1]/60 hover:bg-[#E8D8D1] border border-[#D5AF7A]/40 p-2 rounded-xl transition-colors inline-flex items-center cursor-pointer shadow-2xs"
                        title="Detalhes do Fechamento"
                      >
                        <Search className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteSession(h.id)}
                        className="text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200/80 p-2 rounded-xl transition-colors inline-flex items-center cursor-pointer shadow-2xs"
                        title="Excluir Fechamento"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de Fechamento de Caixa */}
      {showCloseModal && session && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4"
          onClick={() => setShowCloseModal(false)}
        >
          <div 
            className="bg-[#FDFBF7] rounded-2xl w-full max-w-md border border-[#E8D8D1] shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 sm:p-5 border-b border-[#E8D8D1] bg-[#FAF7F2] flex justify-between items-center">
              <div>
                <h3 className="text-base font-bold flex items-center gap-2 tracking-tight text-[#44210F]">
                  <Lock className="w-4 h-4 text-rose-600" />
                  Fechamento e Conferência de Caixa
                </h3>
                <p className="text-xs text-[#745240] font-sans mt-0.5">Validação física da gaveta de dinheiro</p>
              </div>
            </div>
            
            <div className="p-5 space-y-4">
              <div className="bg-white border border-[#E8D8D1] rounded-xl p-4 space-y-2 text-xs font-mono shadow-2xs">
                <div className="flex justify-between text-[#745240]">
                  <span>Fundo Inicial de Abertura</span>
                  <span className="font-bold text-[#44210F]">R$ {Number(session.opening_amount).toFixed(2).replace('.', ',')}</span>
                </div>
                <div className="flex justify-between text-[#745240]">
                  <span>(+) Vendas em Dinheiro</span>
                  <span className="font-bold text-[#44210F]">+ R$ {summary.numerario.toFixed(2).replace('.', ',')}</span>
                </div>
                {totalSuprimentos > 0 && (
                  <div className="flex justify-between text-emerald-800">
                    <span>(+) Suprimentos de Caixa</span>
                    <span className="font-bold">+ R$ {totalSuprimentos.toFixed(2).replace('.', ',')}</span>
                  </div>
                )}
                {totalSangrias > 0 && (
                  <div className="flex justify-between text-rose-700">
                    <span>(-) Sangrias Realizadas</span>
                    <span className="font-bold">- R$ {totalSangrias.toFixed(2).replace('.', ',')}</span>
                  </div>
                )}
                <div className="pt-2 border-t border-[#E8D8D1] flex justify-between font-bold text-[#44210F] text-sm">
                  <span>(=) Esperado em Dinheiro</span>
                  <span className="text-base">R$ {currentExpected.toFixed(2).replace('.', ',')}</span>
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="closingAmountInput" className="block text-[11px] font-bold font-mono text-[#745240] uppercase tracking-wider">
                  Valor Contado Fisicamente (R$)
                </label>
                <div className="relative">
                  <input
                    id="closingAmountInput"
                    type="number"
                    step="0.01"
                    value={closingAmount}
                    onChange={(e) => setClosingAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full text-center text-3xl font-mono font-bold py-3 bg-white border-2 border-[#E8D8D1] rounded-xl focus:border-[#D5AF7A] focus:ring-1 focus:ring-[#D5AF7A]/40 focus:outline-none transition-colors tracking-tight text-[#44210F]"
                    autoFocus
                  />
                </div>
              </div>

              {closingAmount !== '' && (
                <div className="bg-white border border-[#E8D8D1] rounded-xl p-3 flex justify-between items-center font-mono shadow-2xs">
                  <span className="text-xs text-[#745240] font-semibold">Diferença de Caixa:</span>
                  <span className={`text-base font-bold tabular-nums ${(Number(closingAmount) - currentExpected) >= 0 ? 'text-emerald-800' : 'text-rose-700'}`}>
                    {(Number(closingAmount) - currentExpected) >= 0 ? '+' : ''}
                    R$ {(Number(closingAmount) - currentExpected).toFixed(2).replace('.', ',')}
                  </span>
                </div>
              )}
            </div>

            <div className="p-4 bg-[#FAF7F2] border-t border-[#E8D8D1] flex gap-2.5">
              <button
                onClick={() => setShowCloseModal(false)}
                className="flex-1 px-4 py-2.5 bg-white border border-[#E8D8D1] text-[#745240] font-semibold rounded-xl hover:bg-[#FDFBF7] transition-colors text-xs font-mono cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handleClose}
                disabled={closingAmount === ''}
                className="flex-1 px-4 py-2.5 bg-[#44210F] text-[#FDFBF7] font-bold rounded-xl hover:bg-[#32170a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 text-xs font-mono uppercase tracking-wider cursor-pointer border border-[#D5AF7A]/40 shadow-xs"
              >
                <Lock className="w-3.5 h-3.5 text-[#D5AF7A]" />
                Confirmar Fechamento
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Movimentação */}
      {showMovementModal && session && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4"
          onClick={() => setShowMovementModal(false)}
        >
          <div 
            className="bg-[#FDFBF7] rounded-2xl w-full max-w-md border border-[#E8D8D1] shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 sm:p-5 border-b border-[#E8D8D1] bg-[#FAF7F2] flex justify-between items-center">
              <div>
                <h3 className="text-sm sm:text-base font-bold flex items-center gap-2 tracking-tight text-[#44210F]">
                  {movementType === 'sangria' ? (
                    <ArrowDownCircle className="w-5 h-5 text-rose-600" />
                  ) : (
                    <ArrowUpCircle className="w-5 h-5 text-[#083D07]" />
                  )}
                  {movementType === 'sangria' ? 'Registrar Sangria (Retirada)' : 'Registrar Suprimento (Entrada)'}
                </h3>
                <p className="text-xs text-[#745240] font-sans mt-0.5">
                  {movementType === 'sangria' ? 'Saída de dinheiro físico da gaveta' : 'Reforço de dinheiro físico na gaveta'}
                </p>
              </div>
            </div>
            
            <div className="p-5 space-y-4">
              {movementError && (
                <div className="bg-rose-50 border border-rose-200 p-3 rounded-xl flex gap-2 text-xs font-mono text-rose-700">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <p>{movementError}</p>
                </div>
              )}

              <div className="space-y-1.5">
                <label htmlFor="movementAmountInput" className="block text-[11px] font-bold font-mono text-[#745240] uppercase tracking-wider">
                  Valor da Movimentação (R$) <span className="text-rose-600">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#745240] font-mono font-semibold text-base">R$</span>
                  <input
                    id="movementAmountInput"
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={movementAmount}
                    onChange={(e) => setMovementAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full text-xl font-mono font-bold pl-10 pr-4 py-2.5 bg-white border-2 border-[#E8D8D1] rounded-xl focus:border-[#D5AF7A] focus:ring-1 focus:ring-[#D5AF7A]/40 focus:outline-none transition-colors tracking-tight text-[#44210F] placeholder-[#745240]/40"
                    autoFocus
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="movementReasonInput" className="block text-[11px] font-bold font-mono text-[#745240] uppercase tracking-wider">
                  Motivo / Justificativa (Opcional)
                </label>
                <input
                  id="movementReasonInput"
                  type="text"
                  value={movementReason}
                  onChange={(e) => setMovementReason(e.target.value)}
                  placeholder={movementType === 'sangria' ? 'Ex: Pagamento fornecedor hortifrúti' : 'Ex: Troco inicial extra'}
                  className="w-full text-xs font-sans py-2.5 px-3 bg-white border border-[#E8D8D1] rounded-xl focus:border-[#D5AF7A] focus:ring-1 focus:ring-[#D5AF7A]/40 focus:outline-none transition-colors placeholder-[#745240]/40 text-[#44210F]"
                />
              </div>
            </div>

            <div className="p-4 bg-[#FAF7F2] border-t border-[#E8D8D1] flex gap-2.5">
              <button
                onClick={() => {
                  setShowMovementModal(false);
                  setMovementError('');
                }}
                disabled={isSubmittingMovement}
                className="flex-1 px-4 py-2.5 bg-white border border-[#E8D8D1] text-[#745240] font-semibold rounded-xl hover:bg-[#FDFBF7] transition-colors text-xs font-mono cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handleRegisterMovement}
                disabled={movementAmount === '' || parseFloat(movementAmount) <= 0 || isSubmittingMovement}
                className={`flex-1 px-4 py-2.5 text-white font-bold rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 text-xs font-mono uppercase tracking-wider cursor-pointer ${movementType === 'sangria' ? 'bg-rose-700 hover:bg-rose-800' : 'bg-[#44210F] hover:bg-[#32170a] text-[#FDFBF7] border border-[#D5AF7A]/50'}`}
              >
                {isSubmittingMovement ? 'Gravando...' : 'Confirmar Registro'}
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedSessionForDetails && (
        <CashSessionDetailsModal 
          session={selectedSessionForDetails} 
          onClose={() => setSelectedSessionForDetails(null)} 
        />
      )}

      {/* Modal de Abertura de Caixa */}
      {showOpenModal && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4"
          onClick={() => setShowOpenModal(false)}
        >
          <div 
            className="bg-[#FDFBF7] rounded-2xl w-full max-w-sm border border-[#E8D8D1] shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 sm:p-5 border-b border-[#E8D8D1] bg-[#FAF7F2] flex justify-between items-center">
              <div>
                <h3 className="text-base font-bold flex items-center gap-2 tracking-tight text-[#44210F]">
                  <Unlock className="w-4 h-4 text-[#D5AF7A]" />
                  Abertura de Caixa
                </h3>
                <p className="text-xs text-[#745240] font-sans mt-0.5">Informe o fundo inicial em dinheiro na gaveta</p>
              </div>
            </div>
            
            <div className="p-5 space-y-4">
              <div className="space-y-2">
                <label htmlFor="openingAmountInput" className="block text-[11px] font-bold font-mono text-[#745240] uppercase tracking-wider">
                  Fundo de Caixa (R$)
                </label>
                <div className="relative">
                  <input
                    id="openingAmountInput"
                    type="number"
                    step="0.01"
                    min="0"
                    value={openingAmount}
                    onChange={(e) => setOpeningAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full text-center text-3xl font-mono font-bold py-3 bg-white border-2 border-[#E8D8D1] rounded-xl focus:border-[#D5AF7A] focus:ring-1 focus:ring-[#D5AF7A]/40 focus:outline-none transition-colors tracking-tight text-[#44210F]"
                    autoFocus
                  />
                </div>
              </div>
            </div>

            <div className="p-4 bg-[#FAF7F2] border-t border-[#E8D8D1] flex gap-2.5">
              <button
                onClick={() => setShowOpenModal(false)}
                className="flex-1 px-4 py-2.5 bg-white border border-[#E8D8D1] text-[#745240] font-semibold rounded-xl hover:bg-[#FDFBF7] transition-colors text-xs font-mono cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handleOpen}
                disabled={isOpening || (openingAmount !== '' && parseFloat(openingAmount) < 0)}
                className="flex-1 px-4 py-2.5 bg-[#44210F] hover:bg-[#32170a] text-[#FDFBF7] font-bold rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-50 text-xs font-mono tracking-wider uppercase border border-[#D5AF7A]/50 shadow-xs cursor-pointer"
              >
                {isOpening ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-[#D5AF7A] border-t-transparent rounded-full animate-spin" />
                    <span>Abrindo...</span>
                  </>
                ) : (
                  <>
                    <Unlock className="w-4 h-4 text-[#D5AF7A]" />
                    <span>Confirmar</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
