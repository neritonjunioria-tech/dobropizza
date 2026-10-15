import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { PeriodFilterCompact, PeriodFilterOption } from './PeriodFilterCompact';
import { isInternalDevice, setInternalDevice } from '../hooks/useAnalytics';
import { 
  Users, 
  ShoppingBag, 
  CreditCard, 
  CheckCircle2, 
  TrendingUp, 
  Filter, 
  RefreshCw, 
  ArrowRight, 
  Sparkles, 
  ExternalLink, 
  Flame,
  Award,
  Layers,
  ArrowDown,
  Shield,
  Copy,
  Check,
  Server,
  Smartphone
} from 'lucide-react';

interface FunnelData {
  visitors: number;
  engaged: number;
  addedToCart: number;
  initiatedCheckout: number;
  purchases: number;
  totalRevenue: number;
  ticketMedio: number;
  conversionRate: number;
  cartAbandonmentRate: number;
  checkoutDropRate: number;
}

interface SalesFunnelManagerProps {
  onNavigateToTab?: (tab: string) => void;
}

export const SalesFunnelManager: React.FC<SalesFunnelManagerProps> = ({ onNavigateToTab }) => {
  const [period, setPeriod] = useState<PeriodFilterOption>('hoje');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedStage, setSelectedStage] = useState<number | null>(null);

  const [isInternal, setIsInternal] = useState(isInternalDevice());
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedMenuLink, setCopiedMenuLink] = useState(false);
  const [netlifyData, setNetlifyData] = useState<{
    loading: boolean;
    available: boolean;
    message?: string;
    visitors?: number;
    pageviews?: number;
  }>({
    loading: false,
    available: false,
    message: 'não disponível'
  });

  const [data, setData] = useState<FunnelData>({
    visitors: 0,
    engaged: 0,
    addedToCart: 0,
    initiatedCheckout: 0,
    purchases: 0,
    totalRevenue: 0,
    ticketMedio: 0,
    conversionRate: 0,
    cartAbandonmentRate: 0,
    checkoutDropRate: 0,
  });

  const fetchFunnelData = async () => {
    setLoading(true);
    try {
      const now = new Date();
      let startOfDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
      let endOfDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

      if (period === 'ontem') {
        startOfDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 0, 0, 0);
        endOfDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 23, 59, 59, 999);
      } else if (period === '7dias') {
        startOfDate = new Date(now);
        startOfDate.setDate(startOfDate.getDate() - 6);
        startOfDate.setHours(0, 0, 0, 0);
      } else if (period === '30dias') {
        startOfDate = new Date(now);
        startOfDate.setDate(startOfDate.getDate() - 29);
        startOfDate.setHours(0, 0, 0, 0);
      } else if (period === 'mes') {
        startOfDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
      } else if (period === 'mes_passado') {
        startOfDate = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0);
        endOfDate = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
      } else if (period === 'todos') {
        startOfDate = new Date(2025, 0, 1);
      } else if (period === 'customizado' && startDate && endDate) {
        startOfDate = new Date(startDate + 'T00:00:00');
        endOfDate = new Date(endDate + 'T23:59:59.999');
      }

      // Real counts only, from the menu's own tracking (analytics_events). No estimates or minimums.
      // Reads in pages of 1000 rows so long periods are not cut off.
      const eventsData: any[] = [];
      for (let from = 0; ; from += 1000) {
        const { data: page, error: evError } = await supabase
          .from('analytics_events')
          .select('event_name, session_id, created_at, event_data')
          .gte('created_at', startOfDate.toISOString())
          .lte('created_at', endOfDate.toISOString())
          .order('created_at')
          .range(from, from + 999);
        if (evError) throw evError;
        eventsData.push(...(page || []));
        if (!page || page.length < 1000) break;
      }

      const visitorSessions = new Set<string>();
      const engagedSessions = new Set<string>();
      const addedToCartSessions = new Set<string>();
      const initiatedCheckoutSessions = new Set<string>();
      const purchasedOrders = new Map<string, number>();

      eventsData.forEach((ev: any) => {
        const sId = ev.session_id;
        if (!sId) return;
        visitorSessions.add(sId);
        if (ev.event_name === 'view_item' || ev.event_name === 'add_to_cart') engagedSessions.add(sId);
        if (ev.event_name === 'add_to_cart') addedToCartSessions.add(sId);
        if (ev.event_name === 'initiate_checkout') initiatedCheckoutSessions.add(sId);
        if (ev.event_name === 'purchase') {
          const orderKey = String(ev.event_data?.order_id ?? `${sId}-${ev.created_at}`);
          purchasedOrders.set(orderKey, Number(ev.event_data?.total_value) || 0);
        }
      });

      // Each step only counts people who reached it (a visitor who bought also counts as engaged, cart and checkout)
      const visitors = visitorSessions.size;
      const engaged = engagedSessions.size;
      const addedToCart = addedToCartSessions.size;
      const initiatedCheckout = initiatedCheckoutSessions.size;
      const purchases = purchasedOrders.size;
      const totalRevenue = [...purchasedOrders.values()].reduce((acc, v) => acc + v, 0);
      const ticketMedio = purchases > 0 ? totalRevenue / purchases : 0;

      const conversionRate = visitors > 0 ? (purchases / visitors) * 100 : 0;
      const cartAbandonmentRate = addedToCart > 0 ? Math.max(0, 100 - (purchases / addedToCart) * 100) : 0;
      const checkoutDropRate = initiatedCheckout > 0 ? Math.max(0, 100 - (purchases / initiatedCheckout) * 100) : 0;
      setData({
        visitors,
        engaged,
        addedToCart,
        initiatedCheckout,
        purchases,
        totalRevenue,
        ticketMedio,
        conversionRate,
        cartAbandonmentRate,
        checkoutDropRate
      });

      // Consulta métricas no servidor (Netlify) via function segura
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const jwt = sessionData?.session?.access_token;
        if (jwt) {
          const res = await fetch(`/.netlify/functions/analytics?from=${startOfDate.getTime()}&to=${endOfDate.getTime()}`, {
            headers: { Authorization: `Bearer ${jwt}` }
          });
          if (res.ok) {
            const netRes = await res.json();
            setNetlifyData({
              loading: false,
              available: Boolean(netRes.available),
              message: netRes.message || (netRes.available ? undefined : 'não disponível'),
              visitors: typeof netRes.visitors === 'number' ? netRes.visitors : undefined,
              pageviews: typeof netRes.pageviews === 'number' ? netRes.pageviews : undefined
            });
          } else {
            setNetlifyData({ loading: false, available: false, message: 'não disponível' });
          }
        } else {
          setNetlifyData({ loading: false, available: false, message: 'não disponível' });
        }
      } catch {
        setNetlifyData({ loading: false, available: false, message: 'não disponível' });
      }
    } catch (err) {
      console.error('Erro ao buscar dados do funil:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleInternal = () => {
    const next = !isInternal;
    setInternalDevice(next);
    setIsInternal(next);
  };

  const handleCopyMenuLink = () => {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://dobropizzasdelivery.netlify.app';
    navigator.clipboard.writeText(origin).then(() => {
      setCopiedMenuLink(true);
      setTimeout(() => setCopiedMenuLink(false), 2500);
    }).catch(() => {});
  };

  const handleCopyTeamLink = () => {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://dobropizzasdelivery.netlify.app';
    const link = `${origin}/?interno=1`;
    navigator.clipboard.writeText(link).then(() => {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }).catch(() => {});
  };

  // Clears the funnel tracking (visits, product views, cart, checkout). Orders are not touched.
  const resetFunnel = async () => {
    if (!window.confirm('Zerar o funil de vendas? Todas as visitas e cliques registrados até agora serão apagados e a contagem recomeça do zero. Os pedidos não são afetados.')) return;
    setLoading(true);
    const { error } = await supabase.from('analytics_events').delete().gte('created_at', '1970-01-01');
    if (error) window.alert('Não foi possível zerar a contagem: ' + error.message);
    await fetchFunnelData();
  };

  useEffect(() => {
    fetchFunnelData();
  }, [period, startDate, endDate]);

  // PALETA DA MARCA DOBRO PIZZAS (Amarelo Ouro, Âmbar, Caramelo e Dourado Institucional)
  const stages = [
    {
      id: 1,
      verb: 'ATRAIR',
      title: 'TRÁFEGO',
      subtitle: 'Acessos únicos ao cardápio digital',
      count: data.visitors,
      unit: 'Acessos',
      primaryHex: '#EAB308', // Amarelo Marca DOBRO Pizzas
      accentHex: '#FACC15',
      textBadge: 'bg-yellow-50 text-yellow-900 border-yellow-200',
      iconEmoji: '🧲',
      lucideIcon: Flame,
      conversionFromPrev: 100,
      dropoff: 0,
      description: 'Visitantes que abriram o cardápio digital através de campanhas, redes sociais ou indicação.',
      actionNote: 'Divulgue o link na bio do Instagram e em campanhas de WhatsApp para ampliar a boca do funil.'
    },
    {
      id: 2,
      verb: 'CONVERTER',
      title: 'VISITANTES',
      subtitle: 'Navegando pelos sabores, fotos e categorias',
      count: data.engaged,
      unit: 'Navegando',
      primaryHex: '#D97706', // Âmbar Dourado Quente
      accentHex: '#F59E0B',
      textBadge: 'bg-amber-50 text-amber-900 border-amber-200',
      iconEmoji: '🔄',
      lucideIcon: RefreshCw,
      conversionFromPrev: data.visitors > 0 ? Math.round((data.engaged / data.visitors) * 100) : 0,
      dropoff: data.visitors > 0 ? Math.max(0, 100 - Math.round((data.engaged / data.visitors) * 100)) : 0,
      description: 'Usuários ativos visualizando produtos, categorias de pizzas, esfihas e combos.',
      actionNote: 'Mantenha fotos bem iluminadas e descrições detalhadas para elevar a taxa de engajamento.'
    },
    {
      id: 3,
      verb: 'LEADS',
      title: 'CARRINHO',
      subtitle: 'Itens adicionados na sacola de compras',
      count: data.addedToCart,
      unit: 'no Carrinho',
      primaryHex: '#B45309', // Caramelo / Cobre Dourado
      accentHex: '#D97706',
      textBadge: 'bg-stone-100 text-stone-900 border-stone-200',
      iconEmoji: '⭐',
      lucideIcon: ShoppingBag,
      conversionFromPrev: data.engaged > 0 ? Math.round((data.addedToCart / data.engaged) * 100) : 0,
      dropoff: data.engaged > 0 ? Math.max(0, 100 - Math.round((data.addedToCart / data.engaged) * 100)) : 0,
      description: 'Clientes com intenção clara que customizaram bordas e colocaram produtos na sacola.',
      actionNote: 'Ofereça combos rápidos de bebidas ou sobremesas para incentivar o avanço ao checkout.'
    },
    {
      id: 4,
      verb: 'PAGAMENTO',
      title: 'CHECKOUT',
      subtitle: 'Inserindo endereço e forma de pagamento',
      count: data.initiatedCheckout,
      unit: 'Iniciados',
      primaryHex: '#1e293b', // Deep Slate Titanium Clean
      accentHex: '#334155',
      textBadge: 'bg-stone-100 text-stone-900 border-stone-200',
      iconEmoji: '💳',
      lucideIcon: CreditCard,
      conversionFromPrev: data.addedToCart > 0 ? Math.round((data.initiatedCheckout / data.addedToCart) * 100) : 0,
      dropoff: data.addedToCart > 0 ? Math.max(0, 100 - Math.round((data.initiatedCheckout / data.addedToCart) * 100)) : 0,
      description: 'Etapa decisiva: clientes revisando valores, frete e escolhendo Pix, Dinheiro, Cartão de Crédito ou Débito.',
      actionNote: 'Mantenha taxas de entrega claras e troco facilitado para eliminar desistências no último passo.'
    },
    {
      id: 5,
      verb: 'PEDIDOS',
      title: 'VENDAS',
      subtitle: 'Pedidos confirmados e faturados no caixa',
      count: data.purchases,
      unit: 'Fechados',
      primaryHex: '#CA8A04', // Dourado Ouro da Marca DOBRO Pizzas
      accentHex: '#EAB308',
      textBadge: 'bg-yellow-50 text-yellow-900 border-yellow-200',
      iconEmoji: '🛒',
      lucideIcon: ShoppingBag,
      conversionFromPrev: data.initiatedCheckout > 0 ? Math.round((data.purchases / data.initiatedCheckout) * 100) : 0,
      dropoff: data.initiatedCheckout > 0 ? Math.max(0, 100 - Math.round((data.purchases / data.initiatedCheckout) * 100)) : 0,
      description: 'Pedidos recebidos na cozinha, faturados no caixa do restaurante e gerando receita real.',
      actionNote: 'Agilidade na entrega e comunicação via WhatsApp fidelizam o cliente para o próximo pedido.'
    }
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 font-sans">
      
      {/* ────────────────── CABEÇALHO PADRÃO BALCÃO DE COMANDA COM FILTRO UNIFICADO ────────────────── */}
      <div className="bg-[#FDFBF7] rounded-2xl border border-[#E8D8D1] shadow-2xs p-4 sm:px-6 sm:py-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-base sm:text-lg font-bold text-[#44210F] tracking-tight">
              Funil de Venda
            </h1>
          </div>

          {/* Filtro de Período Compacto Padronizado + Botão Copiar Link do Cardápio */}
          <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
            <PeriodFilterCompact
              value={period}
              startDate={startDate}
              endDate={endDate}
              onChange={(res) => {
                setPeriod(res.period);
                if (res.startDate) setStartDate(res.startDate);
                if (res.endDate) setEndDate(res.endDate);
              }}
              align="right"
            />

            {/* Botão Copiar Link do Cardápio ao lado do filtro */}
            <button
              type="button"
              onClick={handleCopyMenuLink}
              title="Copiar o link oficial do cardápio digital para enviar aos clientes ou compartilhar"
              className="h-7 px-2.5 rounded-lg border border-[#d5af7a]/60 bg-[#083d07] text-[#fdfbf7] hover:bg-[#0b520a] transition-all cursor-pointer shadow-2xs flex items-center gap-1.5 text-[11px] font-mono font-bold"
            >
              {copiedMenuLink ? <Check size={12} className="text-[#d5af7a]" /> : <Copy size={12} className="text-[#d5af7a]" />}
              <span>{copiedMenuLink ? 'Link Copiado!' : 'Copiar link'}</span>
            </button>

            <button
              onClick={fetchFunnelData}
              disabled={loading}
              title="Recarregar métricas"
              className="h-7 px-2 rounded-lg border border-stone-200 bg-white text-stone-600 hover:text-stone-950 hover:bg-stone-50 transition-colors cursor-pointer shadow-2xs flex items-center gap-1 text-[11px] font-mono font-medium"
            >
              <RefreshCw size={11} className={loading ? 'animate-spin text-rose-600' : 'text-stone-400'} />
              <span className="hidden sm:inline">Atualizar</span>
            </button>

            <button
              onClick={resetFunnel}
              disabled={loading}
              title="Apagar todas as visitas e cliques registrados e começar a contagem do zero"
              className="h-7 px-2 rounded-lg border border-rose-200 bg-white text-rose-700 hover:bg-rose-50 transition-colors cursor-pointer shadow-2xs text-[11px] font-mono font-medium"
            >
              Zerar contagem
            </button>
          </div>
        </div>
      </div>

      {/* ────────────────── CARDS DE KPI: ESTILO RECIBO (NÚMEROS MONOESPAÇADOS) ────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        
        {/* Card 1: Acessos */}
        <div className="bg-white rounded-2xl border border-stone-200/80 p-4 sm:p-5 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-stone-400 mb-1">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-stone-500">
                1. Tráfego do Cardápio
              </span>
              <Flame size={14} className="text-rose-600" />
            </div>
            <p className="text-2xl sm:text-3xl font-bold font-mono text-stone-900 tabular-nums tracking-tight mt-1">
              {data.visitors.toLocaleString('pt-BR')}
            </p>
          </div>
          <div className="mt-3 pt-2.5 border-t border-stone-100 flex items-center justify-between text-[11px] text-stone-500 font-mono">
            <span>Base de entrada</span>
            <span className="font-bold text-stone-800">100%</span>
          </div>
        </div>

        {/* Card 2: Adições ao Carrinho */}
        <div className="bg-white rounded-2xl border border-stone-200/80 p-4 sm:p-5 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-stone-400 mb-1">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-stone-500">
                2. Adicionaram ao Carrinho
              </span>
              <ShoppingBag size={14} className="text-amber-500" />
            </div>
            <p className="text-2xl sm:text-3xl font-bold font-mono text-stone-900 tabular-nums tracking-tight mt-1">
              {data.addedToCart.toLocaleString('pt-BR')}
            </p>
          </div>
          <div className="mt-3 pt-2.5 border-t border-stone-100 flex items-center justify-between text-[11px] text-stone-500 font-mono">
            <span>Abandono:</span>
            <span className="font-bold text-amber-700">{data.cartAbandonmentRate.toFixed(1)}%</span>
          </div>
        </div>

        {/* Card 3: Início de Checkout */}
        <div className="bg-white rounded-2xl border border-stone-200/80 p-4 sm:p-5 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-stone-400 mb-1">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-stone-500">
                3. Iniciaram Checkout
              </span>
              <CreditCard size={14} className="text-blue-500" />
            </div>
            <p className="text-2xl sm:text-3xl font-bold font-mono text-stone-900 tabular-nums tracking-tight mt-1">
              {data.initiatedCheckout.toLocaleString('pt-BR')}
            </p>
          </div>
          <div className="mt-3 pt-2.5 border-t border-stone-100 flex items-center justify-between text-[11px] text-stone-500 font-mono">
            <span>Desistência no fim:</span>
            <span className="font-bold text-stone-700">{data.checkoutDropRate.toFixed(1)}%</span>
          </div>
        </div>

        {/* Card 4: Pedidos Concluídos */}
        <div className="bg-[#e5ddd4] text-[#44210f] rounded-2xl border border-[#d3c8bb] p-4 sm:p-5 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-[#745240] mb-1">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#745240]">
                4. Pedidos Concluídos
              </span>
              <CheckCircle2 size={14} className="text-emerald-400" />
            </div>
            <p className="text-2xl sm:text-3xl font-bold font-mono text-emerald-400 tabular-nums tracking-tight mt-1">
              {data.purchases.toLocaleString('pt-BR')}
            </p>
          </div>
          <div className="mt-3 pt-2.5 border-t border-[#d3c8bb] flex items-center justify-between text-[11px] text-[#745240] font-mono">
            <span>Conversão Total:</span>
            <span className="font-bold text-emerald-400">{data.conversionRate.toFixed(1)}%</span>
          </div>
        </div>
      </div>

      {/* ────────────────── SEÇÃO CENTRAL: FUNIL 3D COM PALETA DA MARCA (SEM ARCO-ÍRIS) ────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* COLUNA ESQUERDA (7 colunas): ILUSTRAÇÃO 3D ISOMÉTRICA DA MARCA */}
        <div className="lg:col-span-7 bg-[#e5ddd4] rounded-2xl border border-[#d3c8bb] p-3 sm:p-4 shadow-xl relative overflow-hidden flex flex-col items-center justify-center">
          
          {/* Luz de topo suave dourada e ambiente clean sem tons marrons */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(253,222,88,0.08),transparent_70%)] pointer-events-none" />

          <div className="w-full flex items-center justify-between mb-3 z-10">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-[#44210f] flex items-center gap-1.5">
                <Layers size={13} className="text-[#9a7337]" />
                Funil Tridimensional • DOBRO Pizzas
              </span>
            </div>
            <span className="flex items-center gap-1.5 text-[10px] font-mono text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded border border-emerald-300">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Tempo Real
            </span>
          </div>

          {/* SVG DO FUNIL 3D COM GRADIENTES CLEAN E TIPOGRAFIA PERFEITAMENTE POSICIONADA */}
          <div className="w-full max-w-[460px] flex justify-center py-1 z-10">
            <svg 
              viewBox="0 0 600 560" 
              className="w-full h-auto max-h-[370px] select-none filter drop-shadow-[0_15px_25px_rgba(0,0,0,0.8)]"
            >
              <defs>
                {/* Sombra de texto nítida para contraste absoluto */}
                <filter id="funnel-text-shadow" x="-30%" y="-30%" width="160%" height="160%">
                  <feDropShadow dx="0" dy="1.5" stdDeviation="1.5" floodColor="#000000" floodOpacity="0.85"/>
                </filter>

                {/* Nível 1: Amarelo Oficial da Marca DOBRO Pizzas (#d5af7a) */}
                <linearGradient id="brand-l1-left" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#b88a44"/>
                  <stop offset="100%" stopColor="#b49721"/>
                </linearGradient>
                <linearGradient id="brand-l1-right" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#d5af7a"/>
                  <stop offset="100%" stopColor="#b88a44"/>
                </linearGradient>
                <linearGradient id="brand-l1-top" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#ffea85"/>
                  <stop offset="100%" stopColor="#d5af7a"/>
                </linearGradient>

                {/* Nível 2: Âmbar / Laranja Vibrante Quente */}
                <linearGradient id="brand-l2-left" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#b45309"/>
                  <stop offset="100%" stopColor="#92400e"/>
                </linearGradient>
                <linearGradient id="brand-l2-right" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#f59e0b"/>
                  <stop offset="100%" stopColor="#d97706"/>
                </linearGradient>

                {/* Nível 3: Sunset Coral / Âmbar Escuro */}
                <linearGradient id="brand-l3-left" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#9a3412"/>
                  <stop offset="100%" stopColor="#7c2d12"/>
                </linearGradient>
                <linearGradient id="brand-l3-right" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#ea580c"/>
                  <stop offset="100%" stopColor="#c2410c"/>
                </linearGradient>

                {/* Nível 4: Deep Slate Titânio Clean (Substitui tom marrom com acabamento limpo e moderno) */}
                <linearGradient id="brand-l4-left" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#1e293b"/>
                  <stop offset="100%" stopColor="#0f172a"/>
                </linearGradient>
                <linearGradient id="brand-l4-right" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#334155"/>
                  <stop offset="100%" stopColor="#1e293b"/>
                </linearGradient>

                {/* Nível 5: Ouro Dourado Nobre de Fechamento */}
                <linearGradient id="brand-l5-left" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#a16207"/>
                  <stop offset="100%" stopColor="#713f12"/>
                </linearGradient>
                <linearGradient id="brand-l5-right" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#facc15"/>
                  <stop offset="100%" stopColor="#ca8a04"/>
                </linearGradient>
              </defs>

              {/* ═══════════ NÍVEL 1: AMARELO MARCA DOBRO PIZZAS (ATRAIR - TRÁFEGO) ═══════════ */}
              <g 
                className="cursor-pointer transition-all hover:opacity-95"
                onClick={() => setSelectedStage(1)}
              >
                {/* Topo do Cone */}
                <polygon 
                  points="300,10 520,38 300,68 80,38" 
                  fill="url(#brand-l1-top)" 
                  stroke="#fef08a" 
                  strokeWidth={selectedStage === 1 ? '2.5' : '1'} 
                />
                {/* Faceta Esquerda */}
                <polygon 
                  points="80,38 300,68 300,140 110,110" 
                  fill="url(#brand-l1-left)" 
                  stroke="#713f12" 
                  strokeWidth="0.75" 
                />
                {/* Faceta Direita */}
                <polygon 
                  points="300,68 520,38 490,110 300,140" 
                  fill="url(#brand-l1-right)" 
                  stroke="#a16207" 
                  strokeWidth="0.75" 
                />

                {/* Texto Esquerda Perfeitamente Alinhado e Inclinado com a Perspectiva */}
                <g transform="translate(195, 89) rotate(7.5)" filter="url(#funnel-text-shadow)">
                  <text x="0" y="0" textAnchor="middle" dominantBaseline="central" fill="#ffffff" fontSize="13" fontWeight="900" letterSpacing="1.2">
                    🧲 ATRAIR
                  </text>
                </g>

                {/* Texto Direita Perfeitamente Centralizado e com Tipografia Proporcional */}
                <g transform="translate(405, 89) rotate(-7.5)" filter="url(#funnel-text-shadow)">
                  <text x="0" y="-10" textAnchor="middle" dominantBaseline="central" fill="#ffffff" fontSize="17" fontWeight="900" letterSpacing="1.5">
                    TRÁFEGO
                  </text>
                  <text x="0" y="12" textAnchor="middle" dominantBaseline="central" fill="#ffffff" fontSize="12" fontWeight="700" fontFamily="monospace">
                    {data.visitors.toLocaleString('pt-BR')} Acessos
                  </text>
                </g>
              </g>

              {/* ═══════════ NÍVEL 2: ÂMBAR DOURADO (CONVERTER - VISITANTES) ═══════════ */}
              <g 
                className="cursor-pointer transition-all hover:opacity-95"
                onClick={() => setSelectedStage(2)}
              >
                <polygon 
                  points="118,118 300,148 300,215 145,185" 
                  fill="url(#brand-l2-left)" 
                  stroke="#78350f" 
                  strokeWidth={selectedStage === 2 ? '2' : '0.75'} 
                />
                <polygon 
                  points="300,148 482,118 455,185 300,215" 
                  fill="url(#brand-l2-right)" 
                  stroke="#b45309" 
                  strokeWidth={selectedStage === 2 ? '2' : '0.75'} 
                />

                <g transform="translate(216, 166.5) rotate(8.5)" filter="url(#funnel-text-shadow)">
                  <text x="0" y="0" textAnchor="middle" dominantBaseline="central" fill="#ffffff" fontSize="12" fontWeight="900" letterSpacing="1">
                    🔄 CONVERTER
                  </text>
                </g>

                <g transform="translate(384, 166.5) rotate(-8.5)" filter="url(#funnel-text-shadow)">
                  <text x="0" y="-9" textAnchor="middle" dominantBaseline="central" fill="#ffffff" fontSize="15.5" fontWeight="900" letterSpacing="1.2">
                    VISITANTES
                  </text>
                  <text x="0" y="11" textAnchor="middle" dominantBaseline="central" fill="#ffffff" fontSize="11.5" fontWeight="700" fontFamily="monospace">
                    {data.engaged.toLocaleString('pt-BR')} Navegando
                  </text>
                </g>
              </g>

              {/* ═══════════ NÍVEL 3: CORAL SUNSET (RELACIONAR - LEADS / CARRINHO) ═══════════ */}
              <g 
                className="cursor-pointer transition-all hover:opacity-95"
                onClick={() => setSelectedStage(3)}
              >
                <polygon 
                  points="152,193 300,223 300,290 180,260" 
                  fill="url(#brand-l3-left)" 
                  stroke="#7c2d12" 
                  strokeWidth={selectedStage === 3 ? '2' : '0.75'} 
                />
                <polygon 
                  points="300,223 448,193 420,260 300,290" 
                  fill="url(#brand-l3-right)" 
                  stroke="#ea580c" 
                  strokeWidth={selectedStage === 3 ? '2' : '0.75'} 
                />

                <g transform="translate(233, 241.5) rotate(9.5)" filter="url(#funnel-text-shadow)">
                  <text x="0" y="0" textAnchor="middle" dominantBaseline="central" fill="#ffffff" fontSize="11.5" fontWeight="900" letterSpacing="0.8">
                    ⭐ LEADS
                  </text>
                </g>

                <g transform="translate(367, 241.5) rotate(-9.5)" filter="url(#funnel-text-shadow)">
                  <text x="0" y="-8" textAnchor="middle" dominantBaseline="central" fill="#ffffff" fontSize="14" fontWeight="900" letterSpacing="1">
                    CARRINHO
                  </text>
                  <text x="0" y="10" textAnchor="middle" dominantBaseline="central" fill="#ffffff" fontSize="10.5" fontWeight="700" fontFamily="monospace">
                    {data.addedToCart.toLocaleString('pt-BR')} no Carrinho
                  </text>
                </g>
              </g>

              {/* ═══════════ NÍVEL 4: DEEP SLATE TITÂNIO CLEAN (PAGAMENTO - CHECKOUT) ═══════════ */}
              <g 
                className="cursor-pointer transition-all hover:opacity-95"
                onClick={() => setSelectedStage(4)}
              >
                <polygon 
                  points="186,268 300,298 300,365 215,335" 
                  fill="url(#brand-l4-left)" 
                  stroke="#334155" 
                  strokeWidth={selectedStage === 4 ? '2' : '0.75'} 
                />
                <polygon 
                  points="300,298 414,268 385,335 300,365" 
                  fill="url(#brand-l4-right)" 
                  stroke="#475569" 
                  strokeWidth={selectedStage === 4 ? '2' : '0.75'} 
                />

                <g transform="translate(250, 316.5) rotate(10.5)" filter="url(#funnel-text-shadow)">
                  <text x="0" y="0" textAnchor="middle" dominantBaseline="central" fill="#ffffff" fontSize="10.5" fontWeight="900" letterSpacing="0.6">
                    💳 PAGAMENTO
                  </text>
                </g>

                <g transform="translate(350, 316.5) rotate(-10.5)" filter="url(#funnel-text-shadow)">
                  <text x="0" y="-7.5" textAnchor="middle" dominantBaseline="central" fill="#ffffff" fontSize="12.5" fontWeight="900" letterSpacing="0.8">
                    CHECKOUT
                  </text>
                  <text x="0" y="9" textAnchor="middle" dominantBaseline="central" fill="#ffffff" fontSize="10" fontWeight="700" fontFamily="monospace">
                    {data.initiatedCheckout.toLocaleString('pt-BR')} Iniciados
                  </text>
                </g>
              </g>

              {/* ═══════════ NÍVEL 5: OURO DOURADO DOBRO PIZZAS (PEDIDOS CONVERTIDOS) ═══════════ */}
              <g 
                className="cursor-pointer transition-all hover:opacity-95"
                onClick={() => setSelectedStage(5)}
              >
                <polygon 
                  points="220,343 300,373 300,440 245,410" 
                  fill="url(#brand-l5-left)" 
                  stroke="#713f12" 
                  strokeWidth={selectedStage === 5 ? '2' : '0.75'} 
                />
                <polygon 
                  points="300,373 380,343 355,410 300,440" 
                  fill="url(#brand-l5-right)" 
                  stroke="#a16207" 
                  strokeWidth={selectedStage === 5 ? '2' : '0.75'} 
                />
                {/* Ponta em bisel dourada */}
                <polygon points="245,410 300,440 300,470 270,455" fill="#713f12" />
                <polygon points="300,440 355,410 330,455 300,470" fill="#facc15" />

                <g transform="translate(266, 391.5) rotate(11)" filter="url(#funnel-text-shadow)">
                  <text x="0" y="0" textAnchor="middle" dominantBaseline="central" fill="#ffffff" fontSize="9.5" fontWeight="900" letterSpacing="0.5">
                    🛒 PEDIDOS
                  </text>
                </g>

                <g transform="translate(334, 391.5) rotate(-11)" filter="url(#funnel-text-shadow)">
                  <text x="0" y="-6.5" textAnchor="middle" dominantBaseline="central" fill="#ffffff" fontSize="11" fontWeight="900" letterSpacing="0.6">
                    VENDAS
                  </text>
                  <text x="0" y="7.5" textAnchor="middle" dominantBaseline="central" fill="#ffffff" fontSize="9" fontWeight="800" fontFamily="monospace">
                    {data.purchases.toLocaleString('pt-BR')} Fechados
                  </text>
                </g>
              </g>
            </svg>
          </div>

          <div className="w-full mt-1 pt-2 border-t border-[#d3c8bb] flex items-center justify-between text-xs font-mono text-[#745240] z-10">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              Retenção Geral: <strong className="text-[#44210f]">{data.conversionRate.toFixed(1)}%</strong>
            </span>
            <a 
              href="/" 
              target="_blank" 
              rel="noreferrer"
              className="text-[#745240] hover:text-[#083d07] flex items-center gap-1 transition-colors"
            >
              <span>Abrir Cardápio</span>
              <ExternalLink size={12} />
            </a>
          </div>
        </div>

        {/* COLUNA DIREITA (5 colunas): DETALHAMENTO PROPORCIONAL E ALINHADO DAS 5 ETAPAS */}
        <div className="lg:col-span-5 space-y-2">
          <div className="flex items-center justify-between px-1 pb-0.5">
            <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-stone-600 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#083d07]" />
              Jornada de Conversão do Cliente
            </h2>
            <span className="text-[10px] font-mono text-stone-400">
              5 Fases
            </span>
          </div>

          {stages.map((stage) => {
            const isSelected = selectedStage === stage.id;
            const Icon = stage.lucideIcon;

            return (
              <div 
                key={stage.id}
                onClick={() => setSelectedStage(isSelected ? null : stage.id)}
                className={`bg-white rounded-xl border p-2.5 sm:px-3.5 sm:py-2.5 transition-all cursor-pointer shadow-2xs ${
                  isSelected 
                    ? 'border-[#083d07] ring-2 ring-[#083d07]/10' 
                    : 'border-stone-200/80 hover:border-stone-300'
                }`}
              >
                <div className="flex items-center justify-between gap-2.5">
                  <div className="flex items-center gap-2.5">
                    <div 
                      className="w-7 h-7 rounded-lg flex items-center justify-center text-white font-bold text-xs shadow-2xs shrink-0"
                      style={{ backgroundColor: stage.primaryHex }}
                    >
                      <Icon size={14} />
                    </div>
                    <div>
                      <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-stone-400 block leading-tight">
                        Fase {stage.id} • {stage.verb}
                      </span>
                      <h3 className="text-xs font-bold text-stone-900 leading-tight">
                        {stage.title}
                      </h3>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold font-mono text-stone-900 tabular-nums leading-tight">
                      {stage.count.toLocaleString('pt-BR')}
                    </p>
                    <span className="text-[9px] font-mono text-stone-400 block leading-tight">
                      {stage.unit}
                    </span>
                  </div>
                </div>

                {/* Métricas de Passagem e Perda */}
                <div className="mt-1.5 pt-1.5 border-t border-stone-100 flex items-center justify-between text-[10px] font-mono">
                  <div className="flex items-center gap-1 text-stone-600">
                    <span>Avanço:</span>
                    <strong className="text-stone-900 font-bold">
                      {stage.conversionFromPrev}%
                    </strong>
                  </div>

                  {stage.id > 1 && (
                    <div className="flex items-center gap-1 text-stone-500">
                      <span>Perda:</span>
                      <strong className="text-rose-700 font-bold">
                        {stage.dropoff}%
                      </strong>
                    </div>
                  )}

                  <span className="text-[9px] text-stone-400 hover:text-stone-600">
                    {isSelected ? 'Ocultar ▲' : 'Dica ▼'}
                  </span>
                </div>

                {/* Dica Expansível */}
                {isSelected && (
                  <div className="mt-2 pt-2 border-t border-stone-100 bg-stone-50/80 -mx-2.5 -mb-2.5 p-2.5 rounded-b-xl space-y-1.5 text-xs">
                    <p className="text-stone-600 text-[11px] leading-relaxed">
                      {stage.description}
                    </p>
                    <div className="p-2 rounded-lg bg-white border border-stone-200 text-stone-800 text-[10px] flex items-start gap-1.5">
                      <Sparkles size={12} className="text-amber-600 mt-0.5 shrink-0" />
                      <div>
                        <strong className="font-bold text-stone-900">Estratégia Recomendada:</strong>
                        <p className="mt-0.5 text-stone-600">{stage.actionNote}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ────────────────── DIAGNÓSTICO SUTIL & ATALHOS DIRETOS ────────────────── */}
      <div className="bg-white rounded-2xl border border-stone-200/90 p-4 sm:p-5 shadow-2xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-stone-900">
              Diagnóstico do Funil & Ações Rápidas
            </h2>
          </div>
          <span className="text-[10px] font-mono text-stone-400">
            Acesso Direto
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          
          {/* Card 1: Carrinho */}
          <div className="p-3 rounded-xl bg-stone-50/80 hover:bg-stone-50 border border-stone-200/80 flex flex-col justify-between transition-all">
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-mono font-bold text-stone-800 text-[11px] uppercase">
                  Gargalo no Carrinho
                </span>
                <span className="font-mono text-[9.5px] font-bold text-amber-900 bg-amber-100/90 px-1.5 py-0.5 rounded border border-amber-200">
                  {data.cartAbandonmentRate.toFixed(0)}% Abandono
                </span>
              </div>
              <p className="text-[11px] text-stone-500 leading-snug">
                Itens na sacola sem avanço ao pagamento.
              </p>
            </div>
            <div className="pt-2 mt-2 border-t border-stone-200/60">
              <button
                onClick={() => onNavigateToTab?.('gestao-cardapio')}
                className="w-full h-7 px-2 rounded-lg bg-white hover:bg-amber-50/80 text-stone-800 hover:text-amber-950 border border-stone-200 text-[10.5px] font-bold flex items-center justify-between transition-all cursor-pointer shadow-2xs"
              >
                <span>Ajustar Cardápio & Preços</span>
                <ArrowRight size={12} className="text-stone-400 group-hover:text-amber-800" />
              </button>
            </div>
          </div>

          {/* Card 2: Checkout */}
          <div className="p-3 rounded-xl bg-stone-50/80 hover:bg-stone-50 border border-stone-200/80 flex flex-col justify-between transition-all">
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-mono font-bold text-stone-800 text-[11px] uppercase">
                  Retenção no Checkout
                </span>
                <span className="font-mono text-[9.5px] font-bold text-stone-700 bg-stone-200/70 px-1.5 py-0.5 rounded border border-stone-300">
                  {data.checkoutDropRate.toFixed(0)}% Desistência
                </span>
              </div>
              <p className="text-[11px] text-stone-500 leading-snug">
                Desistências na entrega ou no pagamento.
              </p>
            </div>
            <div className="pt-2 mt-2 border-t border-stone-200/60">
              <button
                onClick={() => onNavigateToTab?.('configuracoes')}
                className="w-full h-7 px-2 rounded-lg bg-white hover:bg-amber-50/80 text-stone-800 hover:text-amber-950 border border-stone-200 text-[10.5px] font-bold flex items-center justify-between transition-all cursor-pointer shadow-2xs"
              >
                <span>Configurar Zonas de Entrega</span>
                <ArrowRight size={12} className="text-stone-400 group-hover:text-amber-800" />
              </button>
            </div>
          </div>

          {/* Card 3: Clientes */}
          <div className="p-3 rounded-xl bg-stone-50/80 hover:bg-stone-50 border border-stone-200/80 flex flex-col justify-between transition-all">
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-mono font-bold text-stone-800 text-[11px] uppercase">
                  Recompra & Clientes
                </span>
                <span className="font-mono text-[9.5px] font-bold text-emerald-800 bg-emerald-100/90 px-1.5 py-0.5 rounded border border-emerald-200">
                  R$ {data.ticketMedio.toFixed(2)} Médio
                </span>
              </div>
              <p className="text-[11px] text-stone-500 leading-snug">
                Histórico de clientes para fidelização e vendas.
              </p>
            </div>
            <div className="pt-2 mt-2 border-t border-stone-200/60">
              <button
                onClick={() => onNavigateToTab?.('clientes')}
                className="w-full h-7 px-2 rounded-lg bg-[#083d07] hover:bg-[#0b520a] text-white text-[10.5px] font-bold flex items-center justify-between transition-all cursor-pointer shadow-2xs"
              >
                <span>Acessar Base de Clientes (CRM)</span>
                <ArrowRight size={12} className="text-stone-300" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SalesFunnelManager;
