import React, { useEffect, useState, useMemo, useDeferredValue, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { 
  Search, X, Award, ShoppingBag, ChevronDown, ChevronLeft, ChevronRight,
  User, Phone, MapPin, Calendar, Clock, DollarSign, 
  TrendingUp, MessageCircle, Download, Sparkles, Filter, 
  ExternalLink, RefreshCw, AlertTriangle, Heart, Flame, 
  FileText, CheckCircle2, Copy, Send, Check,
  ArrowUpRight, Star, AlertCircle, Pizza, Bike, Store, CreditCard
} from 'lucide-react';
import PeriodFilterCompact, { PeriodFilterOption } from './PeriodFilterCompact';

export type CustomerSegment = 'todos' | 'vip' | 'recorrente' | 'novo' | 'em_risco' | 'inativo';

export interface CustomerProfile {
  id: string;
  phone: string;
  formattedPhone: string;
  name: string;
  total_orders: number;
  total_spent: number;
  ticket_medio: number;
  first_order_at: string | null;
  last_order_at: string | null;
  days_since_last_order: number;
  segment: 'vip' | 'recorrente' | 'novo' | 'em_risco' | 'inativo';
  primary_address: string;
  addresses: string[];
  primary_zone: string;
  primary_payment_method: string;
  delivery_percentage: number;
  favorite_items: { name: string; count: number }[];
  favorite_extras: { name: string; count: number }[];
  notes: string;
  raw_orders: any[];
}

export function getSegmentBadge(segment: CustomerProfile['segment']) {
  switch (segment) {
    case 'vip':
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-sans font-bold px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-900 border border-amber-500/30">
          <Star size={10} className="fill-amber-500 text-amber-500" /> VIP
        </span>
      );
    case 'recorrente':
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-sans font-semibold px-2.5 py-0.5 rounded-full bg-stone-100 text-stone-700 border border-stone-200">
          <RefreshCw size={10} className="text-stone-500" /> Recorrente
        </span>
      );
    case 'novo':
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-sans font-semibold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-800 border border-emerald-500/25">
          <Sparkles size={10} className="text-emerald-600" /> 1º Pedido
        </span>
      );
    case 'em_risco':
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-sans font-semibold px-2.5 py-0.5 rounded-full bg-rose-500/10 text-rose-800 border border-rose-500/25">
          <AlertTriangle size={10} className="text-rose-600" /> Em Risco
        </span>
      );
    case 'inativo':
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-sans font-medium px-2.5 py-0.5 rounded-full bg-stone-100 text-stone-600 border border-stone-200">
          <Clock size={10} className="text-stone-400" /> Inativo
        </span>
      );
  }
}

