import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../lib/supabase';
import { 
  X, Search, ShoppingBag, 
  User, CreditCard, Calendar, ChevronDown, 
  Printer, Receipt, Clock, Bike, UtensilsCrossed,
  Layers, CheckCircle2, Wallet, DollarSign,
  TrendingUp, ArrowLeftRight, Sparkles, Filter, MapPin,
  Banknote, Smartphone
} from 'lucide-react';
import { format, differenceInMinutes } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { normalizePaymentMethod, normalizeOrderType, isOrderActive } from '../../utils/paymentAndOrderHelper';
import { formatItemNameForPrint } from '../../utils/printHelpers';

interface CashSessionDetailsModalProps {
  session: any;
  onClose: () => void;
}

const safeParseItems = (items: any): any[] => {
  if (!items) return [];
  if (Array.isArray(items)) return items;
  if (typeof items === 'string') {
    try {
      const parsed = JSON.parse(items);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      return [];
    }
  }
  return [];
};

export default function CashSessionDetailsModal({ session, onClose }: CashSessionDetailsModalProps) {
  const [sessionDetails, setSessionDetails] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'balanco' | 'pedidos'>('balanco');
  const [expandedOrderId, setExpandedOrderId] = useState<any | null>(null);
  const [orderSearch, setOrderSearch] = useState('');
  const [orderTypeFilter, setOrderTypeFilter] = useState<'todos' | 'entrega' | 'mesa' | 'retirada'>('todos');
  const [selectedReceiptOrder, setSelectedReceiptOrder] = useState<any | null>(null);

  useEffect(() => {
    if (session?.id) {
      loadSessionDetails(session.id);
    }
  }, [session]);

  // Dismiss on ESC (closes submodal receipt first if open, or modal itself)
  useEffect(() => {
    if (!session) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (selectedReceiptOrder) {
          setSelectedReceiptOrder(null);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [session, selectedReceiptOrder, onClose]);

  const loadSessionDetails = async (sessionId: string) => {
    setLoading(true);

    // 1. Busca por cash_session_id
    const { data: ordersBySession } = await supabase
      .from('orders')
      .select('*')
      .eq('cash_session_id', sessionId);

    // 2. Busca por intervalo temporal da sessão
    let ordersByTime: any[] = [];
    if (session.opened_at) {
      const { data: timeOrders } = await supabase
        .from('orders')
        .select('*')
        .gte('created_at', session.opened_at)
        .lte('created_at', session.closed_at || new Date().toISOString());
      ordersByTime = timeOrders || [];
    }

    // 3. Mescla e deduplica pedidos
    const ordersMap = new Map();
    (ordersBySession || []).forEach(o => ordersMap.set(o.id, o));
    (ordersByTime || []).forEach(o => ordersMap.set(o.id, o));

    const combinedOrders = Array.from(ordersMap.values()).sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    let movementsData: any[] = [];
    try {
      const { data: movements, error } = await supabase
        .from('cash_movements')
        .select('*')
        .eq('session_id', sessionId);
      if (!error && movements) {
        movementsData = movements;
      } else {
        throw error;
      }
    } catch (e) {
      const { data: setRow } = await supabase
        .from('settings')
        .select('value')
        .eq('key', `cash_movements_${sessionId}`)
        .maybeSingle();
      if (setRow?.value) {
        try { movementsData = JSON.parse(setRow.value); } catch(err) { movementsData = []; }
      }
    }

    setSessionDetails({
      orders: combinedOrders.filter(isOrderActive),
      movements: movementsData || []
    });
    setLoading(false);
  };

  const toggleExpandOrder = (orderId: any) => {
    setExpandedOrderId(prev => (prev === orderId ? null : orderId));
  };

  // Cálculos Consolidados do Caixa
  const summary = useMemo(() => {
    const orders = sessionDetails?.orders || [];
    const movements = sessionDetails?.movements || [];

    const totalOrdersCount = orders.length;
    const totalRevenue = orders.reduce((sum: number, o: any) => sum + Number(o.total_amount || o.totalAmount || 0), 0);

    // Canais
    const entregaOrders = orders.filter((o: any) => normalizeOrderType(o.order_type || o.orderType) === 'entrega');
    const mesaOrders = orders.filter((o: any) => normalizeOrderType(o.order_type || o.orderType) === 'mesa');
    const retiradaOrders = orders.filter((o: any) => ['retirada', 'balcao'].includes(normalizeOrderType(o.order_type || o.orderType)));

    const entregaTotal = entregaOrders.reduce((sum: number, o: any) => sum + Number(o.total_amount || o.totalAmount || 0), 0);
    const mesaTotal = mesaOrders.reduce((sum: number, o: any) => sum + Number(o.total_amount || o.totalAmount || 0), 0);
    const retiradaTotal = retiradaOrders.reduce((sum: number, o: any) => sum + Number(o.total_amount || o.totalAmount || 0), 0);

    // Pagamentos
    const paymentTotals: Record<string, number> = {};
    orders.forEach((o: any) => {
      const pm = normalizePaymentMethod(o.payment_method || o.paymentMethod);
      paymentTotals[pm] = (paymentTotals[pm] || 0) + Number(o.total_amount || o.totalAmount || 0);
    });

    const totalDinheiro = paymentTotals['Numerário'] || 0;

    // Movimentações manuais
    const suprimentosTotal = movements
      .filter((m: any) => m.type === 'suprimento')
      .reduce((a: number, m: any) => a + Number(m.amount || 0), 0);

    const sangriasTotal = movements
      .filter((m: any) => m.type === 'sangria')
      .reduce((a: number, m: any) => a + Number(m.amount || 0), 0);

    // Conferência física
    const fundoInicial = Number(session.opening_amount || 0);
    const expectedCash = fundoInicial + totalDinheiro + suprimentosTotal - sangriasTotal;
    const countedCash = Number(session.closing_counted_amount || 0);
    const difference = Number(session.difference_amount || 0);

    // Duração da sessão
    let durationText = 'Em andamento';
    if (session.opened_at) {
      const end = session.closed_at ? new Date(session.closed_at) : new Date();
      const diffMins = differenceInMinutes(end, new Date(session.opened_at));
      const hours = Math.floor(diffMins / 60);
      const mins = diffMins % 60;
      durationText = `${hours}h ${mins}m`;
    }

    return {
      totalOrdersCount,
      totalRevenue,
      entrega: { count: entregaOrders.length, total: entregaTotal, orders: entregaOrders },
      mesa: { count: mesaOrders.length, total: mesaTotal, orders: mesaOrders },
      retirada: { count: retiradaOrders.length, total: retiradaTotal, orders: retiradaOrders },
      paymentTotals,
      totalDinheiro,
      suprimentosTotal,
      sangriasTotal,
      netManualMovements: suprimentosTotal - sangriasTotal,
      fundoInicial,
      expectedCash,
      countedCash,
      difference,
      durationText
    };
  }, [sessionDetails, session]);

  // Filtragem dos pedidos da sessão
  const filteredOrders = useMemo(() => {
    if (!sessionDetails?.orders) return [];
    return sessionDetails.orders.filter((order: any) => {
      // Filtro por tipo
      if (orderTypeFilter !== 'todos') {
        const normType = normalizeOrderType(order.order_type || order.orderType);
        if (orderTypeFilter === 'entrega' && normType !== 'entrega') return false;
        if (orderTypeFilter === 'mesa' && normType !== 'mesa') return false;
        if (orderTypeFilter === 'retirada' && !['retirada', 'balcao'].includes(normType)) return false;
      }

      // Filtro de busca textual
      if (orderSearch.trim()) {
        const query = orderSearch.toLowerCase().trim();
        const idMatch = String(order.id).toLowerCase().includes(query);
        const nameMatch = (order.customer_name || order.customerName || '').toLowerCase().includes(query);
        const phoneMatch = (order.customer_phone || order.customerPhone || '').toLowerCase().includes(query);
        const addressMatch = (order.delivery_address || order.deliveryAddress || '').toLowerCase().includes(query);
        const paymentMatch = (order.payment_method || order.paymentMethod || '').toLowerCase().includes(query);
        
        const items = safeParseItems(order.items);
        const itemMatch = items.some((it: any) => (it.name || '').toLowerCase().includes(query));

        if (!idMatch && !nameMatch && !phoneMatch && !addressMatch && !paymentMatch && !itemMatch) {
          return false;
        }
      }

      return true;
    });
  }, [sessionDetails?.orders, orderTypeFilter, orderSearch]);

  const totalFilteredRevenue = useMemo(() => {
    return filteredOrders.reduce((sum: number, o: any) => sum + Number(o.total_amount || o.totalAmount || 0), 0);
  }, [filteredOrders]);

  if (!session) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-3 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#111110] rounded-none sm:rounded-xl w-full h-full sm:h-auto sm:max-w-[1380px] sm:max-h-[95vh] flex flex-col shadow-2xl border-0 sm:border border-stone-800 relative overflow-hidden">
        
        {/* CABEÇALHO ULTRA DENSO (BOLDER) */}
        <div className="px-3.5 py-1.5 bg-[#0a0a09] border-b border-stone-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 shrink-0">
          <div className="flex items-center gap-2.5">
            <span className={`w-2 h-2 rounded-full ${session.status === 'fechado' ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'}`} />
            <h2 className="font-mono font-bold text-white text-base sm:text-lg tracking-tight flex items-center gap-2">
              FECHAMENTO
            </h2>
            <span className={`text-[9.5px] font-mono font-bold px-2 py-0.5 rounded uppercase border ${
              session.status === 'fechado' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
            }`}>
              {session.status === 'fechado' ? 'FECHADO' : 'EM ABERTO'}
            </span>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex bg-stone-900 rounded p-1 border border-stone-800">
              <button onClick={() => setActiveTab('balanco')} className={`px-3 py-1 text-xs font-mono font-bold rounded ${activeTab === 'balanco' ? 'bg-[#fdde58] text-black' : 'text-stone-400 hover:text-white'}`}>BALANÇO</button>
              <button onClick={() => setActiveTab('pedidos')} className={`px-3 py-1 text-xs font-mono font-bold rounded flex items-center gap-1.5 ${activeTab === 'pedidos' ? 'bg-[#fdde58] text-black' : 'text-stone-400 hover:text-white'}`}>
                PEDIDOS <span className={`px-1.5 py-0.5 rounded text-[9px] ${activeTab === 'pedidos' ? 'bg-black/20' : 'bg-stone-800'}`}>{summary.totalOrdersCount}</span>
              </button>
            </div>
            <button onClick={onClose} className="p-1.5 text-stone-400 hover:text-white bg-stone-900 hover:bg-stone-800 rounded transition-colors"><X size={16} /></button>
          </div>
        </div>

        {/* ESTATÍSTICAS INLINE NO TOPO */}
        {activeTab === 'balanco' && (
          <div className="px-3 py-1 bg-stone-900/60 border-b border-stone-800 flex items-center justify-between gap-3 shrink-0 overflow-x-auto no-scrollbar">
            <div className="flex gap-4 sm:gap-6 min-w-max">
              <div className="flex flex-col">
                <span className="text-[9px] font-mono text-stone-500 uppercase tracking-wider">Faturamento Bruto</span>
                <span className="font-mono text-white font-bold text-xs sm:text-sm leading-tight">€ {summary.totalRevenue.toFixed(2)}</span>
              </div>
              <div className="flex flex-col border-l border-stone-800 pl-4 sm:pl-6">
                <span className="text-[9px] font-mono text-stone-500 uppercase tracking-wider">Numerário</span>
                <span className="font-mono text-emerald-400 font-bold text-xs sm:text-sm leading-tight">€ {summary.totalDinheiro.toFixed(2)}</span>
              </div>
              <div className="flex flex-col border-l border-stone-800 pl-4 sm:pl-6">
                <span className="text-[9px] font-mono text-stone-500 uppercase tracking-wider">MB Way</span>
                <span className="font-mono text-blue-400 font-bold text-xs sm:text-sm leading-tight">€ {(summary.paymentTotals['MB Way'] || summary.paymentTotals['MBWAY'] || summary.paymentTotals['mbway'] || 0).toFixed(2)}</span>
              </div>
              <div className="flex flex-col border-l border-stone-800 pl-4 sm:pl-6">
                <span className="text-[9px] font-mono text-[#fdde58]/70 uppercase tracking-wider">Caixa (Fundo + Vendas)</span>
                <span className="font-mono text-[#fdde58] font-bold text-xs sm:text-sm leading-tight">€ {(summary.fundoInicial + summary.totalDinheiro).toFixed(2)}</span>
              </div>
            </div>
            
            <div className="text-[9px] font-mono text-stone-500 flex gap-2.5 text-right shrink-0">
              <span>ABERTURA: {format(new Date(session.opened_at), "HH:mm", { locale: ptBR })}</span>
              {session.closed_at && <span>FECHAMENTO: {format(new Date(session.closed_at), "HH:mm", { locale: ptBR })}</span>}
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto bg-[#111110]">
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center text-stone-500">
              <div className="w-8 h-8 border-2 border-stone-800 border-t-[#fdde58] rounded-full animate-spin mb-4" />
              <p className="font-mono text-xs uppercase tracking-widest">Auditando Sessão...</p>
            </div>
          ) : activeTab === 'balanco' ? (
            
            /* ========================================================= */
            /* ABA 1: BALANÇO & CONFERÊNCIA FINANCEIRA (GRID COMPACTA ZERO SCROLL) */
            /* ========================================================= */
            <div className="p-2 sm:p-2.5 grid grid-cols-1 lg:grid-cols-3 gap-2 items-start">
              
              {/* COLUNA 1: CANAIS */}
              <div className="bg-stone-900 border border-stone-800 rounded-lg p-2 flex flex-col">
                <h3 className="font-mono text-[9px] text-stone-500 uppercase tracking-widest mb-1.5 border-b border-stone-800 pb-1 flex items-center gap-1.5">
                  <Sparkles size={11} className="text-[#fdde58]" /> Canais de Atendimento
                </h3>
                <div className="space-y-1.5 flex-1">
                  
                  {/* Entrega */}
                  <div className="p-1.5 sm:p-2 rounded bg-black/40 border border-stone-800/60">
                    <div className="flex justify-between items-center mb-0.5">
                      <span className="font-mono text-[11px] font-bold text-stone-300 flex items-center gap-1.5">
                        <Bike size={12} className="text-amber-500" /> ENTREGA
                      </span>
                      <span className="font-mono text-xs sm:text-sm font-bold text-white">€ {summary.entrega.total.toFixed(2)}</span>
                    </div>
                    <div className="text-[9px] font-mono text-stone-500 flex justify-between items-center">
                      <span>{summary.entrega.count} pedidos</span>
                      {summary.entrega.count > 0 && <span className="truncate max-w-[180px]">{Object.entries(summary.entrega.orders.reduce((acc, o) => { const pm = normalizePaymentMethod(o.payment_method || o.paymentMethod); acc[pm] = (acc[pm] || 0) + Number(o.total_amount || o.totalAmount || 0); return acc; }, {})).map(([pm, val]) => `${pm} €${val.toFixed(2)}`).join(' | ')}</span>}
                    </div>
                  </div>

                  {/* Mesa */}
                  <div className="p-1.5 sm:p-2 rounded bg-black/40 border border-stone-800/60">
                    <div className="flex justify-between items-center mb-0.5">
                      <span className="font-mono text-[11px] font-bold text-stone-300 flex items-center gap-1.5">
                        <UtensilsCrossed size={12} className="text-emerald-500" /> MESA
                      </span>
                      <span className="font-mono text-xs sm:text-sm font-bold text-white">€ {summary.mesa.total.toFixed(2)}</span>
                    </div>
                    <div className="text-[9px] font-mono text-stone-500 flex justify-between items-center">
                      <span>{summary.mesa.count} pedidos</span>
                      {summary.mesa.count > 0 && <span className="truncate max-w-[180px]">{Object.entries(summary.mesa.orders.reduce((acc, o) => { const pm = normalizePaymentMethod(o.payment_method || o.paymentMethod); acc[pm] = (acc[pm] || 0) + Number(o.total_amount || o.totalAmount || 0); return acc; }, {})).map(([pm, val]) => `${pm} €${val.toFixed(2)}`).join(' | ')}</span>}
                    </div>
                  </div>

                  {/* Retirada */}
                  <div className="p-1.5 sm:p-2 rounded bg-black/40 border border-stone-800/60">
                    <div className="flex justify-between items-center mb-0.5">
                      <span className="font-mono text-[11px] font-bold text-stone-300 flex items-center gap-1.5">
                        <ShoppingBag size={12} className="text-sky-500" /> RETIRADA
                      </span>
                      <span className="font-mono text-xs sm:text-sm font-bold text-white">€ {summary.retirada.total.toFixed(2)}</span>
                    </div>
                    <div className="text-[9px] font-mono text-stone-500 flex justify-between items-center">
                      <span>{summary.retirada.count} pedidos</span>
                      {summary.retirada.count > 0 && <span className="truncate max-w-[180px]">{Object.entries(summary.retirada.orders.reduce((acc, o) => { const pm = normalizePaymentMethod(o.payment_method || o.paymentMethod); acc[pm] = (acc[pm] || 0) + Number(o.total_amount || o.totalAmount || 0); return acc; }, {})).map(([pm, val]) => `${pm} €${val.toFixed(2)}`).join(' | ')}</span>}
                    </div>
                  </div>

                </div>
              </div>

              {/* COLUNA 2: PAGAMENTOS E MOVS */}
              <div className="bg-stone-900 border border-stone-800 rounded-lg p-2 flex flex-col gap-1.5">
                
                {/* Pagamentos */}
                <div>
                  <h3 className="font-mono text-[9px] text-stone-500 uppercase tracking-widest mb-1.5 border-b border-stone-800 pb-1 flex items-center gap-1.5">
                    <CreditCard size={11} /> Recebimentos
                  </h3>
                  <div className="space-y-1.5">
                    {Object.entries(summary.paymentTotals).map(([pm, val]: any) => {
                      const pct = summary.totalRevenue > 0 ? (val / summary.totalRevenue) * 100 : 0;
                      return (
                        <div key={pm}>
                          <div className="flex justify-between text-[11px] font-mono mb-0.5">
                            <span className="text-stone-300">{pm}</span>
                            <span className="font-bold text-white">€ {val.toFixed(2)}</span>
                          </div>
                          <div className="h-1 w-full bg-stone-800 rounded-full overflow-hidden">
                            <div className="h-full bg-stone-400" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Movimentações */}
                <div className="flex-1 mt-0.5 border-t border-stone-800 pt-1.5">
                  <h3 className="font-mono text-[9px] text-stone-500 uppercase tracking-widest mb-1 border-b border-stone-800 pb-0.5">Movimentações Avulsas</h3>
                  <div className="grid grid-cols-2 gap-1.5 mb-1">
                    <div className="bg-emerald-950/30 border border-emerald-900/50 px-2 py-1 rounded">
                      <span className="text-[8.5px] font-mono text-emerald-500 block leading-tight">SUPRIMENTOS</span>
                      <span className="text-emerald-400 font-mono font-bold text-xs leading-tight">+ €{summary.suprimentosTotal.toFixed(2)}</span>
                    </div>
                    <div className="bg-rose-950/30 border border-rose-900/50 px-2 py-1 rounded">
                      <span className="text-[8.5px] font-mono text-rose-500 block leading-tight">SANGRIAS</span>
                      <span className="text-rose-400 font-mono font-bold text-xs leading-tight">- €{summary.sangriasTotal.toFixed(2)}</span>
                    </div>
                  </div>
                  <div className="max-h-16 overflow-y-auto pr-1 space-y-0.5">
                    {sessionDetails?.movements && sessionDetails.movements.length > 0 ? (
                      sessionDetails.movements.map((m: any, idx: number) => (
                        <div key={idx} className="flex justify-between text-[9px] font-mono">
                          <span className="text-stone-400 uppercase truncate max-w-[150px]">{m.type} {m.notes ? `(${m.notes})` : ''}</span>
                          <span className={m.type === 'suprimento' ? 'text-emerald-400' : 'text-rose-400'}>{m.type === 'suprimento' ? '+' : '-'}€{Number(m.amount||0).toFixed(2)}</span>
                        </div>
                      ))
                    ) : (
                      <span className="text-[9px] font-mono text-stone-500 italic">Nenhuma movimentação avulsa</span>
                    )}
                  </div>
                </div>

              </div>

              {/* COLUNA 3: AUDITORIA GAVETA */}
              <div className="bg-[#1a1a18] border border-[#fdde58]/20 rounded-lg p-2 flex flex-col shadow-[inset_0_0_20px_rgba(253,222,88,0.02)]">
                <div className="flex items-center justify-between border-b border-stone-800 pb-1 mb-1.5">
                  <h3 className="font-mono text-[9px] text-[#fdde58] uppercase tracking-widest flex items-center gap-1.5">
                    <Wallet size={11} /> Auditoria da Gaveta
                  </h3>
                  <span className={`text-[8.5px] font-mono font-bold px-1.5 py-0.5 rounded uppercase border ${summary.difference === 0 ? 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10' : 'text-rose-400 border-rose-500/30 bg-rose-500/10'}`}>
                    {summary.difference === 0 ? 'EXATA' : summary.difference < 0 ? `FALTA €${Math.abs(summary.difference).toFixed(2)}` : `SOBRA €${summary.difference.toFixed(2)}`}
                  </span>
                </div>

                <div className="space-y-1 mb-1.5">
                  <div className="flex justify-between items-center px-2 py-1 rounded bg-stone-900/80 border border-stone-800/50">
                    <span className="text-[9px] font-mono text-stone-400">FUNDO ABERTURA</span>
                    <span className="font-mono text-xs text-stone-200">€ {summary.fundoInicial.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center px-2 py-1 rounded bg-stone-900/80 border border-stone-800/50">
                    <span className="text-[9px] font-mono text-stone-400">(+) DINHEIRO VENDAS</span>
                    <span className="font-mono text-xs text-emerald-400">+ € {summary.totalDinheiro.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center px-2 py-1 rounded bg-stone-900/80 border border-stone-800/50">
                    <span className="text-[9px] font-mono text-stone-400">(+/-) MOVS MANUAIS</span>
                    <span className={`font-mono text-xs ${summary.netManualMovements >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {summary.netManualMovements >= 0 ? '+' : ''}€ {summary.netManualMovements.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center px-2 py-1.5 rounded bg-[#fdde58]/10 border border-[#fdde58]/30 mt-0.5 shadow-[0_0_15px_rgba(253,222,88,0.05)]">
                    <span className="text-[9px] font-mono text-[#fdde58] font-bold">(=) SALDO ESPERADO</span>
                    <span className="font-mono text-sm font-bold text-[#fdde58]">€ {summary.expectedCash.toFixed(2)}</span>
                  </div>
                </div>

                {session.status === 'fechado' && (
                  <div className="mt-0.5 border-t border-stone-800 pt-1.5 space-y-1">
                    <div className="flex justify-between items-center px-1">
                      <span className="text-[9px] font-mono text-stone-400">VALOR CONTADO:</span>
                      <span className="font-mono text-xs font-bold text-white bg-stone-800 px-2 py-0.5 rounded border border-stone-700">€ {summary.countedCash.toFixed(2)}</span>
                    </div>
                    <div className={`flex justify-between items-center px-2 py-1 rounded ${summary.difference === 0 ? 'bg-emerald-950/40 text-emerald-400 border border-emerald-900/50' : 'bg-rose-950/40 text-rose-400 border border-rose-900/50'}`}>
                      <span className="text-[9px] font-mono font-bold uppercase">Diferença:</span>
                      <span className="font-mono text-sm font-black">{summary.difference >= 0 ? '+' : ''}€ {summary.difference.toFixed(2)}</span>
                    </div>
                  </div>
                )}
              </div>

            </div>


          ) : (
            
            /* ========================================================= */
            /* ABA 2: LISTA DE PEDIDOS DO TURNO (COCKPIT DE AUDITORIA) */
            /* ========================================================= */
            <div className="p-2 sm:p-2.5 space-y-2">
              
              {/* Barra de Controles & Busca Rápida */}
              <div className="bg-white rounded-xl border border-stone-200/80 p-2 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2">
                
                {/* Segmented Filter Pills */}
                <div className="inline-flex bg-stone-100 p-0.5 rounded-lg border border-stone-200 text-xs font-mono overflow-x-auto">
                  <button
                    onClick={() => setOrderTypeFilter('todos')}
                    className={`px-2.5 py-1 rounded-md font-bold transition-all cursor-pointer whitespace-nowrap text-[11px] ${
                      orderTypeFilter === 'todos' ? 'bg-stone-900 text-white shadow-xs' : 'text-stone-600 hover:text-stone-900'
                    }`}
                  >
                    Todos ({sessionDetails?.orders?.length || 0})
                  </button>
                  <button
                    onClick={() => setOrderTypeFilter('entrega')}
                    className={`px-2.5 py-1 rounded-md font-bold transition-all cursor-pointer flex items-center gap-1 whitespace-nowrap text-[11px] ${
                      orderTypeFilter === 'entrega' ? 'bg-amber-500 text-stone-950 shadow-xs' : 'text-stone-600 hover:text-stone-900'
                    }`}
                  >
                    <Bike size={12} /> Entrega ({summary.entrega.count})
                  </button>
                  <button
                    onClick={() => setOrderTypeFilter('mesa')}
                    className={`px-2.5 py-1 rounded-md font-bold transition-all cursor-pointer flex items-center gap-1 whitespace-nowrap text-[11px] ${
                      orderTypeFilter === 'mesa' ? 'bg-emerald-500 text-white shadow-xs' : 'text-stone-600 hover:text-stone-900'
                    }`}
                  >
                    <UtensilsCrossed size={12} /> Mesa ({summary.mesa.count})
                  </button>
                  <button
                    onClick={() => setOrderTypeFilter('retirada')}
                    className={`px-2.5 py-1 rounded-md font-bold transition-all cursor-pointer flex items-center gap-1 whitespace-nowrap text-[11px] ${
                      orderTypeFilter === 'retirada' ? 'bg-sky-500 text-white shadow-xs' : 'text-stone-600 hover:text-stone-900'
                    }`}
                  >
                    <ShoppingBag size={12} /> Retirada ({summary.retirada.count})
                  </button>
                </div>

                {/* Input de Busca em Tempo Real */}
                <div className="flex items-center gap-2">
                  <div className="relative flex-1 sm:w-64">
                    <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-stone-400" />
                    <input
                      type="text"
                      value={orderSearch}
                      onChange={(e) => setOrderSearch(e.target.value)}
                      placeholder="Buscar por cliente, pedido, item..."
                      className="w-full pl-8 pr-7 py-1.5 text-xs bg-stone-50 hover:bg-white focus:bg-white rounded-lg border border-stone-200 focus:outline-none focus:ring-1 focus:ring-stone-900 text-stone-800 placeholder-stone-400 font-medium transition-all"
                    />
                    {orderSearch && (
                      <button 
                        onClick={() => setOrderSearch('')} 
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>

                  <div className="hidden lg:flex items-center gap-1 px-2.5 py-1 bg-stone-100 rounded-lg text-xs font-mono text-stone-600 shrink-0 border border-stone-200">
                    <span>Filtrado:</span>
                    <strong className="text-stone-950 font-bold">€ {totalFilteredRevenue.toFixed(2)}</strong>
                  </div>
                </div>

              </div>

              {/* Lista de Pedidos Auditados */}
              <div className="bg-white rounded-xl border border-stone-200 shadow-xs overflow-hidden">
                {filteredOrders.length === 0 ? (
                  <div className="p-8 text-center text-stone-400 text-xs font-mono space-y-1.5">
                    <Filter className="w-7 h-7 mx-auto text-stone-300" />
                    <p className="font-bold text-stone-600">Nenhum pedido encontrado</p>
                    <p className="text-[11px]">Tente alterar o filtro de canal ou os termos da busca.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-stone-100">
                    {filteredOrders.map((order: any) => {
                      const isExpanded = expandedOrderId === order.id;
                      const normType = normalizeOrderType(order.order_type || order.orderType);
                      const normPayment = normalizePaymentMethod(order.payment_method || order.paymentMethod);
                      const items = safeParseItems(order.items);
                      const totalAmt = Number(order.total_amount || order.totalAmount || 0);
                      const orderDate = new Date(order.created_at || order.createdAt);

                      return (
                        <div key={order.id} className="transition-colors hover:bg-stone-50/80">
                          {/* Linha Resumida Ultra Compacta */}
                          <div 
                            onClick={() => toggleExpandOrder(order.id)}
                            className="px-2.5 py-1.5 sm:px-3 sm:py-2 flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 cursor-pointer select-none"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              
                              {/* ID & Badge do Canal */}
                              <div className="shrink-0 text-left font-mono">
                                <div className="flex items-center gap-1.5">
                                  <span className="font-bold text-xs text-stone-950">#{order.id}</span>
                                  <span className={`text-[8.5px] font-bold px-1.5 py-0.5 rounded border uppercase tracking-wider ${
                                    normType === 'entrega' 
                                      ? 'bg-amber-50 text-amber-800 border-amber-300' 
                                      : normType === 'mesa'
                                      ? 'bg-purple-50 text-purple-700 border-purple-200'
                                      : 'bg-sky-50 text-sky-800 border-sky-200'
                                  }`}>
                                    {normType === 'entrega' ? 'Entrega' : normType === 'mesa' ? 'Mesa' : 'Retirada'}
                                  </span>
                                </div>
                                <div className="text-[9.5px] text-stone-400 flex items-center gap-1 mt-0.5">
                                  <Clock size={10} />
                                  <span>{format(orderDate, 'HH:mm')}</span>
                                </div>
                              </div>

                              {/* Dados do Cliente e Resumo de Itens */}
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-xs text-stone-900 truncate">
                                    {order.customer_name || order.customerName || 'Cliente Balcão'}
                                  </span>
                                  {(order.customer_phone || order.customerPhone) && (
                                    <span className="text-[9.5px] font-mono text-stone-500 hidden md:inline">
                                      • {order.customer_phone || order.customerPhone}
                                    </span>
                                  )}
                                </div>

                                <div className="text-[9.5px] text-stone-500 truncate mt-0.5">
                                  {items.length > 0 ? (
                                    items.map((it: any) => `${it.quantity || 1}x ${it.name}`).join(', ')
                                  ) : (
                                    <span className="italic text-stone-400">Nenhum item registrado</span>
                                  )}
                                </div>
                              </div>

                            </div>

                            {/* Forma de Pagamento, Valor e Ações */}
                            <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0 pt-1 sm:pt-0 border-t sm:border-t-0 border-stone-100">
                              <span className="text-[9.5px] font-mono font-semibold px-2 py-0.5 rounded bg-stone-100 text-stone-700 border border-stone-200">
                                {normPayment}
                              </span>

                              <span className="font-mono font-bold text-xs text-stone-950 tabular-nums">
                                € {totalAmt.toFixed(2)}
                              </span>

                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedReceiptOrder(order);
                                  }}
                                  className="p-1 rounded text-stone-500 hover:text-stone-950 hover:bg-stone-200/80 transition-colors cursor-pointer"
                                  title="Ver Cupom / Imprimir Talão"
                                >
                                  <Receipt size={14} />
                                </button>
                                
                                <button
                                  type="button"
                                  className={`p-1 rounded text-stone-400 transition-transform ${isExpanded ? 'rotate-180 text-stone-900' : ''}`}
                                  title={isExpanded ? 'Recolher detalhes' : 'Expandir detalhes'}
                                >
                                  <ChevronDown size={15} />
                                </button>
                              </div>
                            </div>

                          </div>

                          {/* Bloco Expandido: Todos os detalhes do pedido */}
                          {isExpanded && (
                            <div className="p-2 sm:p-3 bg-stone-100/60 border-t border-stone-200 text-xs space-y-2 animate-in fade-in duration-150">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                
                                {/* Informações do Cliente & Entrega */}
                                <div className="bg-white p-2 rounded-xl border border-stone-200 space-y-1.5 shadow-2xs">
                                  <div className="font-bold text-stone-800 text-[10px] uppercase tracking-wider font-mono border-b border-stone-100 pb-1.5 flex items-center gap-1.5">
                                    <User size={13} className="text-amber-600" /> Dados do Cliente & Operação
                                  </div>
                                  
                                  <div className="grid grid-cols-2 gap-2 text-stone-600">
                                    <div>
                                      <span className="text-[10px] text-stone-400 block uppercase font-mono">Nome:</span>
                                      <strong className="text-stone-900">{order.customer_name || order.customerName || 'Não informado'}</strong>
                                    </div>
                                    <div>
                                      <span className="text-[10px] text-stone-400 block uppercase font-mono">Telefone:</span>
                                      <span className="font-mono text-stone-800">
                                        {order.customer_phone || order.customerPhone || 'Sem telefone'}
                                      </span>
                                    </div>
                                  </div>

                                  {(order.delivery_address || order.deliveryAddress) && (
                                    <div className="pt-2 border-t border-stone-100">
                                      <span className="text-[10px] text-stone-400 block uppercase font-mono flex items-center gap-1">
                                        <MapPin size={11} className="text-rose-500" /> Endereço de Entrega:
                                      </span>
                                      <span className="text-stone-800 font-medium block mt-0.5">
                                        {order.delivery_address || order.deliveryAddress}
                                      </span>
                                      {(order.delivery_zone || order.deliveryZone) && (
                                        <span className="text-[10.5px] text-stone-500 font-mono block mt-0.5">
                                          Zona: {order.delivery_zone || order.deliveryZone}
                                        </span>
                                      )}
                                    </div>
                                  )}

                                  {(order.nif) && (
                                    <div>
                                      <span className="text-[10px] text-stone-400 block uppercase font-mono">NIF do Cliente:</span>
                                      <span className="font-mono font-bold text-stone-800">{order.nif}</span>
                                    </div>
                                  )}

                                  {(order.notes) && (
                                    <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200/80 text-amber-900 text-[11px]">
                                      <strong>Obs do Pedido:</strong> {order.notes}
                                    </div>
                                  )}
                                </div>

                                {/* Informações Financeiras do Pedido */}
                                <div className="bg-white p-2 rounded-xl border border-stone-200 space-y-1.5 shadow-2xs">
                                  <div className="font-bold text-stone-800 text-[10px] uppercase tracking-wider font-mono border-b border-stone-100 pb-1.5 flex items-center gap-1.5">
                                    <CreditCard size={13} className="text-emerald-600" /> Dados Financeiros do Pedido
                                  </div>

                                  <div className="grid grid-cols-2 gap-2 text-stone-600">
                                    <div>
                                      <span className="text-[10px] text-stone-400 block uppercase font-mono">Forma de Pagamento:</span>
                                      <strong className="text-stone-900">{normPayment}</strong>
                                    </div>
                                    <div>
                                      <span className="text-[10px] text-stone-400 block uppercase font-mono">Status:</span>
                                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                        {order.status || 'Finalizado'}
                                      </span>
                                    </div>
                                  </div>

                                  {(order.change_for || order.changeFor) && (
                                    <div>
                                      <span className="text-[10px] text-stone-400 block uppercase font-mono">Troco Solicitado para:</span>
                                      <span className="font-mono font-bold text-stone-900">€ {Number(order.change_for || order.changeFor).toFixed(2)}</span>
                                    </div>
                                  )}

                                  <div className="pt-1 border-t border-stone-100 space-y-0.5">
                                    <div className="flex justify-between text-stone-500 font-mono text-[10px]">
                                      <span>Data e Hora:</span>
                                      <span>{format(orderDate, "dd/MM/yyyy 'às' HH:mm")}</span>
                                    </div>
                                    <div className="flex justify-between text-stone-900 font-mono font-bold text-xs pt-1 border-t border-dashed border-stone-200">
                                      <span>Total Pago:</span>
                                      <span className="text-emerald-700">€ {totalAmt.toFixed(2)}</span>
                                    </div>
                                  </div>

                                  <div className="pt-1 flex justify-end">
                                    <button
                                      type="button"
                                      onClick={() => setSelectedReceiptOrder(order)}
                                      className="px-2 py-1 bg-stone-900 hover:bg-stone-800 text-white rounded-lg font-mono text-[10px] font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                                    >
                                      <Printer size={13} /> Ver / Imprimir Talão
                                    </button>
                                  </div>
                                </div>
                              </div>

                              {/* Tabela de Itens do Pedido */}
                              <div className="bg-white rounded-xl border border-stone-200 overflow-hidden shadow-2xs">
                                <div className="p-2 bg-stone-50 border-b border-stone-200 font-bold font-mono text-[10px] text-stone-700 uppercase tracking-wider flex items-center justify-between">
                                  <span>Itens Deste Pedido ({items.length})</span>
                                  <span className="text-stone-400 font-normal lowercase">valores calculados por produto</span>
                                </div>

                                <div className="overflow-x-auto">
                                  <table className="w-full text-left border-collapse">
                                    <thead>
                                      <tr className="border-b border-stone-100 bg-stone-50/50 text-[9px] font-mono text-stone-500 uppercase">
                                        <th className="py-1.5 px-2 w-10 text-center">Qtd</th>
                                        <th className="py-1.5 px-2">Item / Descrição</th>
                                        <th className="py-1.5 px-2">Bordas / Extras</th>
                                        <th className="py-2 px-3 text-right">Preço Unit.</th>
                                        <th className="py-2 px-3 text-right">Subtotal</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-stone-100 text-xs">
                                      {items.map((item: any, idx: number) => {
                                        const qty = Number(item.quantity || 1);
                                        const unitPrice = Number(item.priceCalculated || item.price || item.basePrice || 0);
                                        const subTotal = unitPrice * qty;
                                        const extras = Array.isArray(item.extras) ? item.extras : [];

                                        return (
                                          <tr key={idx} className="hover:bg-stone-50/60 transition-colors">
                                            <td className="py-2.5 px-3 text-center font-mono font-bold text-stone-800 bg-stone-50/30">
                                              {qty}x
                                            </td>
                                            <td className="py-2.5 px-3">
                                              <div className="font-bold text-stone-900">{formatItemNameForPrint(item)}</div>
                                              {item.notes && (
                                                <div className="text-[10.5px] text-amber-700 italic mt-0.5">
                                                  Obs: {item.notes}
                                                </div>
                                              )}
                                              {item.flavors && Array.isArray(item.flavors) && item.flavors.length > 0 && (
                                                <div className="text-[10px] text-stone-500 font-mono mt-0.5">
                                                  Sabores: {item.flavors.join(' + ')}
                                                </div>
                                              )}
                                            </td>
                                            <td className="py-2.5 px-3">
                                              {extras.length > 0 ? (
                                                <div className="space-y-0.5">
                                                  {extras.map((ext: any, extIdx: number) => (
                                                    <span 
                                                      key={extIdx} 
                                                      className="inline-flex items-center gap-1 text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 mr-1"
                                                    >
                                                      + {ext.name} (€ {Number(ext.price || 0).toFixed(2)})
                                                    </span>
                                                  ))}
                                                </div>
                                              ) : (
                                                <span className="text-stone-300 font-mono text-[11px]">—</span>
                                              )}
                                            </td>
                                            <td className="py-2.5 px-3 text-right font-mono text-stone-600">
                                              € {unitPrice.toFixed(2)}
                                            </td>
                                            <td className="py-2.5 px-3 text-right font-mono font-semibold text-stone-800">
                                              € {subTotal.toFixed(2)}
                                            </td>
                                          </tr>
                                        );
                                      })}
                                    </tbody>
                                  </table>
                                </div>
                              </div>

                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

            </div>
          )}
        </div>

        {/* ========================================================= */}
        {/* RODAPÉ EXECUTIVO */}
        {/* ========================================================= */}
        <div className="px-3.5 py-2 border-t border-stone-200 bg-white flex flex-col sm:flex-row justify-between items-center gap-2 shrink-0">
          <div className="text-[11px] font-mono text-stone-500 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>Auditoria concluída • <strong>{summary.totalOrdersCount} pedidos</strong> registrados</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab(activeTab === 'balanco' ? 'pedidos' : 'balanco')}
              className="px-3.5 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-800 text-[11px] font-bold rounded-lg transition-colors cursor-pointer font-mono border border-stone-300"
            >
              {activeTab === 'balanco' ? `Ver Pedidos (${summary.totalOrdersCount})` : 'Ver Balanço Financeiro'}
            </button>

            <button
              onClick={onClose}
              className="px-4 py-1.5 bg-stone-950 hover:bg-stone-800 text-white text-[11px] font-bold rounded-lg transition-colors cursor-pointer font-mono shadow-xs"
            >
              Fechar Janela
            </button>
          </div>
        </div>

      </div>

      {/* ========================================================= */}
      {/* MODAL POPUP: TALÃO / CUPOM TÉRMICO (80MM STYLE) */}
      {/* ========================================================= */}
      {selectedReceiptOrder && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-sm w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden border border-stone-300">
            
            <div className="p-4 border-b border-stone-200 bg-stone-950 text-white flex justify-between items-center">
              <span className="font-bold text-sm flex items-center gap-2 font-mono">
                <Receipt size={16} className="text-amber-400" /> Cupom do Pedido #{selectedReceiptOrder.id}
              </span>
              <button 
                onClick={() => setSelectedReceiptOrder(null)} 
                className="text-stone-400 hover:text-white p-1 rounded-lg"
              >
                <X size={18} />
              </button>
            </div>

            {/* Conteúdo do Cupom Térmico */}
            <div className="p-5 overflow-y-auto bg-white font-mono text-stone-950 space-y-3 print-receipt-content">
              <div className="text-center pb-2 border-b border-dashed border-stone-300">
                <h2 className="text-lg font-black tracking-tight uppercase">DOBRO Pizzas</h2>
                <p className="text-[10px] text-stone-500 mt-0.5">Pizzaria & Esfiharia Delivery</p>
                <div className="mt-1 text-[11px] font-bold text-stone-800">
                  {format(new Date(selectedReceiptOrder.created_at || selectedReceiptOrder.createdAt), "dd/MM/yyyy HH:mm:ss")}
                </div>
              </div>

              {/* Faixa Tipo + ID */}
              <div className="bg-stone-900 text-white p-2 rounded flex justify-between items-center text-xs font-black">
                <span>{normalizeOrderType(selectedReceiptOrder.order_type || selectedReceiptOrder.orderType).toUpperCase()}</span>
                <span>#{selectedReceiptOrder.id}</span>
              </div>

              {/* Dados do Cliente */}
              <div className="text-[11px] space-y-0.5 border-b border-dashed border-stone-300 pb-2">
                <div><strong>Cliente:</strong> {selectedReceiptOrder.customer_name || selectedReceiptOrder.customerName || 'Balcão'}</div>
                {(selectedReceiptOrder.customer_phone || selectedReceiptOrder.customerPhone) && (
                  <div><strong>Tel:</strong> {selectedReceiptOrder.customer_phone || selectedReceiptOrder.customerPhone}</div>
                )}
                {(selectedReceiptOrder.nif) && (
                  <div><strong>NIF:</strong> {selectedReceiptOrder.nif}</div>
                )}
                {(selectedReceiptOrder.delivery_address || selectedReceiptOrder.deliveryAddress) && (
                  <div className="pt-1">
                    <strong>Endereço:</strong> {selectedReceiptOrder.delivery_address || selectedReceiptOrder.deliveryAddress}
                    {(selectedReceiptOrder.delivery_zone || selectedReceiptOrder.deliveryZone) && (
                      <span className="block text-[10px] text-stone-500">Zona: {selectedReceiptOrder.delivery_zone || selectedReceiptOrder.deliveryZone}</span>
                    )}
                  </div>
                )}
              </div>

              {/* Lista de Itens */}
              <div className="space-y-2 border-b border-dashed border-stone-300 pb-3">
                <div className="font-bold text-[11px] uppercase tracking-wider text-stone-500">Itens:</div>
                {safeParseItems(selectedReceiptOrder.items).map((it: any, i: number) => {
                  const qty = Number(it.quantity || 1);
                  const price = Number(it.priceCalculated || it.price || it.basePrice || 0);
                  const extras = Array.isArray(it.extras) ? it.extras : [];

                  return (
                    <div key={i} className="text-xs">
                      <div className="flex justify-between items-start">
                        <span><strong className="font-black">{qty}x </strong><span className="font-normal">{formatItemNameForPrint(it)}</span></span>
                        <span className="font-bold tabular-nums">€ {(price * qty).toFixed(2)}</span>
                      </div>
                      {extras.length > 0 && (
                        <div className="pl-3 text-[10px] text-stone-600">
                          {extras.map((ex: any, ei: number) => (
                            <div key={ei}>+ {ex.name} (€ {Number(ex.price || 0).toFixed(2)})</div>
                          ))}
                        </div>
                      )}
                      {it.notes && (
                        <div className="pl-3 text-[10px] text-amber-800 italic">Obs: {it.notes}</div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Total e Forma de Pagamento */}
              <div className="space-y-1 text-xs pt-1">
                <div className="flex justify-between text-stone-600">
                  <span>Forma de Pagamento:</span>
                  <span className="font-bold">{normalizePaymentMethod(selectedReceiptOrder.payment_method || selectedReceiptOrder.paymentMethod)}</span>
                </div>
                {(selectedReceiptOrder.change_for || selectedReceiptOrder.changeFor) && (
                  <div className="flex justify-between text-stone-600">
                    <span>Troco para:</span>
                    <span className="font-bold">€ {Number(selectedReceiptOrder.change_for || selectedReceiptOrder.changeFor).toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-base font-black pt-1 border-t border-stone-300">
                  <span>TOTAL:</span>
                  <span className="text-stone-950">€ {Number(selectedReceiptOrder.total_amount || selectedReceiptOrder.totalAmount || 0).toFixed(2)}</span>
                </div>
              </div>

            </div>

            {/* Ações do Cupom */}
            <div className="p-3 bg-stone-50 border-t border-stone-200 flex justify-end gap-2 font-mono">
              <button
                onClick={() => setSelectedReceiptOrder(null)}
                className="px-3 py-1.5 rounded-lg border border-stone-300 text-stone-700 text-xs font-bold hover:bg-stone-100"
              >
                Fechar
              </button>
              <button
                onClick={() => window.print()}
                className="px-4 py-1.5 rounded-lg bg-stone-900 text-white text-xs font-bold hover:bg-stone-800 flex items-center gap-1.5 shadow-sm"
              >
                <Printer size={13} /> Imprimir
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