export default function CustomersManager() {
  const [customers, setCustomers] = useState<CustomerProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const deferredSearch = useDeferredValue(search);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerProfile | null>(null);
  const [activeSegment, setActiveSegment] = useState<CustomerSegment>('todos');

  // Filtros de Período e Ordenação
  const [period, setPeriod] = useState<PeriodFilterOption>('todos');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [sortBy, setSortBy] = useState<'recent' | 'spent' | 'orders' | 'ticket' | 'inactive'>('recent');

  // Paginação
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState<number | 'all'>(25);

  const [copiedPhone, setCopiedPhone] = useState<string | null>(null);

  // Reinicia para a página 1 ao alterar qualquer filtro
  useEffect(() => {
    setCurrentPage(1);
  }, [activeSegment, search, period, sortBy, startDate, endDate]);

  const handleClearFilters = useCallback(() => {
    setSearch('');
    setActiveSegment('todos');
    setPeriod('todos');
    setStartDate('');
    setEndDate('');
    setSortBy('recent');
    setCurrentPage(1);
  }, []);

  // Formata telefone para exibição e link internacional (Portugal padrão)
  const formatPhoneForWhatsApp = (rawPhone: string): string => {
    const clean = rawPhone.replace(/\D/g, '');
    if (!clean) return '';
    if (clean.startsWith('351')) return clean;
    if (clean.length === 9) return `351${clean}`;
    return clean;
  };

  const loadData = async () => {
    setLoading(true);
    try {
      // 1. Carrega em paralelo pedidos, clientes e configurações (reduz RTT de rede em ~60%)
      const [ordersRes, dbCustomersRes, settingsNotesRes] = await Promise.all([
        supabase
          .from('orders')
          .select('id, customer_name, customer_phone, delivery_address, delivery_zone, total_amount, payment_method, order_type, status, items, notes, created_at')
          .order('created_at', { ascending: false }),
        supabase
          .from('customers')
          .select('*'),
        supabase
          .from('settings')
          .select('key, value')
          .like('key', 'customer_notes_%')
      ]);

      const ordersData = ordersRes.data || [];
      if (ordersRes.error) console.warn('Erro ao carregar pedidos para CRM:', ordersRes.error);

      const dbCustomers = dbCustomersRes.data || [];
      const settingsNotes = settingsNotesRes.data || [];

      const notesMap: Record<string, { address?: string; notes?: string; name?: string }> = {};
      if (settingsNotes) {
        settingsNotes.forEach((s: any) => {
          const p = s.key.replace('customer_notes_', '');
          if (p && s.value) notesMap[p] = s.value;
        });
      }

      if (dbCustomers) {
        dbCustomers.forEach((c: any) => {
          const p = String(c.phone || '').replace(/\D/g, '');
          if (p) {
            notesMap[p] = {
              name: c.name || notesMap[p]?.name,
              address: c.address || notesMap[p]?.address,
              notes: c.notes || notesMap[p]?.notes,
            };
          }
        });
      }

      // 4. Agrega e calcula perfis de clientes unificados
      const customerMap: Record<string, {
        name: string;
        phone: string;
        orders: any[];
        addresses: Set<string>;
        zones: Record<string, number>;
        paymentMethods: Record<string, number>;
        orderTypes: Record<string, number>;
        itemCounts: Record<string, number>;
        extraCounts: Record<string, number>;
        firstDate: string;
        lastDate: string;
      }> = {};

      const allOrders = ordersData || [];

      for (const o of allOrders) {
        const rawPhone = String(o.customer_phone || '').trim();
        const cleanPhone = rawPhone.replace(/\D/g, '');
        if (!cleanPhone || cleanPhone.length < 8) continue;

        if (!customerMap[cleanPhone]) {
          customerMap[cleanPhone] = {
            name: o.customer_name || 'Cliente',
            phone: cleanPhone,
            orders: [],
            addresses: new Set(),
            zones: {},
            paymentMethods: {},
            orderTypes: {},
            itemCounts: {},
            extraCounts: {},
            firstDate: o.created_at,
            lastDate: o.created_at
          };
        }

        const entry = customerMap[cleanPhone];
        entry.orders.push(o);

        // Atualiza melhor nome disponível
        if (o.customer_name && o.customer_name.length > entry.name.length && !o.customer_name.toLowerCase().includes('dobro pizza')) {
          entry.name = o.customer_name.trim();
        }

        // Datas
        if (new Date(o.created_at) < new Date(entry.firstDate)) entry.firstDate = o.created_at;
        if (new Date(o.created_at) > new Date(entry.lastDate)) entry.lastDate = o.created_at;

        // Endereços e Zonas
        if (o.delivery_address && o.delivery_address.trim().length > 3) {
          entry.addresses.add(o.delivery_address.trim());
        }
        if (o.delivery_zone) {
          entry.zones[o.delivery_zone] = (entry.zones[o.delivery_zone] || 0) + 1;
        }

        // Formas de Pagamento
        if (o.payment_method) {
          entry.paymentMethods[o.payment_method] = (entry.paymentMethods[o.payment_method] || 0) + 1;
        }

        // Tipo de Pedido (Delivery / Takeaway / Mesa)
        const t = (o.order_type || 'delivery').toLowerCase();
        entry.orderTypes[t] = (entry.orderTypes[t] || 0) + 1;

        // Itens e Sabores Favoritos
        if (o.items) {
          let itemsList: any[] = [];
          if (Array.isArray(o.items)) itemsList = o.items;
          else if (typeof o.items === 'string') {
            try { itemsList = JSON.parse(o.items); } catch { itemsList = []; }
          }
          o.parsedItems = itemsList;

          itemsList.forEach((it: any) => {
            const itemName = String(it.name || '').trim();
            const qty = Number(it.quantity) || 1;
            if (itemName) {
              entry.itemCounts[itemName] = (entry.itemCounts[itemName] || 0) + qty;
            }

            if (it.extras && Array.isArray(it.extras)) {
              it.extras.forEach((ext: any) => {
                const extName = String(ext.name || '').trim();
                if (extName) {
                  entry.extraCounts[extName] = (entry.extraCounts[extName] || 0) + qty;
                }
              });
            }
          });
        }
      }

      // Monta os perfis calculados
      const profiles: CustomerProfile[] = Object.values(customerMap).map(entry => {
        const nonCanceledOrders = entry.orders.filter(o => o.status !== 'Cancelado');
        const totalSpent = nonCanceledOrders.reduce((sum, o) => sum + (Number(o.total_amount) || 0), 0);
        const totalOrders = nonCanceledOrders.length || entry.orders.length;
        const ticketMedio = totalOrders > 0 ? totalSpent / totalOrders : 0;

        const now = Date.now();
        const lastOrderTime = new Date(entry.lastDate).getTime();
        const daysSinceLastOrder = Math.max(0, Math.floor((now - lastOrderTime) / (1000 * 60 * 60 * 24)));

        // Determina segmento
        let segment: 'vip' | 'recorrente' | 'novo' | 'em_risco' | 'inativo' = 'recorrente';
        if (totalOrders >= 5 || totalSpent >= 150) {
          segment = 'vip';
        } else if (totalOrders === 1) {
          segment = 'novo';
        } else if (daysSinceLastOrder > 60) {
          segment = 'inativo';
        } else if (daysSinceLastOrder > 30) {
          segment = 'em_risco';
        } else {
          segment = 'recorrente';
        }

        // Preferências
        const sortedItems = Object.entries(entry.itemCounts)
          .sort((a, b) => b[1] - a[1])
          .map(([name, count]) => ({ name, count }));

        const sortedExtras = Object.entries(entry.extraCounts)
          .sort((a, b) => b[1] - a[1])
          .map(([name, count]) => ({ name, count }));

        const primaryAddress = Array.from(entry.addresses)[0] || '';
        const primaryZone = Object.entries(entry.zones).sort((a, b) => b[1] - a[1])[0]?.[0] || '';
        const primaryPayment = Object.entries(entry.paymentMethods).sort((a, b) => b[1] - a[1])[0]?.[0] || 'MB Way';

        const deliveryCount = entry.orderTypes['delivery'] || 0;
        const totalTypeOrders = Object.values(entry.orderTypes).reduce((a, b) => a + b, 0) || 1;
        const deliveryPercentage = Math.round((deliveryCount / totalTypeOrders) * 100);

        // Mescla notas salvas
        const savedMeta = notesMap[entry.phone];
        const finalName = savedMeta?.name || entry.name;
        const finalAddress = savedMeta?.address || primaryAddress;
        const finalNotes = savedMeta?.notes || '';

        return {
          id: entry.phone,
          phone: entry.phone,
          formattedPhone: entry.phone.length === 9 ? `${entry.phone.slice(0, 3)} ${entry.phone.slice(3, 6)} ${entry.phone.slice(6)}` : entry.phone,
          name: finalName,
          total_orders: totalOrders,
          total_spent: totalSpent,
          ticket_medio: ticketMedio,
          first_order_at: entry.firstDate,
          last_order_at: entry.lastDate,
          days_since_last_order: daysSinceLastOrder,
          segment,
          primary_address: finalAddress,
          addresses: Array.from(entry.addresses),
          primary_zone: primaryZone,
          primary_payment_method: primaryPayment,
          delivery_percentage: deliveryPercentage,
          favorite_items: sortedItems,
          favorite_extras: sortedExtras,
          notes: finalNotes,
          raw_orders: entry.orders
        };
      });

      setCustomers(profiles);
    } catch (err) {
      console.error('Erro ao construir inteligência de clientes:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // KPIs da Carteira de Clientes
  const stats = useMemo(() => {
    const totalCount = customers.length;
    const vipCount = customers.filter(c => c.segment === 'vip').length;
    const activeCount = customers.filter(c => c.days_since_last_order <= 30).length;
    const riskCount = customers.filter(c => c.segment === 'em_risco').length;
    const inactiveCount = customers.filter(c => c.segment === 'inativo').length;
    const newCount = customers.filter(c => c.segment === 'novo').length;
    const recurringCount = customers.filter(c => c.segment === 'recorrente').length;

    const totalRevenue = customers.reduce((sum, c) => sum + c.total_spent, 0);
    const totalOrders = customers.reduce((sum, c) => sum + c.total_orders, 0);
    const avgTicket = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    return {
      totalCount,
      vipCount,
      activeCount,
      riskCount,
      inactiveCount,
      newCount,
      recurringCount,
      totalRevenue,
      avgTicket
    };
  }, [customers]);

  // Filtragem e Ordenação
  const filteredCustomers = useMemo(() => {
    const term = deferredSearch.trim().toLowerCase();

    return customers.filter(c => {
      // 1. Filtro de Segmento
      if (activeSegment !== 'todos' && c.segment !== activeSegment) {
        return false;
      }

      // 2. Filtro de Busca Texto
      if (term) {
        const matchesSearch = 
          c.name.toLowerCase().includes(term) ||
          c.phone.includes(term) ||
          c.primary_address.toLowerCase().includes(term) ||
          c.favorite_items.some(it => it.name.toLowerCase().includes(term));

        if (!matchesSearch) return false;
      }

      // 3. Filtro de Período (baseado na data do último pedido)
      if (period === 'todos') return true;
      if (!c.last_order_at) return false;

      const orderDate = new Date(c.last_order_at);
      const now = new Date();

      if (period === 'hoje') {
        const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
        return orderDate >= start;
      }
      if (period === 'ontem') {
        const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 0, 0, 0);
        const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 23, 59, 59, 999);
        return orderDate >= start && orderDate <= end;
      }
      if (period === '7dias') {
        const limit = new Date(now);
        limit.setDate(limit.getDate() - 6);
        limit.setHours(0, 0, 0, 0);
        return orderDate >= limit;
      }
      if (period === '30dias') {
        const limit = new Date(now);
        limit.setDate(limit.getDate() - 29);
        limit.setHours(0, 0, 0, 0);
        return orderDate >= limit;
      }
      if (period === 'mes') {
        const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
        return orderDate >= start;
      }
      if (period === 'mes_passado') {
        const start = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0);
        const end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
        return orderDate >= start && orderDate <= end;
      }
      if (period === 'customizado' && startDate && endDate) {
        const start = new Date(startDate + 'T00:00:00');
        const end = new Date(endDate + 'T23:59:59.999');
        return orderDate >= start && orderDate <= end;
      }
      return true;
    }).sort((a, b) => {
      if (sortBy === 'spent') return b.total_spent - a.total_spent;
      if (sortBy === 'orders') return b.total_orders - a.total_orders;
      if (sortBy === 'ticket') return b.ticket_medio - a.ticket_medio;
      if (sortBy === 'inactive') return b.days_since_last_order - a.days_since_last_order;
      return new Date(b.last_order_at || 0).getTime() - new Date(a.last_order_at || 0).getTime();
    });
  }, [customers, activeSegment, deferredSearch, period, startDate, endDate, sortBy]);

  // Cálculos de Paginação
  const totalFiltered = filteredCustomers.length;
  const effectivePageSize = pageSize === 'all' ? totalFiltered || 1 : pageSize;
  const totalPages = Math.max(1, Math.ceil(totalFiltered / effectivePageSize));
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);

  const paginatedCustomers = useMemo(() => {
    if (pageSize === 'all') return filteredCustomers;
    const start = (safeCurrentPage - 1) * pageSize;
    return filteredCustomers.slice(start, start + pageSize);
  }, [filteredCustomers, safeCurrentPage, pageSize]);

  const filteredRevenue = useMemo(() => {
    return filteredCustomers.reduce((acc, c) => acc + c.total_spent, 0);
  }, [filteredCustomers]);

  // Exportação para CSV (UTF-8 com BOM para Excel)
  const exportToCSV = () => {
    if (filteredCustomers.length === 0) {
      alert('Nenhum cliente disponível para exportar no filtro atual.');
      return;
    }

    const headers = [
      'Nome',
      'Telefone',
      'Segmento',
      'Pedidos',
      'Total Gasto (EUR)',
      'Ticket Medio (EUR)',
      'Ultimo Pedido (Data)',
      'Dias sem Comprar',
      'Item Mais Pedido',
      'Endereco',
      'Notas Internas'
    ];

    const rows = filteredCustomers.map(c => [
      `"${c.name.replace(/"/g, '""')}"`,
      `"${c.phone}"`,
      `"${c.segment.toUpperCase()}"`,
      c.total_orders,
      c.total_spent.toFixed(2),
      c.ticket_medio.toFixed(2),
      c.last_order_at ? new Date(c.last_order_at).toLocaleDateString('pt-PT') : '-',
      c.days_since_last_order,
      `"${(c.favorite_items[0]?.name || '').replace(/"/g, '""')}"`,
      `"${(c.primary_address || '').replace(/"/g, '""')}"`,
      `"${(c.notes || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = '\uFEFF' + [headers.join(';'), ...rows.map(r => r.join(';'))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `clientes_crm_dobropizza_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const copyPhone = (phone: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(phone);
    setCopiedPhone(phone);
    setTimeout(() => setCopiedPhone(null), 2000);
  };

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-stone-200 p-12 text-center flex flex-col items-center justify-center gap-3 shadow-xs">
        <RefreshCw className="w-8 h-8 animate-spin text-stone-900" />
        <span className="text-xs font-sans font-semibold text-stone-600">
          Carregando dados e inteligência comercial dos clientes...
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* ─────────────────────────────────────────────────────────────
          1. SÍNTESE DA CARTEIRA - ADAPTADA MOBILE & DESKTOP (AIRY & LEVE)
      ─────────────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-stone-200/90 shadow-2xs p-3.5 sm:p-4">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4 divide-y sm:divide-y-0 sm:divide-x divide-stone-100">
          <div className="pt-1 sm:pt-0 sm:px-3 first:pl-0">
            <span className="text-[10px] sm:text-[11px] font-semibold text-stone-500 uppercase tracking-wider block font-sans">Clientes</span>
            <span className="text-xl sm:text-2xl font-bold font-sans text-stone-900 tracking-tight block mt-0.5">
              {stats.totalCount}
            </span>
            <span className="text-[10px] text-stone-400 block font-sans">
              {stats.newCount} novos • {stats.recurringCount} fiéis
            </span>
          </div>

          <div className="pt-2 sm:pt-0 sm:px-3">
            <span className="text-[10px] sm:text-[11px] font-semibold text-stone-500 uppercase tracking-wider block font-sans">VIPs</span>
            <span className="text-xl sm:text-2xl font-bold font-sans text-amber-600 tracking-tight block mt-0.5">
              {stats.vipCount}
            </span>
            <span className="text-[10px] text-stone-400 block font-sans">
              ≥ 5 pedidos
            </span>
          </div>

          <div className="pt-2 sm:pt-0 sm:px-3">
            <span className="text-[10px] sm:text-[11px] font-semibold text-stone-500 uppercase tracking-wider block font-sans">Ativos no Mês</span>
            <span className="text-xl sm:text-2xl font-bold font-sans text-emerald-600 tracking-tight block mt-0.5">
              {stats.activeCount}
            </span>
            <span className="text-[10px] text-stone-400 block font-sans">
              Últimos 30 dias
            </span>
          </div>

          <div className="pt-2 sm:pt-0 sm:px-3">
            <span className="text-[10px] sm:text-[11px] font-semibold text-stone-500 uppercase tracking-wider block font-sans">Em Risco</span>
            <span className="text-xl sm:text-2xl font-bold font-sans text-rose-600 tracking-tight block mt-0.5">
              {stats.riskCount}
            </span>
            <span className="text-[10px] text-stone-400 block font-sans">
              +30d sem pedir
            </span>
          </div>

          <div className="pt-2 sm:pt-0 sm:px-3">
            <span className="text-[10px] sm:text-[11px] font-semibold text-stone-500 uppercase tracking-wider block font-sans">Ticket Médio</span>
            <span className="text-xl sm:text-2xl font-bold font-mono text-stone-900 tracking-tight block mt-0.5">
              € {stats.avgTicket.toFixed(2)}
            </span>
            <span className="text-[10px] text-stone-400 block font-sans">
              por pedido
            </span>
          </div>

          <div className="pt-2 sm:pt-0 sm:px-3">
            <span className="text-[10px] sm:text-[11px] font-semibold text-stone-500 uppercase tracking-wider block font-sans">Total Faturado</span>
            <span className="text-xl sm:text-2xl font-bold font-mono text-emerald-700 tracking-tight block mt-0.5">
              € {stats.totalRevenue.toLocaleString('pt-PT', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </span>
            <span className="text-[10px] text-stone-400 block font-sans">
              carteira total
            </span>
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          2. PAINEL PRINCIPAL DO CRM & FERRAMENTAS
      ─────────────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-stone-200 shadow-2xs p-3.5 sm:p-5 space-y-4">
        
        {/* Linha 1: Segmentação Rápida (Abas Executivas Minimalistas com Scroll Suave no Mobile) */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-2 border-b border-stone-100 no-scrollbar scroll-smooth">
          <button
            onClick={() => setActiveSegment('todos')}
            className={`min-h-[36px] px-3.5 py-1.5 rounded-lg text-xs font-sans font-semibold transition-all shrink-0 cursor-pointer ${
              activeSegment === 'todos'
                ? 'bg-stone-900 text-white shadow-xs'
                : 'bg-stone-100/80 hover:bg-stone-200/70 text-stone-600'
            }`}
          >
            Todos ({stats.totalCount})
          </button>

          <button
            onClick={() => setActiveSegment('vip')}
            className={`min-h-[36px] px-3.5 py-1.5 rounded-lg text-xs font-sans font-semibold transition-all shrink-0 flex items-center gap-1.5 cursor-pointer ${
              activeSegment === 'vip'
                ? 'bg-amber-500 text-stone-950 font-bold shadow-xs'
                : 'bg-stone-100/80 hover:bg-amber-50 hover:text-amber-900 text-stone-700'
            }`}
          >
            <Star size={12} className={activeSegment === 'vip' ? 'fill-stone-950 text-stone-950' : 'fill-amber-500 text-amber-500'} />
            <span>VIPs ({stats.vipCount})</span>
          </button>

          <button
            onClick={() => setActiveSegment('recorrente')}
            className={`min-h-[36px] px-3.5 py-1.5 rounded-lg text-xs font-sans font-semibold transition-all shrink-0 flex items-center gap-1.5 cursor-pointer ${
              activeSegment === 'recorrente'
                ? 'bg-stone-900 text-white shadow-xs'
                : 'bg-stone-100/80 hover:bg-stone-200/70 text-stone-700'
            }`}
          >
            <RefreshCw size={11} />
            <span>Recorrentes ({stats.recurringCount})</span>
          </button>

          <button
            onClick={() => setActiveSegment('novo')}
            className={`min-h-[36px] px-3.5 py-1.5 rounded-lg text-xs font-sans font-semibold transition-all shrink-0 flex items-center gap-1.5 cursor-pointer ${
              activeSegment === 'novo'
                ? 'bg-emerald-700 text-white shadow-xs'
                : 'bg-stone-100/80 hover:bg-emerald-50 hover:text-emerald-900 text-stone-700'
            }`}
          >
            <Sparkles size={11} />
            <span>Novos / 1º Pedido ({stats.newCount})</span>
          </button>

          <button
            onClick={() => setActiveSegment('em_risco')}
            className={`min-h-[36px] px-3.5 py-1.5 rounded-lg text-xs font-sans font-semibold transition-all shrink-0 flex items-center gap-1.5 cursor-pointer ${
              activeSegment === 'em_risco'
                ? 'bg-rose-700 text-white shadow-xs'
                : 'bg-stone-100/80 hover:bg-rose-50 hover:text-rose-900 text-stone-700'
            }`}
          >
            <AlertTriangle size={11} />
            <span>Em Risco ({stats.riskCount})</span>
          </button>

          <button
            onClick={() => setActiveSegment('inativo')}
            className={`min-h-[36px] px-3.5 py-1.5 rounded-lg text-xs font-sans font-semibold transition-all shrink-0 flex items-center gap-1.5 cursor-pointer ${
              activeSegment === 'inativo'
                ? 'bg-stone-700 text-white shadow-xs'
                : 'bg-stone-100/80 hover:bg-stone-200 text-stone-600'
            }`}
          >
            <Clock size={11} />
            <span>Inativos ({stats.inactiveCount})</span>
          </button>
        </div>

        {/* Linha 2: Barra de Filtros, Busca, Ordenação e Exportar */}
        <div className="flex flex-col lg:flex-row justify-between items-stretch lg:items-center gap-2.5">
          {/* Busca Texto com botão de limpar (X) */}
          <div className="relative flex-1 w-full lg:max-w-md">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nome, telefone, sabor, rua..."
              className="h-10 sm:h-9 pl-9 pr-8 bg-stone-50 focus:bg-white border border-stone-200 focus:border-stone-900 rounded-lg text-xs font-sans text-stone-900 focus:outline-none w-full shadow-2xs transition-colors"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-stone-400 hover:text-stone-700 rounded transition-colors cursor-pointer"
                title="Limpar busca"
                aria-label="Limpar busca"
              >
                <X size={12} />
              </button>
            )}
          </div>

          {/* Grupo de Controles da Direita */}
          <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
            {/* Filtro de Período da Última Compra */}
            <PeriodFilterCompact
              value={period}
              startDate={startDate}
              endDate={endDate}
              onChange={(res) => {
                setPeriod(res.period);
                if (res.startDate !== undefined) setStartDate(res.startDate);
                if (res.endDate !== undefined) setEndDate(res.endDate);
              }}
            />

            {/* Ordenação */}
            <div className="relative">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="h-10 sm:h-9 pl-3 pr-8 border border-stone-200 hover:border-stone-300 bg-white text-stone-700 rounded-lg text-xs font-sans font-medium appearance-none cursor-pointer shadow-2xs focus:outline-none focus:border-stone-900"
              >
                <option value="recent">Última Compra</option>
                <option value="spent">+ Faturamento (€)</option>
                <option value="orders">+ Pedidos Realizados</option>
                <option value="ticket">+ Ticket Médio (€)</option>
                <option value="inactive">+ Tempo Sem Comprar</option>
              </select>
              <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" />
            </div>

            {/* Botão Exportar CSV */}
            <button
              onClick={exportToCSV}
              className="h-10 sm:h-9 px-3 bg-stone-50 hover:bg-stone-100 border border-stone-200 text-stone-800 rounded-lg text-xs font-sans font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
              title="Exportar lista filtrada para Excel / CSV"
            >
              <Download size={13} className="text-stone-600" />
              <span className="hidden sm:inline">Exportar CSV</span>
            </button>

            {/* Botão Limpar Filtros Ativos */}
            {(search || activeSegment !== 'todos' || period !== 'todos' || sortBy !== 'recent') && (
              <button
                onClick={handleClearFilters}
                className="h-10 sm:h-9 px-2.5 text-rose-700 hover:text-rose-900 hover:bg-rose-50 rounded-lg text-xs font-sans font-semibold transition-colors cursor-pointer flex items-center gap-1"
                title="Limpar todos os filtros"
              >
                <X size={12} />
                <span>Limpar</span>
              </button>
            )}
          </div>
        </div>

        {/* ─────────────────────────────────────────────────────────────
            3. DUAL-VIEW: TABELA DESKTOP + CARDS ADAPTATIVOS MOBILE
        ─────────────────────────────────────────────────────────────── */}

        {/* 3A. MODO MOBILE (< 768px): CARDS ERGONÔMICOS E DIRETOS */}
        <div className="block md:hidden space-y-2.5">
          {filteredCustomers.length === 0 ? (
            <div className="py-12 px-4 text-center bg-stone-50/70 rounded-xl border border-stone-200 flex flex-col items-center justify-center">
              <div className="w-12 h-12 rounded-full bg-stone-100 flex items-center justify-center text-stone-400 mb-2.5">
                <Search size={20} />
              </div>
              <h4 className="text-sm font-bold font-sans text-stone-900 mb-1">
                Nenhum cliente encontrado
              </h4>
              <p className="text-xs text-stone-500 font-sans max-w-sm mb-4">
                Não encontramos nenhum cliente com os filtros ou termo de busca aplicados.
              </p>
              <button
                onClick={handleClearFilters}
                className="px-3.5 py-2 bg-stone-900 hover:bg-stone-800 text-white rounded-lg text-xs font-sans font-semibold transition-colors cursor-pointer shadow-2xs flex items-center gap-1.5"
              >
                <RefreshCw size={12} />
                <span>Limpar filtros e busca</span>
              </button>
            </div>
          ) : (
            paginatedCustomers.map((c) => {
              const whatsappLink = `https://wa.me/${formatPhoneForWhatsApp(c.phone)}`;
              const isCopied = copiedPhone === c.phone;
              return (
                <div
                  key={`mobile-${c.id}`}
                  onClick={() => setSelectedCustomer(c)}
                  style={{ contentVisibility: 'auto' }}
                  className="bg-white p-3.5 rounded-xl border border-stone-200 hover:border-stone-300 shadow-2xs space-y-2.5 active:bg-amber-50/20 transition-all cursor-pointer"
                >
                  {/* Topo do Card: Nome + Segmento + WhatsApp Button (40px target) */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-bold text-stone-900 text-sm tracking-tight truncate font-sans">
                          {c.name || 'Cliente'}
                        </span>
                        {getSegmentBadge(c.segment)}
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-stone-500 font-mono tabular-nums mt-0.5">
                        <span>{c.formattedPhone}</span>
                        <button
                          onClick={(e) => copyPhone(c.phone, e)}
                          className="p-1 text-stone-400 hover:text-stone-700 transition-colors"
                          title="Copiar telefone"
                          aria-label={`Copiar telefone de ${c.name}`}
                        >
                          {isCopied ? <Check size={11} className="text-emerald-600 font-bold" /> : <Copy size={11} />}
                        </button>
                      </div>
                    </div>

                    <a
                      href={whatsappLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="shrink-0 min-h-[40px] px-3 py-2 rounded-xl bg-emerald-600 text-white font-sans font-bold text-xs flex items-center gap-1.5 shadow-2xs hover:bg-emerald-700 active:scale-95 transition-all"
                      aria-label={`Conversar com ${c.name} no WhatsApp`}
                    >
                      <MessageCircle size={15} />
                      <span>WhatsApp</span>
                    </a>
                  </div>

                  {/* 3 Métricas Rápidas */}
                  <div className="grid grid-cols-3 gap-1.5 p-2 bg-stone-50 rounded-lg border border-stone-100 text-center font-sans">
                    <div>
                      <span className="text-[9.5px] uppercase font-semibold text-stone-400 block">Pedidos</span>
                      <span className="text-xs font-bold text-stone-800 font-mono tabular-nums">{c.total_orders}</span>
                    </div>
                    <div>
                      <span className="text-[9.5px] uppercase font-semibold text-stone-400 block">Total Gasto</span>
                      <span className="text-xs font-bold text-stone-900 font-mono tabular-nums">€ {c.total_spent.toFixed(2)}</span>
                    </div>
                    <div>
                      <span className="text-[9.5px] uppercase font-semibold text-stone-400 block">Última Compra</span>
                      <span className="text-xs font-semibold text-stone-700">
                        {c.days_since_last_order === 0 ? 'Hoje' : c.days_since_last_order === 1 ? 'Ontem' : `Há ${c.days_since_last_order}d`}
                      </span>
                    </div>
                  </div>

                  {/* Rodapé do Card com Favorito e Ficha */}
                  <div className="flex items-center justify-between text-xs pt-1 border-t border-stone-100">
                    {c.favorite_items.length > 0 ? (
                      <span className="inline-flex items-center gap-1 text-[11px] text-stone-600 truncate max-w-[210px]">
                        <Pizza size={11} className="text-amber-600 shrink-0" />
                        <span className="truncate">{c.favorite_items[0].name}</span>
                      </span>
                    ) : (
                      <span className="text-stone-400 text-[11px]">-</span>
                    )}
                    <span className="text-amber-800 font-bold text-[11px] flex items-center gap-0.5 shrink-0">
                      Ver Ficha <ArrowUpRight size={12} />
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* 3B. MODO DESKTOP (≥ 768px): TABELA EXECUTIVA DE ALTA DENSIDADE */}
        <div className="hidden md:block overflow-x-auto border border-stone-200/90 rounded-xl">
          <table className="min-w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-stone-200 bg-stone-50/90 text-stone-600 font-sans uppercase text-[11px] tracking-wider">
                <th className="py-3 px-3.5 font-bold">Cliente & Segmento</th>
                <th className="py-3 px-3 font-bold">Telefone / WhatsApp</th>
                <th className="py-3 px-3 font-bold text-center">Pedidos</th>
                <th className="py-3 px-3 font-bold text-right">Total Gasto</th>
                <th className="py-3 px-3 font-bold text-right">Ticket Médio</th>
                <th className="py-3 px-3 font-bold">Última Compra</th>
                <th className="py-3 px-3 font-bold">Preferência</th>
                <th className="py-3 px-3 font-bold text-center">Ficha</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 px-4">
                    <div className="text-center flex flex-col items-center justify-center">
                      <div className="w-12 h-12 rounded-full bg-stone-100 flex items-center justify-center text-stone-400 mb-2.5">
                        <Search size={20} />
                      </div>
                      <h4 className="text-sm font-bold font-sans text-stone-900 mb-1">
                        Nenhum cliente encontrado
                      </h4>
                      <p className="text-xs text-stone-500 font-sans max-w-sm mb-3.5">
                        Não encontramos nenhum cliente com os filtros ou termo de busca aplicados.
                      </p>
                      <button
                        onClick={handleClearFilters}
                        className="px-3.5 py-1.5 bg-stone-900 hover:bg-stone-800 text-white rounded-lg text-xs font-sans font-semibold transition-colors cursor-pointer shadow-2xs flex items-center gap-1.5"
                      >
                        <RefreshCw size={12} />
                        <span>Limpar filtros e busca</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedCustomers.map((c) => {
                  const whatsappLink = `https://wa.me/${formatPhoneForWhatsApp(c.phone)}`;
                  const isCopied = copiedPhone === c.phone;

                  return (
                    <tr
                      key={c.id}
                      onClick={() => setSelectedCustomer(c)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          setSelectedCustomer(c);
                        }
                      }}
                      tabIndex={0}
                      role="button"
                      aria-label={`Ver detalhes de ${c.name}`}
                      style={{ contentVisibility: 'auto' }}
                      className="hover:bg-amber-50/40 transition-colors cursor-pointer group focus:outline-none focus-visible:bg-amber-50/60 focus-visible:ring-2 focus-visible:ring-amber-500/50"
                    >
                      {/* Cliente e Segmento */}
                      <td className="py-3 px-3.5">
                        <div className="flex flex-col">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-bold text-stone-900 group-hover:text-amber-950 text-sm tracking-tight font-sans">
                              {c.name || 'Cliente'}
                            </span>
                            {getSegmentBadge(c.segment)}
                          </div>
                          {c.first_order_at && (
                            <span className="text-[11px] text-stone-500 font-sans mt-0.5">
                              Cliente desde {new Date(c.first_order_at).toLocaleDateString('pt-PT')}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Telefone e Botão WhatsApp */}
                      <td className="py-3 px-3" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono tabular-nums text-stone-700 text-xs font-medium">{c.formattedPhone}</span>
                          <button
                            onClick={(e) => copyPhone(c.phone, e)}
                            className="p-1 text-stone-400 hover:text-stone-700 rounded transition-colors cursor-pointer"
                            title="Copiar telefone"
                            aria-label={`Copiar telefone de ${c.name}`}
                          >
                            {isCopied ? <Check size={12} className="text-emerald-600 font-bold" /> : <Copy size={12} />}
                          </button>
                          <a
                            href={whatsappLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 transition-colors border border-emerald-200 cursor-pointer"
                            title="Conversar no WhatsApp"
                            aria-label={`Conversar com ${c.name} no WhatsApp`}
                          >
                            <MessageCircle size={13} />
                          </a>
                        </div>
                      </td>

                      {/* Pedidos */}
                      <td className="py-3 px-3 text-center">
                        <span className="px-2.5 py-0.5 rounded-md font-bold font-mono tabular-nums bg-stone-100 text-stone-900 text-xs border border-stone-200/80">
                          {c.total_orders}
                        </span>
                      </td>

                      {/* Total Gasto */}
                      <td className="py-3 px-3 text-right font-bold text-stone-900 font-mono tabular-nums text-xs">
                        € {c.total_spent.toFixed(2)}
                      </td>

                      {/* Ticket Médio */}
                      <td className="py-3 px-3 text-right font-bold text-emerald-700 font-mono tabular-nums text-xs">
                        € {c.ticket_medio.toFixed(2)}
                      </td>

                      {/* Última Compra */}
                      <td className="py-3 px-3">
                        <div className="flex flex-col">
                          <div className="flex items-center gap-1.5">
                            <span className={`w-2 h-2 rounded-full ${
                              c.days_since_last_order <= 7 
                                ? 'bg-emerald-500' 
                                : c.days_since_last_order <= 30 
                                ? 'bg-blue-500' 
                                : c.days_since_last_order <= 60 
                                ? 'bg-orange-500' 
                                : 'bg-rose-500'
                            }`} />
                            <span className={`font-semibold text-xs font-sans ${
                              c.days_since_last_order > 60 
                                ? 'text-stone-500' 
                                : c.days_since_last_order > 30 
                                ? 'text-rose-700' 
                                : 'text-stone-800'
                            }`}>
                              {c.days_since_last_order === 0 ? 'Hoje' : c.days_since_last_order === 1 ? 'Ontem' : `Há ${c.days_since_last_order} dias`}
                            </span>
                          </div>
                          <span className="text-[11px] text-stone-500 font-sans tabular-nums">
                            {c.last_order_at ? new Date(c.last_order_at).toLocaleDateString('pt-PT') : '-'}
                          </span>
                        </div>
                      </td>

                      {/* Preferência / Item Mais Pedido */}
                      <td className="py-3 px-3 max-w-[190px] truncate">
                        {c.favorite_items.length > 0 ? (
                          <span className="inline-flex items-center gap-1 text-[11px] text-stone-700 bg-stone-50 px-2 py-0.5 rounded border border-stone-200 truncate font-sans font-medium">
                            <Pizza size={11} className="text-amber-600 shrink-0" />
                            <span className="truncate">{c.favorite_items[0].name}</span>
                          </span>
                        ) : (
                          <span className="text-stone-400 text-xs">-</span>
                        )}
                      </td>

                      {/* Botão Ver Ficha */}
                      <td className="py-3 px-3 text-center">
                        <span className="text-xs font-bold text-amber-800 group-hover:underline flex items-center justify-center gap-0.5 font-sans">
                          Ver <ArrowUpRight size={13} />
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Barra de Paginação e Totais */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-sans text-stone-600 pt-3 border-t border-stone-200">
          {/* Lado Esquerdo: Contador de Clientes e Faturamento */}
          <div className="flex items-center gap-3 flex-wrap">
            <span>
              Exibindo <strong className="font-semibold text-stone-900 font-mono tabular-nums">
                {totalFiltered === 0 ? 0 : (safeCurrentPage - 1) * (pageSize === 'all' ? totalFiltered : pageSize) + 1}–{pageSize === 'all' ? totalFiltered : Math.min(safeCurrentPage * pageSize, totalFiltered)}
              </strong> de <strong className="font-semibold text-stone-900 font-mono tabular-nums">{totalFiltered}</strong> clientes
            </span>
            {totalFiltered > 0 && (
              <>
                <span className="text-stone-300 hidden sm:inline">•</span>
                <span className="font-mono tabular-nums text-stone-600">
                  Total Filtrado: <strong className="text-stone-900 font-bold">€ {filteredRevenue.toFixed(2)}</strong>
                </span>
              </>
            )}
          </div>

          {/* Lado Direito: Seletor de Itens por Página & Controles de Navegação */}
          <div className="flex items-center gap-2.5">
            {/* Seletor de Tamanho de Página */}
            <div className="flex items-center gap-1.5 text-xs text-stone-500">
              <span className="hidden sm:inline">Exibir:</span>
              <div className="relative">
                <select
                  value={pageSize}
                  onChange={(e) => {
                    const val = e.target.value;
                    setPageSize(val === 'all' ? 'all' : Number(val));
                    setCurrentPage(1);
                  }}
                  className="h-8 pl-2 pr-6 border border-stone-200 hover:border-stone-300 bg-white text-stone-700 rounded-lg text-xs font-sans font-medium appearance-none cursor-pointer focus:outline-none focus:border-stone-900"
                  aria-label="Clientes por página"
                >
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                  <option value="all">Todos</option>
                </select>
                <ChevronDown size={11} className="absolute right-2 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" />
              </div>
            </div>

            {/* Botões de Navegação (se houver mais de 1 página) */}
            {pageSize !== 'all' && totalPages > 1 && (
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={safeCurrentPage <= 1}
                  className="h-8 w-8 flex items-center justify-center rounded-lg border border-stone-200 bg-white text-stone-700 hover:bg-stone-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                  title="Página anterior"
                  aria-label="Página anterior"
                >
                  <ChevronLeft size={14} />
                </button>

                <span className="px-2 text-xs font-sans font-medium text-stone-600 font-mono tabular-nums">
                  <span className="font-bold text-stone-900">{safeCurrentPage}</span> / {totalPages}
                </span>

                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={safeCurrentPage >= totalPages}
                  className="h-8 w-8 flex items-center justify-center rounded-lg border border-stone-200 bg-white text-stone-700 hover:bg-stone-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                  title="Próxima página"
                  aria-label="Próxima página"
                >
                  <ChevronRight size={14} />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          4. MODAL / FICHA COMPLETA DO CLIENTE
      ─────────────────────────────────────────────────────────────── */}
      {selectedCustomer && (
        <CustomerDetailModal
          customer={selectedCustomer}
          onClose={() => setSelectedCustomer(null)}
          onSaveNotes={async (updatedMeta) => {
            // Salva no banco com persistência dupla (customers e settings)
            try {
              try {
                await supabase.from('customers').upsert({
                  phone: selectedCustomer.phone,
                  name: updatedMeta.name,
                  address: updatedMeta.address,
                  notes: updatedMeta.notes,
                  updated_at: new Date().toISOString()
                }, { onConflict: 'phone' });
              } catch (e) {
                console.warn('Aviso upsert customers:', e);
              }

              await supabase.from('settings').upsert({
                key: `customer_notes_${selectedCustomer.phone}`,
                value: updatedMeta,
                updated_at: new Date().toISOString()
              }, { onConflict: 'key' });

              // Atualiza estado local
              setCustomers(prev => prev.map(c => c.phone === selectedCustomer.phone ? {
                ...c,
                name: updatedMeta.name || c.name,
                primary_address: updatedMeta.address || c.primary_address,
                notes: updatedMeta.notes || ''
              } : c));

              setSelectedCustomer(prev => prev ? {
                ...prev,
                name: updatedMeta.name || prev.name,
                primary_address: updatedMeta.address || prev.primary_address,
                notes: updatedMeta.notes || ''
              } : null);

            } catch (err) {
              console.error('Erro ao salvar ficha:', err);
              alert('Não foi possível salvar os dados do cliente.');
            }
          }}
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENTE: FICHA DETALHADA DO CLIENTE (CRM INDIVIDUAL)
// ─────────────────────────────────────────────────────────────────────────────
interface CustomerDetailModalProps {
  customer: CustomerProfile;
  onClose: () => void;
  onSaveNotes: (updatedData: { name: string; address: string; notes: string }) => Promise<void>;
}

const CustomerDetailModal = React.memo(function CustomerDetailModal({ customer, onClose, onSaveNotes }: CustomerDetailModalProps) {
  const [activeTab, setActiveTab] = useState<'historico' | 'acoes_whatsapp' | 'cadastro'>('historico');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [copiedTemplateIdx, setCopiedTemplateIdx] = useState<number | null>(null);

  const [formData, setFormData] = useState({
    name: customer.name || '',
    address: customer.primary_address || '',
    notes: customer.notes || ''
  });

  const copyTemplateText = (text: string, idx: number) => {
    navigator.clipboard.writeText(text);
    setCopiedTemplateIdx(idx);
    setTimeout(() => setCopiedTemplateIdx(null), 2000);
  };

  // Fechar com ESC
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const cleanPhone = customer.phone.replace(/\D/g, '');
  const internationalPhone = cleanPhone.startsWith('351') ? cleanPhone : `351${cleanPhone}`;

  // Modelos de mensagens prontas para WhatsApp (Práticos, Diretos e Sem Clichês)
  const firstName = customer.name.split(' ')[0] || 'Cliente';
  const favoritePizza = customer.favorite_items[0]?.name || 'sua pizza favorita';

  const messageTemplates = [
    {
      title: '🎁 Reativação / Sentimos sua Falta',
      desc: 'Para clientes em risco ou inativos (+30 dias sem pedir).',
      text: `Olá ${firstName}! Tudo bem? 🍕\nSentimos sua falta aqui na DOBRO Pizzas! Preparamos um mimo especial para o seu próximo pedido hoje. Gostaria de dar uma olhada no nosso cardápio atualizado?`
    },
    {
      title: '🌟 Reconhecimento VIP',
      desc: 'Para estreitar laços com os clientes mais frequentes.',
      text: `Olá ${firstName}! Passando para agradecer pela sua preferência de sempre como cliente VIP da DOBRO Pizzas! ⭐\nNa sua próxima pizza grande, a sobremesa ou a borda recheada é por nossa conta. Vamos pedir hoje?`
    },
    {
      title: '🌱 Pós-Venda (Novo Cliente)',
      desc: 'Para quem realizou o 1º pedido recente.',
      text: `Olá ${firstName}, tudo bem? Aqui é da equipe da DOBRO Pizzas. Passando para saber como foi a sua experiência com a nossa pizza! Seu feedback é muito importante para nós. Esperamos que tenha adorado! 😊`
    },
    {
      title: '🍕 Oferta do Sabor Favorito',
      desc: `Oferecer diretamente ${favoritePizza}.`,
      text: `Olá ${firstName}! Hoje o forno da DOBRO Pizzas já está a todo vapor e lembrei de você! Que tal pedir aquela ${favoritePizza} quentinha hoje para o jantar? 🍕`
    }
  ];

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    await onSaveNotes(formData);
    setIsSaving(false);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-stone-950/60 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-3xl shadow-2xl border border-stone-200 overflow-hidden flex flex-col max-h-[92vh] sm:max-h-[88vh] pb-[max(0.75rem,env(safe-area-inset-bottom,0px))]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Indicador de arrasto no Mobile */}
        <div className="w-10 h-1 bg-stone-300 rounded-full mx-auto my-2.5 sm:hidden shrink-0" />

        {/* Topo / Header da Ficha */}
        <div className="p-3.5 sm:p-5 border-b border-stone-200 bg-stone-50/90 flex flex-wrap justify-between items-center gap-3 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-stone-900 text-white flex items-center justify-center font-bold text-base sm:text-lg shadow-xs shrink-0">
              {customer.name ? customer.name.charAt(0).toUpperCase() : <User size={20} />}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-bold text-base sm:text-xl text-stone-900 tracking-tight leading-tight font-sans truncate">
                  {customer.name || 'Cliente'}
                </h3>
                {getSegmentBadge(customer.segment)}
              </div>
              <div className="flex items-center gap-2 text-xs font-sans text-stone-600 mt-0.5">
                <span className="font-mono font-medium">{customer.formattedPhone}</span>
                {customer.first_order_at && (
                  <>
                    <span className="text-stone-300">•</span>
                    <span className="hidden sm:inline">Cliente desde {new Date(customer.first_order_at).toLocaleDateString('pt-PT')}</span>
                    <span className="inline sm:hidden">Desde {new Date(customer.first_order_at).toLocaleDateString('pt-PT')}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <a
              href={`https://wa.me/${internationalPhone}`}
              target="_blank"
              rel="noopener noreferrer"
              className="min-h-[40px] px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-sans font-bold flex items-center gap-1.5 transition-all shadow-xs"
              aria-label={`Conversar com ${customer.name} no WhatsApp`}
            >
              <MessageCircle size={15} />
              <span>WhatsApp</span>
            </a>

            <button 
              onClick={onClose} 
              className="min-h-[40px] min-w-[40px] p-2 hover:bg-stone-200 rounded-xl text-stone-400 hover:text-stone-700 transition-colors flex items-center justify-center cursor-pointer"
              title="Fechar (Esc)"
              aria-label="Fechar janela"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* 4 Cards de Resumo Financeiro e Frequência do Cliente */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-2.5 p-3 sm:p-4 bg-stone-50 border-b border-stone-200 shrink-0">
          <div className="bg-white p-2.5 sm:p-3 rounded-xl border border-stone-200 shadow-2xs">
            <span className="text-[10px] font-sans font-bold text-stone-500 uppercase tracking-wider block">Total Gasto</span>
            <span className="text-base sm:text-xl font-bold font-mono text-stone-900 mt-0.5 block">€ {customer.total_spent.toFixed(2)}</span>
          </div>
          <div className="bg-white p-2.5 sm:p-3 rounded-xl border border-stone-200 shadow-2xs">
            <span className="text-[10px] font-sans font-bold text-stone-500 uppercase tracking-wider block">Pedidos Feitos</span>
            <span className="text-base sm:text-xl font-bold font-mono text-stone-900 mt-0.5 block">
              {customer.total_orders === 1 ? '1 pedido' : `${customer.total_orders} pedidos`}
            </span>
          </div>
          <div className="bg-white p-2.5 sm:p-3 rounded-xl border border-stone-200 shadow-2xs">
            <span className="text-[10px] font-sans font-bold text-stone-500 uppercase tracking-wider block">Ticket Médio</span>
            <span className="text-base sm:text-xl font-bold font-mono text-emerald-700 mt-0.5 block">€ {customer.ticket_medio.toFixed(2)}</span>
          </div>
          <div className="bg-white p-2.5 sm:p-3 rounded-xl border border-stone-200 shadow-2xs">
            <span className="text-[10px] font-sans font-bold text-stone-500 uppercase tracking-wider block">Última Compra</span>
            <span className="text-base sm:text-xl font-bold font-sans text-stone-900 mt-0.5 block">
              {customer.days_since_last_order === 0 ? 'Hoje' : customer.days_since_last_order === 1 ? 'Ontem' : `Há ${customer.days_since_last_order}d`}
            </span>
          </div>
        </div>

        {/* Bloco de Preferências & Padrões do Cliente */}
        <div className="px-3.5 sm:px-4 py-2 bg-amber-500/10 border-b border-amber-500/20 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-stone-800 font-sans shrink-0">
          {customer.favorite_items.length > 0 && (
            <div className="flex items-center gap-1.5">
              <span className="p-1 rounded-md bg-amber-100 text-amber-800">
                <Pizza size={12} className="text-amber-700 shrink-0" />
              </span>
              <span>Favorito: <strong>{customer.favorite_items[0].name}</strong> ({customer.favorite_items[0].count}x)</span>
            </div>
          )}
          <div className="flex items-center gap-1.5">
            <span className="p-1 rounded-md bg-blue-100 text-blue-800">
              <Bike size={12} className="text-blue-700 shrink-0" />
            </span>
            <span>Preferência: <strong>{customer.delivery_percentage}% Entrega</strong></span>
          </div>
          {customer.primary_zone && (
            <div className="flex items-center gap-1.5">
              <span className="p-1 rounded-md bg-rose-100 text-rose-800">
                <MapPin size={12} className="text-rose-700 shrink-0" />
              </span>
              <span>Zona: <strong>{customer.primary_zone}</strong></span>
            </div>
          )}
          {customer.primary_payment_method && (
            <div className="flex items-center gap-1.5">
              <span className="p-1 rounded-md bg-emerald-100 text-emerald-800">
                <CreditCard size={12} className="text-emerald-700 shrink-0" />
              </span>
              <span>Pagamento: <strong>{customer.primary_payment_method}</strong></span>
            </div>
          )}
        </div>

        {/* Tabs da Ficha (Responsivo para Celular e Desktop) */}
        <div className="flex border-b border-stone-200 bg-white shrink-0">
          <button
            onClick={() => setActiveTab('historico')}
            className={`flex-1 min-h-[44px] py-2.5 text-xs font-bold font-sans tracking-wide border-b-2 transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'historico' ? 'border-amber-600 text-amber-950 bg-amber-50/25' : 'border-transparent text-stone-500 hover:text-stone-900'
            }`}
          >
            <ShoppingBag size={14} className={activeTab === 'historico' ? 'text-amber-600' : 'text-stone-400'} />
            <span className="hidden sm:inline">HISTÓRICO ({customer.raw_orders.length})</span>
            <span className="inline sm:hidden">Histórico ({customer.raw_orders.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('acoes_whatsapp')}
            className={`flex-1 min-h-[44px] py-2.5 text-xs font-bold font-sans tracking-wide border-b-2 transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'acoes_whatsapp' ? 'border-emerald-600 text-emerald-950 bg-emerald-50/25' : 'border-transparent text-stone-500 hover:text-stone-900'
            }`}
          >
            <Send size={14} className={activeTab === 'acoes_whatsapp' ? 'text-emerald-600' : 'text-stone-400'} />
            <span className="hidden sm:inline">MENSAGENS WHATSAPP</span>
            <span className="inline sm:hidden">WhatsApp</span>
          </button>

          <button
            onClick={() => setActiveTab('cadastro')}
            className={`flex-1 min-h-[44px] py-2.5 text-xs font-bold font-sans tracking-wide border-b-2 transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'cadastro' ? 'border-stone-900 text-stone-950 bg-stone-50' : 'border-transparent text-stone-500 hover:text-stone-900'
            }`}
          >
            <FileText size={14} className={activeTab === 'cadastro' ? 'text-stone-900' : 'text-stone-400'} />
            <span className="hidden sm:inline">EDITAR CADASTRO & NOTAS</span>
            <span className="inline sm:hidden">Cadastro / Notas</span>
          </button>
        </div>

        {/* Conteúdo das Abas */}
        <div className="p-4 sm:p-5 overflow-y-auto flex-1 bg-white">
          
          {/* ABA 1: HISTÓRICO DE PEDIDOS DETALHADO */}
          {activeTab === 'historico' && (
            <div className="space-y-3">
              {customer.raw_orders.length === 0 ? (
                <div className="text-center text-stone-400 py-10 font-sans text-xs">
                  Nenhum pedido registrado para este cliente.
                </div>
              ) : (
                customer.raw_orders.map((o: any) => {
                  let itemsList: any[] = o.parsedItems;
                  if (!itemsList) {
                    if (Array.isArray(o.items)) itemsList = o.items;
                    else if (typeof o.items === 'string') {
                      try { itemsList = JSON.parse(o.items); } catch { itemsList = []; }
                    }
                  }

                  const isCanceled = o.status === 'Cancelado';

                  return (
                    <div 
                      key={o.id} 
                      className={`p-3.5 rounded-xl border transition-all ${
                        isCanceled 
                          ? 'border-stone-200 bg-stone-50/50 opacity-60' 
                          : 'border-stone-200 bg-stone-50/40 hover:bg-stone-50'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 border-b border-stone-200/60 pb-2 mb-2 font-mono">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs text-stone-900">Pedido #{o.id}</span>
                          <span className="text-[10px] text-stone-400">
                            {new Date(o.created_at).toLocaleString('pt-PT')}
                          </span>
                          <span className="px-1.5 py-0.2 rounded text-[9.5px] font-semibold uppercase bg-stone-200/80 text-stone-700">
                            {o.order_type || 'Delivery'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            o.status === 'Finalizado' 
                              ? 'bg-emerald-100 text-emerald-800' 
                              : isCanceled 
                              ? 'bg-rose-100 text-rose-800' 
                              : 'bg-amber-100 text-amber-800'
                          }`}>
                            {o.status}
                          </span>
                          <span className="font-bold text-xs text-stone-900 font-mono">
                            € {Number(o.total_amount || 0).toFixed(2)}
                          </span>
                        </div>
                      </div>

                      {/* Lista de Itens do Pedido */}
                      <div className="space-y-1">
                        {itemsList.map((it: any, iIdx: number) => (
                          <div key={iIdx} className="text-xs text-stone-700 flex justify-between items-start font-sans">
                            <div className="flex-1 pr-2">
                              <span className="font-bold text-stone-900 font-mono">{it.quantity}x</span> {it.name}
                              {it.extras && it.extras.length > 0 && (
                                <div className="text-[10px] text-amber-700 pl-4 font-mono">
                                  + {it.extras.map((e: any) => e.name).join(', ')}
                                </div>
                              )}
                              {it.notes && (
                                <div className="text-[10px] text-stone-500 italic pl-4">
                                  Obs: {it.notes}
                                </div>
                              )}
                            </div>
                            <span className="font-semibold text-stone-600 shrink-0 font-mono">
                              € {Number(it.priceCalculated || it.basePrice || 0).toFixed(2)}
                            </span>
                          </div>
                        ))}
                      </div>

                      {o.delivery_address && (
                        <div className="mt-2 pt-2 border-t border-stone-200/50 text-[10.5px] text-stone-500 font-sans flex items-center gap-1">
                          <MapPin size={11} className="text-stone-400 shrink-0" />
                          <span className="truncate">{o.delivery_address} {o.delivery_zone ? `(${o.delivery_zone})` : ''}</span>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* ABA 2: AÇÕES RÁPIDAS DE WHATSAPP (MODELOS DE FIDELIZAÇÃO) */}
          {activeTab === 'acoes_whatsapp' && (
            <div className="space-y-3 font-sans">
              <div className="p-3 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-700 leading-relaxed">
                <span className="font-bold text-stone-900">Modelos Rápidos para WhatsApp:</span> Mensagens pré-configuradas e personalizadas com o primeiro nome e preferências do cliente. Envie diretamente pelo WhatsApp ou copie o texto para personalizar.
              </div>

              <div className="grid grid-cols-1 gap-3">
                {messageTemplates.map((tmpl, idx) => {
                  const encodedMsg = encodeURIComponent(tmpl.text);
                  const waUrl = `https://wa.me/${internationalPhone}?text=${encodedMsg}`;
                  const isCopied = copiedTemplateIdx === idx;

                  return (
                    <div key={idx} className="p-3.5 bg-stone-50/80 border border-stone-200 rounded-xl space-y-2">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <span className="font-bold text-xs text-stone-900 block">{tmpl.title}</span>
                          <span className="text-[10px] text-stone-500 block">{tmpl.desc}</span>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            onClick={() => copyTemplateText(tmpl.text, idx)}
                            className="min-h-[36px] px-2.5 bg-white hover:bg-stone-100 border border-stone-200 text-stone-700 font-semibold text-xs rounded-lg flex items-center gap-1 transition-colors cursor-pointer shadow-2xs"
                            title="Copiar texto da mensagem"
                          >
                            {isCopied ? <Check size={12} className="text-emerald-600 font-bold" /> : <Copy size={12} />}
                            <span>{isCopied ? 'Copiado!' : 'Copiar'}</span>
                          </button>
                          <a
                            href={waUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="min-h-[36px] px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                          >
                            <Send size={11} />
                            <span>Enviar WhatsApp</span>
                          </a>
                        </div>
                      </div>
                      <div className="p-3 bg-white border border-stone-200 rounded-lg text-xs text-stone-800 whitespace-pre-wrap font-sans leading-relaxed">
                        {tmpl.text}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ABA 3: EDITAR CADASTRO & NOTAS */}
          {activeTab === 'cadastro' && (
            <form onSubmit={handleSave} className="space-y-3.5 font-sans">
              <div>
                <label className="block text-[11px] font-bold text-stone-700 uppercase mb-1">
                  Nome do Cliente
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  className="w-full h-10 px-3 bg-stone-50 border border-stone-200 rounded-lg text-base sm:text-xs font-sans text-stone-900 focus:bg-white focus:border-stone-900 focus:outline-none transition-colors"
                  placeholder="Nome do cliente"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-stone-700 uppercase mb-1">
                  Telefone / WhatsApp (Identificador do Cliente)
                </label>
                <input
                  type="text"
                  disabled
                  value={customer.formattedPhone}
                  className="w-full h-10 px-3 bg-stone-100 border border-stone-200 rounded-lg text-base sm:text-xs font-mono text-stone-500 cursor-not-allowed"
                />
                <span className="text-[10px] text-stone-400 mt-0.5 block">O telefone é a chave única do cliente para vincular pedidos e histórico.</span>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-stone-700 uppercase mb-1">
                  Endereço de Entrega Principal
                </label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={e => setFormData({ ...formData, address: e.target.value })}
                  className="w-full h-10 px-3 bg-stone-50 border border-stone-200 rounded-lg text-base sm:text-xs font-sans text-stone-900 focus:bg-white focus:border-stone-900 focus:outline-none transition-colors"
                  placeholder="Ex: Rua das Flores, 123 - Apto 4B"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-stone-700 uppercase mb-1">
                  Observações Internas / Preferências do Cliente
                </label>
                <textarea
                  value={formData.notes}
                  onChange={e => setFormData({ ...formData, notes: e.target.value })}
                  rows={3}
                  className="w-full p-3 bg-stone-50 border border-stone-200 rounded-lg text-base sm:text-xs font-sans text-stone-900 focus:bg-white focus:border-stone-900 focus:outline-none resize-none transition-colors"
                  placeholder="Ex: Prefere massa bem assada, não consome cebola, costuma pedir aos sábados, cliente amigo da família..."
                />
              </div>

              {saveSuccess && (
                <div className="p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-xs font-bold flex items-center gap-1.5">
                  <CheckCircle2 size={14} className="text-emerald-600" />
                  <span>Ficha e notas atualizadas com sucesso!</span>
                </div>
              )}

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSaving}
                  className="w-full min-h-[44px] bg-stone-900 hover:bg-stone-800 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm disabled:opacity-50"
                >
                  {isSaving ? <RefreshCw size={14} className="animate-spin" /> : <Check size={14} />}
                  <span>{isSaving ? 'Salvando...' : 'Salvar Alterações'}</span>
                </button>
              </div>
            </form>
          )}

        </div>
      </div>
    </div>
  );
});
