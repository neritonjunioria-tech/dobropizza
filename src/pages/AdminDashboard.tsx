import React, { useState, useEffect, useRef } from "react";
import {
  X, TrendingUp, TrendingDown, Filter, Layers, RefreshCw, ChevronDown, Key,
  DollarSign,
  ShoppingBag,
  Bike,
  Store,
  Users,
  Pizza,
  CreditCard,
  ArrowUpRight,
  ArrowDownRight,
  Activity,
  Calendar,
  Lock,
  Printer,
  Menu,
  LogOut,
  LayoutDashboard,
  FolderTree,
  Package,
  UtensilsCrossed,
  Settings,
  BarChart3,
  Edit3,
  Plus,
  Trash2,
  Tag,
  AlertCircle,
  FileText,
  Check,
  Search,
  Shield,
  Megaphone,
  Wallet,
  BotMessageSquare,
  MapPin,
  RotateCcw,
  Edit2,
  Clock,
  ArrowRight,
  Phone,
  Flame,
  LayoutGrid,
  List
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Legend
} from "recharts";
import { ALL_MENU_ITEMS, MenuItem, ExtraIngredient, pizzaExtras } from "../data/menu";
import { useMenu } from "../hooks/useMenu";
import { supabase } from '../lib/supabase';
import { normalizeOrderType, isOrderActive, normalizePaymentMethod } from '../utils/paymentAndOrderHelper';
import { formatItemNameForPrint, getItemNameTextForPrint } from '../utils/printHelpers';
import { motion } from 'framer-motion';
import MenuManager from '../components/MenuManager';
import CategoryManager from '../components/CategoryManager';
import { SalesFunnelManager } from '../components/SalesFunnelManager';
import CashSessionDetailsModal from '../components/reports/CashSessionDetailsModal';
import PeriodFilterCompact from '../components/PeriodFilterCompact';
import ExpensesManager from '../components/ExpensesManager';
import PDVModal from '../components/PDVModal';
import SettingsManager from '../components/SettingsManager';
import CustomersManager from '../components/CustomersManager';
import CaixaManager from '../components/CaixaManager';
import UsersManager from '../components/UsersManager';
import BannerManager from '../components/BannerManager';
import AgentManager from '../components/AgentManager';
import { BillingManager } from '../components/BillingManager';
import MotoboysManager from '../components/MotoboysManager';
import MotoboyAssignModal from '../components/MotoboyAssignModal';
import { Motoboy, isDeliveryOrderType, getDeliveryResponsibleLabel } from '../utils/motoboys';
import { SubscriptionLockoutOverlay } from '../components/SubscriptionLockoutOverlay';
import { useSubscription } from '../hooks/useSubscription';

// Aba de Cobrança oculta neste projeto por enquanto. Mudar para true reativa a aba e o bloqueio por atraso.
const BILLING_ENABLED = false;
import { startOfDay, endOfDay } from 'date-fns';



const safeGetDate = (dStr: any): Date | null => {
  if (!dStr) return null;
  try {
    const d = new Date(dStr);
    return isNaN(d.getTime()) ? null : d;
  } catch (e) {
    return null;
  }
};

const formatCurrency = (val: any): string => {
  const num = typeof val === 'number' ? val : Number(val) || 0;
  return `R$ ${num.toFixed(2)}`;
};

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

const CHART_COLORS = ["#083d07", "#d5af7a", "#745240", "#5f8f3e", "#b88a44", "#a89284"];


const playNotificationSound = () => {
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    
    const playChime = (time: number, freq: number, duration: number) => {
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();
      osc.type = 'triangle'; // Softer, more bell-like
      osc.frequency.setValueAtTime(freq, time);
      
      gainNode.gain.setValueAtTime(0, time);
      gainNode.gain.linearRampToValueAtTime(0.6, time + 0.05);
      gainNode.gain.exponentialRampToValueAtTime(0.01, time + duration);
      
      osc.connect(gainNode);
      gainNode.connect(ctx.destination);
      
      osc.start(time);
      osc.stop(time + duration);
    };

    const t = ctx.currentTime;
    // Turu-turu! (Sequence of notes)
    playChime(t, 1318.51, 0.15); // E6
    playChime(t + 0.15, 1046.50, 0.2); // C6
    
    playChime(t + 0.4, 1318.51, 0.15); // E6
    playChime(t + 0.55, 1046.50, 0.4); // C6
  } catch (e) {
    console.log("Audio play failed", e);
  }
};

export default function AdminDashboard() {
  const { menuItems, categories: dbCategories, loading: menuLoading, usingFallback } = useMenu();
  const { 
    subscription, 
    statusInfo: subscriptionStatusInfo, 
    refreshSubscription, 
    simulateState: simulateSubscriptionState 
  } = useSubscription();

  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [manualClosed, setManualClosed] = useState(false);
  const [storeStatus, setStoreStatus] = useState<'open'|'paused'|'closed'>('open');
  const [pausedUntil, setPausedUntil] = useState<string|null>(null);
  const [showStoreMenu, setShowStoreMenu] = useState(false);
  const [adminLogoUrl, setAdminLogoUrl] = useState('');
  const [overviewViewMode, setOverviewViewMode] = useState<'cockpit' | 'grid'>('cockpit');
  const [overviewChartTab, setOverviewChartTab] = useState<'faturamento' | 'categorias' | 'produtos' | 'pagamentos'>('faturamento');
  const [isOverviewChartDropdownOpen, setIsOverviewChartDropdownOpen] = useState(false);
  const overviewChartDropdownRef = useRef<HTMLDivElement>(null);
  const [activeCategory, setActiveCategory] = useState<string>('');

  const PAGE_TITLES: Record<string, { title: string; subtitle: string }> = {
    'visao-geral': { title: 'Visão Geral', subtitle: 'Acompanhe o desempenho do seu negócio em tempo real.' },
    'pedidos': { title: 'Pedidos', subtitle: 'Gerencie e acompanhe os pedidos em tempo real.' },
    'caixa': { title: 'Caixa', subtitle: 'Abertura, fechamento e conferência do turno.' },
    'motoboys': { title: 'Motoboys', subtitle: 'Entregas, gastos por plataforma e fechamento dos motoboys.' },
    'cardapio-digital': { title: 'Cardápio Digital', subtitle: 'Espelho do que os clientes veem na loja.' },
    'gestao-cardapio': { title: 'Produtos', subtitle: 'Gerencie o cardápio, preços e fotos.' },
    'categorias': { title: 'Categorias', subtitle: 'Organize as categorias do cardápio.' },
    'relatorios': { title: 'Relatórios', subtitle: 'Vendas, ticket médio e produtos mais vendidos.' },
    'clientes': { title: 'Clientes', subtitle: 'Histórico e cadastro de clientes.' },
    'cobranca': { title: 'Cobrança', subtitle: '' },
    'configuracoes': { title: 'Configurações', subtitle: 'Horário, impressão, logo e dados da empresa.' },
    'banner-promocional': { title: 'Banner Promocional', subtitle: 'Configure o pop-up de aviso ou promoção exibido no cardápio.' },
    'agente-ia': { title: 'Agente IA', subtitle: 'Configurações e controles da sua atendente virtual.' },
    'usuarios': { title: 'Usuários & Permissões', subtitle: 'Gerencie os acessos da sua equipe.' },
  };
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [userPermissions, setUserPermissions] = useState<Record<string, boolean>>({});
  const isOwner = userRole === 'owner';

  const hasPermission = (permKey: string): boolean => {
    if (!userRole || userRole === 'owner') return true;
    return !!userPermissions[permKey];
  };

  const [dashboardData, setDashboardData] = useState<any>(null);
  const [allOrders, setAllOrders] = useState<any[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<any[]>([]);
  const [ticketMedioTab, setTicketMedioTab] = useState<'todos' | 'mesa' | 'retirada' | 'entrega'>('todos');
  const [reportModal, setReportModal] = useState<{isOpen: boolean, type: string, title: string}>({isOpen: false, type: '', title: ''});
  const [allCashSessions, setAllCashSessions] = useState<any[]>([]);
  const [filteredCashSessions, setFilteredCashSessions] = useState<any[]>([]);
  const [selectedSessionForDetails, setSelectedSessionForDetails] = useState<any>(null);
  const [pausedItems, setPausedItems] = useState<string[]>([]);
  const [printOrder, setPrintOrder] = useState<any>(null);
  const [showPrintPreview, setShowPrintPreview] = useState(false);
  const [cardapioSearchTerm, setCardapioSearchTerm] = useState("");
  const [autoPrint, setAutoPrint] = useState(() => localStorage.getItem("autoPrint") === "true");
  const autoPrintRef = useRef(autoPrint);
  const [soundEnabled, setSoundEnabled] = useState(() => localStorage.getItem("soundEnabled") !== "false");
  const soundEnabledRef = useRef(soundEnabled);

  useEffect(() => {
    soundEnabledRef.current = soundEnabled;
    localStorage.setItem("soundEnabled", soundEnabled ? "true" : "false");
  }, [soundEnabled]);

  const toggleSound = () => setSoundEnabled(prev => !prev);
  const [lastSeenOrderId, setLastSeenOrderId] = useState<number | null>(null);
  const lastSeenOrderIdRef = useRef(lastSeenOrderId);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordChangeMessage, setPasswordChangeMessage] = useState("");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<any | null>(null);
  const [ordersViewMode, setOrdersViewMode] = useState<'cards' | 'table'>('table');
  const [ordersStatusFilter, setOrdersStatusFilter] = useState<'todos' | 'Pendente' | 'Em Preparo' | 'Saiu para Entrega' | 'Finalizado' | 'Cancelado'>('todos');
  const [ordersSearchTerm, setOrdersSearchTerm] = useState('');
  const [motoboys, setMotoboys] = useState<Motoboy[]>([]);
  const [assigningDelivery, setAssigningDelivery] = useState<{ order: any; nextStatus?: string } | null>(null);

  const getElapsedTime = (createdAt: string | Date) => {
    if (!createdAt) return { text: '', minutes: 0, urgency: 'normal' };
    const d = new Date(createdAt);
    if (isNaN(d.getTime())) return { text: '', minutes: 0, urgency: 'normal' };
    const diffMinutes = Math.floor((Date.now() - d.getTime()) / 60000);
    if (diffMinutes < 1) return { text: 'Agora mesmo', minutes: 0, urgency: 'normal' };
    if (diffMinutes < 60) {
      const urgency = diffMinutes >= 35 ? 'danger' : diffMinutes >= 20 ? 'warning' : 'normal';
      return { text: `há ${diffMinutes} min`, minutes: diffMinutes, urgency };
    }
    const diffHours = Math.floor(diffMinutes / 60);
    return { text: `há ${diffHours}h`, minutes: diffMinutes, urgency: diffMinutes >= 60 ? 'danger' : 'normal' };
  };

  const handleSaveOrderEdit = async (updatedOrder: any) => {
    // 1. Atualização Otimista Imediata no Estado React (Gestor, Comanda e Gráficos atualizam sem recarregar página)
    const normPm = (updatedOrder.payment_method || updatedOrder.paymentMethod || 'Dinheiro').toString().trim();
    const normalizedPaymentMethod = (normPm.toLowerCase() === 'mbway' || normPm.toLowerCase() === 'mb way') ? 'MB Way' : normPm;

    const formattedUpdatedOrder = {
      ...updatedOrder,
      customerName: updatedOrder.customer_name || updatedOrder.customerName,
      customerPhone: updatedOrder.customer_phone || updatedOrder.customerPhone,
      orderType: updatedOrder.order_type || updatedOrder.orderType,
      paymentMethod: normalizedPaymentMethod,
      payment_method: normalizedPaymentMethod,
      deliveryAddress: updatedOrder.delivery_address || updatedOrder.deliveryAddress || '',
      delivery_address: updatedOrder.delivery_address || updatedOrder.deliveryAddress || '',
      deliveryZone: updatedOrder.delivery_zone || updatedOrder.deliveryZone || '',
      delivery_zone: updatedOrder.delivery_zone || updatedOrder.deliveryZone || '',
      items: updatedOrder.items,
      discountAmount: Number(updatedOrder.discount_amount ?? updatedOrder.discountAmount ?? 0),
      discount_amount: Number(updatedOrder.discount_amount ?? updatedOrder.discountAmount ?? 0),
      additionalAmount: Number(updatedOrder.additional_amount ?? updatedOrder.additionalAmount ?? 0),
      additional_amount: Number(updatedOrder.additional_amount ?? updatedOrder.additionalAmount ?? 0),
      totalAmount: Number(updatedOrder.total_amount ?? updatedOrder.totalAmount ?? 0),
      total_amount: Number(updatedOrder.total_amount ?? updatedOrder.totalAmount ?? 0),
      editReason: updatedOrder.edit_reason || updatedOrder.editReason || '',
      edit_reason: updatedOrder.edit_reason || updatedOrder.editReason || '',
      isEdited: true,
      is_edited: true,
      updatedAt: new Date().toISOString()
    };

    // Atualiza allOrders
    setAllOrders(prev => prev.map(o => o.id === updatedOrder.id ? { ...o, ...formattedUpdatedOrder } : o));

    // Atualiza filteredOrders
    setFilteredOrders(prev => prev.map(o => o.id === updatedOrder.id ? { ...o, ...formattedUpdatedOrder } : o));

    // Atualiza dashboardData (recentOrders, KPIs e gráfico de formas de pagamento)
    setDashboardData((prev: any) => {
      if (!prev) return prev;
      const updatedRecent = (prev.recentOrders || []).map((o: any) => 
        o.id === updatedOrder.id ? { ...o, ...formattedUpdatedOrder } : o
      );
      
      // Recalcular distribuição de formas de pagamento em tempo real
      const pmCounts: Record<string, { count: number, revenue: number }> = {
        'MB Way': { count: 0, revenue: 0 },
        'Numerário': { count: 0, revenue: 0 }
      };
      let totalFat = 0;
      updatedRecent.forEach((o: any) => {
        if (o.status !== 'Cancelado' && o.status !== 'cancelado') {
          const pmRaw = (o.paymentMethod || o.payment_method || '').trim();
          const pmNorm = normalizePaymentMethod(pmRaw);
          const pm = (pmNorm === 'MB Way' || pmRaw.toLowerCase().includes('mb')) ? 'MB Way' : 'Numerário';
          const amt = Number(o.totalAmount || o.total_amount || 0);
          pmCounts[pm].count += 1;
          pmCounts[pm].revenue += amt;
          totalFat += amt;
        }
      });
      const newPaymentMethodsData = Object.entries(pmCounts)
        .filter(([_, data]) => data.count > 0 || data.revenue > 0)
        .map(([name, data]) => ({ name, value: Number(data.revenue.toFixed(2)), count: data.count }))
        .sort((a, b) => b.value - a.value);

      return {
        ...prev,
        recentOrders: updatedRecent,
        paymentMethodsData: newPaymentMethodsData,
        faturamentoBruto: totalFat > 0 ? totalFat : prev.faturamentoBruto,
        faturamento: totalFat > 0 ? totalFat : prev.faturamento
      };
    });

    // Se a comanda / talão estiver com esse pedido aberto ou em cache, atualiza imediatamente
    setPrintOrder((prev: any) => {
      if (prev && prev.id === updatedOrder.id) {
        return { ...prev, ...formattedUpdatedOrder };
      }
      return prev;
    });

    setEditingOrder(null);

    try {
      const { error } = await supabase.from('orders').update({
        customer_name: formattedUpdatedOrder.customerName,
        customer_phone: formattedUpdatedOrder.customerPhone,
        order_type: formattedUpdatedOrder.orderType,
        payment_method: formattedUpdatedOrder.paymentMethod,
        delivery_address: formattedUpdatedOrder.deliveryAddress,
        delivery_zone: formattedUpdatedOrder.deliveryZone,
        items: formattedUpdatedOrder.items,
        discount_amount: formattedUpdatedOrder.discountAmount,
        additional_amount: formattedUpdatedOrder.additionalAmount,
        total_amount: formattedUpdatedOrder.totalAmount,
        edit_reason: formattedUpdatedOrder.editReason,
        is_edited: true,
        updated_at: formattedUpdatedOrder.updatedAt
      }).eq('id', updatedOrder.id);

      if (error) throw error;
      fetchDashboardData(true);
    } catch (err: any) {
      console.error('Erro ao atualizar pedido:', err);
      alert('Erro ao sincronizar atualização no banco: ' + err.message);
    }
  };

  const handleDeleteOrder = async (orderId: any) => {
    if (!window.confirm(`Tem certeza de que deseja APAGAR/EXCLUIR permanentemente o Pedido #${orderId}?`)) {
      return;
    }
    try {
      const { error } = await supabase.from('orders').delete().eq('id', orderId);
      if (error) throw error;
      fetchDashboardData(true);
      alert(`Pedido #${orderId} excluído com sucesso!`);
    } catch (err: any) {
      console.error('Erro ao excluir pedido:', err);
      alert('Erro ao excluir pedido: ' + err.message);
    }
  };

  const fetchDashboardData = async (isBackground = false, overrideFilter?: string) => {
    try {
      const filter = overrideFilter || dateFilterRef.current || 'hoje';
      const { data: activeSessionData } = await supabase.from('cash_sessions').select('id').eq('status', 'aberto').limit(1).maybeSingle();
      const activeSessionId = activeSessionData?.id || null;
      
      const { data: dbExpenses, error: expensesError } = await supabase.from('expenses').select('*').order('created_at', { ascending: false });
      if (expensesError) console.error(expensesError);
      setExpenses(dbExpenses || []);
      // Sem a migration de motoboys aplicada a consulta falha e a lista fica vazia
      const { data: dbMotoboys } = await supabase.from('motoboys').select('*').order('name', { ascending: true });
      setMotoboys((dbMotoboys || []).map((m: any) => ({ ...m, default_fee: Number(m.default_fee) || 0 })));
      const { data: dbOrders, error: ordersError } = await supabase.from('orders').select('*').order('created_at', { ascending: false });
      if (ordersError) throw ordersError;

      const allDbOrders = (dbOrders || []).map(o => ({
        id: o.id,
        customerName: o.customer_name || 'Cliente Sem Nome',
        customerPhone: o.customer_phone || '',
        orderType: o.order_type || 'balcao',
        paymentMethod: o.payment_method || 'Outros',
        status: o.status || 'Pendente',
        totalAmount: Number(o.total_amount) || 0,
        deliveryAddress: o.delivery_address || '',
        deliveryZone: o.delivery_zone || '',
        changeFor: o.change_for || '',
        nif: o.nif || '',
        items: o.items,
        isEdited: o.is_edited,
        discountAmount: Number(o.discount_amount) || 0,
        additionalAmount: Number(o.additional_amount) || 0,
        editReason: o.edit_reason || '',
        notes: o.notes || '',
        updatedAt: o.updated_at,
        createdAt: o.created_at,
        cashSessionId: o.cash_session_id,
        deliveryProvider: o.delivery_provider || null,
        motoboyId: o.motoboy_id || null,
        deliveryCost: o.delivery_cost ?? null,
        motoboySettlementId: o.motoboy_settlement_id || null
      }));
      setAllOrders(allDbOrders);

      const now = new Date();
      let allOrdersAgg = allDbOrders;
      
      const safeGetTime = (dStr: any) => {
        if (!dStr) return null;
        try {
          const d = new Date(dStr);
          return isNaN(d.getTime()) ? null : d;
        } catch(e) {
          return null;
        }
      };

      if (filter === 'hoje') {
        const todayStr = now.toISOString().split('T')[0];
        allOrdersAgg = allDbOrders.filter(o => {
          const d = safeGetTime(o.createdAt);
          if (!d) return false;
          return d.toISOString().split('T')[0] === todayStr;
        });
      } else if (filter === 'ontem') {
        const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        const yesterdayStr = yesterday.toISOString().split('T')[0];
        allOrdersAgg = allDbOrders.filter(o => {
          const d = safeGetTime(o.createdAt);
          if (!d) return false;
          return d.toISOString().split('T')[0] === yesterdayStr;
        });
      } else if (filter === '7dias') {
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        allOrdersAgg = allDbOrders.filter(o => {
          const d = safeGetTime(o.createdAt);
          if (!d) return false;
          return d >= sevenDaysAgo;
        });
      } else if (filter === '30dias') {
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        allOrdersAgg = allDbOrders.filter(o => {
          const d = safeGetTime(o.createdAt);
          if (!d) return false;
          return d >= thirtyDaysAgo;
        });
      } else if (filter === 'mes') {
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();
        allOrdersAgg = allDbOrders.filter(o => {
          const d = safeGetTime(o.createdAt);
          if (!d) return false;
          return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
        });
      } else if (filter === 'mes_passado') {
        const prevMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const prevMonth = prevMonthDate.getMonth();
        const prevYear = prevMonthDate.getFullYear();
        allOrdersAgg = allDbOrders.filter(o => {
          const d = safeGetTime(o.createdAt);
          if (!d) return false;
          return d.getMonth() === prevMonth && d.getFullYear() === prevYear;
        });
      } else if (filter === 'todos') {
        allOrdersAgg = allDbOrders;
      } else if (filter === 'customizado') {
        const startStr = customStartDateRef.current;
        const endStr = customEndDateRef.current;
        if (startStr && endStr) {
          const start = new Date(`${startStr}T00:00:00`);
          const end = new Date(`${endStr}T23:59:59`);
          allOrdersAgg = allDbOrders.filter(o => {
            const d = safeGetTime(o.createdAt);
            if (!d) return false;
            return d >= start && d <= end;
          });
        }
      }

      setFilteredOrders(allOrdersAgg);

      // Fetch and enrich Cash Sessions
      const { data: dbCashSessions, error: cashSessionsError } = await supabase.from('cash_sessions').select('*').order('closed_at', { ascending: false });
      if (cashSessionsError) console.error(cashSessionsError);
      
      const allCashAgg = dbCashSessions || [];
      const enrichedCashSessions = allCashAgg.map(session => {
        let total_faturado = 0;
        const sessionOpenedAt = session.opened_at ? new Date(session.opened_at).getTime() : null;
        const sessionClosedAt = session.closed_at ? new Date(session.closed_at).getTime() : Date.now();
        allDbOrders?.forEach(o => {
          if (o.status === 'Cancelado' || o.status === 'cancelado') return;
          // Match by cashSessionId first, then fall back to date range
          const matchById = o.cashSessionId && o.cashSessionId === session.id;
          const orderTime = o.createdAt ? new Date(o.createdAt).getTime() : null;
          const matchByDate = !matchById && sessionOpenedAt && orderTime && orderTime >= sessionOpenedAt && orderTime <= sessionClosedAt;
          if (matchById || matchByDate) {
            total_faturado += Number(o.totalAmount || 0);
          }
        });
        return {
          ...session,
          total_faturado
        };
      });
      setAllCashSessions(enrichedCashSessions);

      // Filter Cash Sessions
      let filteredCashAgg = enrichedCashSessions;
      if (filter === 'hoje') {
        const todayStr = now.toISOString().split('T')[0];
        filteredCashAgg = enrichedCashSessions.filter(s => s.closed_at && s.closed_at.split('T')[0] === todayStr);
      } else if (filter === 'ontem') {
        const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        const yesterdayStr = yesterday.toISOString().split('T')[0];
        filteredCashAgg = enrichedCashSessions.filter(s => s.closed_at && s.closed_at.split('T')[0] === yesterdayStr);
      } else if (filter === '7dias') {
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        filteredCashAgg = enrichedCashSessions.filter(s => s.closed_at && new Date(s.closed_at) >= sevenDaysAgo);
      } else if (filter === '30dias') {
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        filteredCashAgg = enrichedCashSessions.filter(s => s.closed_at && new Date(s.closed_at) >= thirtyDaysAgo);
      } else if (filter === 'mes') {
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();
        filteredCashAgg = enrichedCashSessions.filter(s => {
          if (!s.closed_at) return false;
          const d = new Date(s.closed_at);
          return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
        });
      } else if (filter === 'mes_passado') {
        const prevMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const prevMonth = prevMonthDate.getMonth();
        const prevYear = prevMonthDate.getFullYear();
        filteredCashAgg = enrichedCashSessions.filter(s => {
          if (!s.closed_at) return false;
          const d = new Date(s.closed_at);
          return d.getMonth() === prevMonth && d.getFullYear() === prevYear;
        });
      } else if (filter === 'customizado') {
        const startStr = customStartDateRef.current;
        const endStr = customEndDateRef.current;
        if (startStr && endStr) {
          const start = new Date(`${startStr}T00:00:00`);
          const end = new Date(`${endStr}T23:59:59`);
          filteredCashAgg = enrichedCashSessions.filter(s => {
            if (!s.closed_at) return false;
            const d = new Date(s.closed_at);
            return d >= start && d <= end;
          });
        }
      }
      setFilteredCashSessions(filteredCashAgg);

      let faturamentoBruto = 0;
      let totalPedidos = allOrdersAgg.length;
      let faturamentoNumerario = 0;
      let faturamentoMBWay = 0;
      const paymentMethodCounts: Record<string, { count: number, revenue: number }> = {
        'MB Way': { count: 0, revenue: 0 },
        'Numerário': { count: 0, revenue: 0 }
      };
      
      const itemCounts: Record<string, {qty: number, revenue: number}> = {};
      const categoryCounts: Record<string, {qty: number, revenue: number}> = {};
      const pizzaCounts: Record<string, {qty: number, revenue: number}> = {};
      
      const dayNames = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
      const daysCounts: Record<string, {orders: number, revenue: number}> = {};
      dayNames.forEach(d => daysCounts[d] = { orders: 0, revenue: 0 });
      
      allOrdersAgg.forEach(order => {
        const amt = Number(order.totalAmount) || 0;
        faturamentoBruto += amt;
        const pmRaw = (order.paymentMethod || '').trim();
        const pmNorm = normalizePaymentMethod(pmRaw);
        const pm = (pmNorm === 'MB Way' || pmRaw.toLowerCase().includes('mb')) ? 'MB Way' : 'Numerário';
        paymentMethodCounts[pm].count += 1;
        paymentMethodCounts[pm].revenue += amt;
        if (pm === 'Numerário') faturamentoNumerario += amt;
        if (pm === 'MB Way') faturamentoMBWay += amt;

        const d = safeGetTime(order.createdAt);
        if (d) {
          const dayName = dayNames[d.getDay()];
          if (daysCounts[dayName]) {
            daysCounts[dayName].orders += 1;
            daysCounts[dayName].revenue += amt;
          }
        }

        if (order.items) {
          const itemsList = safeParseItems(order.items);
          itemsList.forEach(item => {
            const displayName = getItemNameTextForPrint(item);
            if (!itemCounts[displayName]) {
              itemCounts[displayName] = { qty: 0, revenue: 0 };
            }
            itemCounts[displayName].qty += (Number(item.quantity) || 1);
            itemCounts[displayName].revenue += (Number(item.priceCalculated || item.price || item.basePrice) || 0) * (Number(item.quantity) || 1);

            const cat = item.category || 'outros';
            if (!categoryCounts[cat]) {
              categoryCounts[cat] = { qty: 0, revenue: 0 };
            }
            categoryCounts[cat].qty += (Number(item.quantity) || 1);
            categoryCounts[cat].revenue += (Number(item.priceCalculated || item.price || item.basePrice) || 0) * (Number(item.quantity) || 1);

            if (cat === 'tradicionais' || cat === 'especiais' || cat === 'vegetarianas' || cat === 'gourmet' || cat === 'doces' || cat === 'promocoes' || cat === 'pizzas' || displayName.toLowerCase().includes('pizza')) {
              if (!pizzaCounts[displayName]) {
                pizzaCounts[displayName] = { qty: 0, revenue: 0 };
              }
              pizzaCounts[displayName].qty += (Number(item.quantity) || 1);
              pizzaCounts[displayName].revenue += (Number(item.priceCalculated || item.price || item.basePrice) || 0) * (Number(item.quantity) || 1);
            }
          });
        }
      });

      const formatCategoryLabel = (cat: string): string => {
        if (!cat) return 'Outros';
        const c = cat.toLowerCase().trim();
        if (c === 'tradicionais') return 'Pizzas Tradicionais';
        if (c === 'especiais') return 'Pizzas Especiais';
        if (c === 'gourmet') return 'Pizzas Gourmet';
        if (c === 'vegetarianas') return 'Pizzas Vegetarianas';
        if (c === 'doces') return 'Pizzas Doces';
        if (c === 'esfihas-salgadas-tradicionais') return 'Esfihas Tradicionais';
        if (c === 'esfihas-salgadas-especiais') return 'Esfihas Especiais';
        if (c === 'esfihas-doces') return 'Esfihas Doces';
        if (c === 'esfihas' || c.includes('esfiha')) return 'Esfihas';
        if (c === 'bebidas') return 'Bebidas';
        if (c === 'bordas') return 'Bordas Recheadas';
        if (c === 'cafe' || c === 'café') return 'Café';
        if (c === 'promocoes' || c === 'promoções') return 'Promoções';
        return cat.charAt(0).toUpperCase() + cat.slice(1);
      };

      const weekDayDefs = [
        { name: 'Segunda', shortName: 'Seg', dayIndex: 1 },
        { name: 'Terça', shortName: 'Ter', dayIndex: 2 },
        { name: 'Quarta', shortName: 'Qua', dayIndex: 3 },
        { name: 'Quinta', shortName: 'Qui', dayIndex: 4 },
        { name: 'Sexta', shortName: 'Sex', dayIndex: 5 },
        { name: 'Sábado', shortName: 'Sáb', dayIndex: 6 },
        { name: 'Domingo', shortName: 'Dom', dayIndex: 0 },
      ];

      // Janela dos 7 dias mais recentes terminando hoje
      const recentDayMap: Record<number, { dateStr: string, displayDate: string, orders: number, revenue: number }> = {};
      for (let i = 6; i >= 0; i--) {
        const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
        const dayIdx = d.getDay();
        const dateStr = d.toISOString().split('T')[0];
        const displayDate = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
        recentDayMap[dayIdx] = {
          dateStr,
          displayDate,
          orders: 0,
          revenue: 0
        };
      }

      // Calcula APENAS o faturamento de cada dia específico recente (não a soma de todas as segundas da história)
      allDbOrders.forEach(order => {
        if (order.status === 'Cancelado' || order.status === 'cancelado') return;
        const d = safeGetTime(order.createdAt);
        if (!d) return;
        const orderDateStr = d.toISOString().split('T')[0];
        const dayIdx = d.getDay();
        if (recentDayMap[dayIdx] && recentDayMap[dayIdx].dateStr === orderDateStr) {
          const amt = Number(order.totalAmount) || 0;
          recentDayMap[dayIdx].orders += 1;
          recentDayMap[dayIdx].revenue += amt;
        }
      });

      const weeklyDailySalesData = weekDayDefs.map(def => {
        const item = recentDayMap[def.dayIndex] || { dateStr: '', displayDate: '', orders: 0, revenue: 0 };
        return {
          name: def.name,
          shortName: def.shortName,
          date: item.displayDate,
          fullName: `${def.name} (${item.displayDate})`,
          orders: item.orders,
          revenue: Number(item.revenue.toFixed(2))
        };
      });

      const popularItems = Object.entries(itemCounts)
        .map(([name, data]) => ({ name, ...data }))
        .sort((a, b) => b.qty - a.qty)
        .slice(0, 5);

      const popularPizzas = Object.entries(pizzaCounts)
        .map(([name, data]) => ({ name, ...data }))
        .sort((a, b) => b.qty - a.qty)
        .slice(0, 5);

      const salesByCategory = Object.entries(categoryCounts)
        .map(([name, data]) => ({ 
          name: formatCategoryLabel(name), 
          rawCategory: name,
          value: Number(data.revenue.toFixed(2)), 
          qty: data.qty 
        }))
        .sort((a, b) => b.value - a.value);

      const orderVolumeData = weeklyDailySalesData;
      const allDaysVolumeData = weeklyDailySalesData;

      
      const uniqueCustomers = new Set(allOrdersAgg.map(o => o.customerName)).size;
      const ticketMedio = totalPedidos > 0 ? (faturamentoBruto / totalPedidos) : 0;
      
      const paymentMethodsData = Object.entries(paymentMethodCounts)
        .filter(([_, data]) => data.count > 0 || data.revenue > 0)
        .map(([name, data]) => ({ 
          name, 
          value: Number(data.revenue.toFixed(2)),
          count: data.count
        }))
        .sort((a, b) => b.value - a.value);

      const pendingOrders = allOrdersAgg.filter(o => o.status === 'Pendente');

      const data = {
        status: "ok",
        activeSessionId,
        totalOrders: totalPedidos,
        totalRevenue: faturamentoBruto,
        faturamento: faturamentoBruto,
        faturamentoBruto: faturamentoBruto,
        ticketMedio,
        uniqueCustomers,
        paymentMethodsData,
        faturamentoNumerario,
        faturamentoMBWay,
        pendingOrders: pendingOrders.length,
        recentOrders: allDbOrders.filter(o => {
          // Se houver sessão de caixa aberta e o pedido pertencer a ela
          if (activeSessionId && o.cashSessionId === activeSessionId) return true;
          // Pedidos não finalizados/não cancelados sempre aparecem para a cozinha/gestão
          const isPendingOrActive = o.status !== 'Finalizado' && o.status !== 'Cancelado';
          if (isPendingOrActive) return true;
          // Pedidos do dia atual (mesmo que sem sessão aberta vinculada)
          const orderDate = safeGetTime(o.createdAt);
          const todayStr = now.toISOString().split('T')[0];
          return orderDate && orderDate.toISOString().split('T')[0] === todayStr;
        }),
        popularItems,
        popularPizzas,
        chartData: {
          salesByCategory,
          orderVolumeData,
          allDaysVolumeData
        }
      };

      setDashboardData(data);
      setFilteredOrders(allOrdersAgg);
      if (data.recentOrders && data.recentOrders.length > 0) {
        const latestOrder = data.recentOrders[0];
        
        if (lastSeenOrderIdRef.current !== null && latestOrder.id > lastSeenOrderIdRef.current) {
          if (soundEnabledRef.current) {
            playNotificationSound();
          }
          if (autoPrintRef.current) {
            handlePrintOrder(latestOrder);
          }
        }
        if (lastSeenOrderIdRef.current === null || latestOrder.id > lastSeenOrderIdRef.current) {
          setLastSeenOrderId(latestOrder.id);
          lastSeenOrderIdRef.current = latestOrder.id;
        }
      }
      
      const { data: dbPaused, error: pausedError } = await supabase.from('paused_items').select('id');
      if (pausedError) throw pausedError;
      if (dbPaused) {
        setPausedItems(dbPaused.map(pi => pi.id));
      }

    } catch (err) {
      console.error("Failed to fetch dashboard data", err);
    } finally {
      if (!isBackground) setIsLoading(false);
    }
  };


  const toggleAutoPrint = () => {
    const newVal = !autoPrint;
    setAutoPrint(newVal);
    autoPrintRef.current = newVal;
    localStorage.setItem("autoPrint", String(newVal));
  };

  const handlePrintOrder = async (order: any) => {
    setPrintOrder(order);
    setShowPrintPreview(true);
  };

  const handleConfirmPrint = () => {
    window.print();
  };

  const handleClosePrintPreview = () => {
    setShowPrintPreview(false);
    setPrintOrder(null);
  };

  // Dismiss on ESC for AdminDashboard modals and mobile drawer
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showPrintPreview) {
          setShowPrintPreview(false);
          setPrintOrder(null);
        } else if (reportModal.isOpen) {
          setReportModal({ isOpen: false, type: '', title: '' });
        } else if (isPasswordModalOpen) {
          setIsPasswordModalOpen(false);
        } else if (selectedSessionForDetails) {
          setSelectedSessionForDetails(null);
        } else if (isMobileMenuOpen) {
          setIsMobileMenuOpen(false);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showPrintPreview, reportModal.isOpen, isPasswordModalOpen, selectedSessionForDetails, isMobileMenuOpen]);

  const [activeTab, setActiveTab] = useState("visao-geral");
  const [showPDVModal, setShowPDVModal] = useState(false);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [refreshCaixaSignal, setRefreshCaixaSignal] = useState(0);

  const [dateFilter, setDateFilter] = useState("hoje");
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const dateFilterRef = useRef(dateFilter);
  const customStartDateRef = useRef(customStartDate);
  const customEndDateRef = useRef(customEndDate);
  useEffect(() => {
    dateFilterRef.current = dateFilter;
    customStartDateRef.current = customStartDate;
    customEndDateRef.current = customEndDate;
  }, [dateFilter, customStartDate, customEndDate]);

  
  
  const purgeAllTestData = async (showAlert = false) => {
    try {
      await supabase.from('orders').delete().neq('id', 0);
      await supabase.from('orders').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('cash_sessions').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('customers').delete().neq('id', '00000000-0000-0000-0000-000000000000');

      ['mock_db_orders', 'mock_db_cash_sessions', 'mock_db_customers', 'mock_db_caixa', 'orders', 'cash_sessions', 'customers'].forEach(k => {
        localStorage.removeItem(k);
      });

      setAllOrders([]);
      setDashboardData({
        faturamentoGeral: 0,
        faturamentoMes: 0,
        faturamentoSeteDias: 0,
        pedidosConcluidos: 0,
        ticketMedio: 0,
        cancelamentosCount: 0,
        cancelamentosValor: 0,
        vendasHojeCount: 0,
        vendasHojeTotal: 0,
        produtosPopulares: [],
        vendasComplementos: [],
        vendasFormasPagamento: [],
        pedidosHoje: []
      });

      await fetchDashboardData(true);
      if (showAlert) {
        alert('Todos os dados de vendas, caixa, relatórios e clientes de teste foram zerados com sucesso!');
      }
    } catch (err: any) {
      console.error('Erro ao zerar dados:', err);
      if (showAlert) alert('Erro ao zerar dados: ' + (err.message || String(err)));
    }
  };

  useEffect(() => {
    const fetchRole = async (userId: string) => {
      const { data } = await supabase.from('profiles').select('role, permissions').eq('id', userId).maybeSingle();
      setUserRole(data?.role || null);
      if (data?.permissions && typeof data.permissions === 'object') {
        setUserPermissions(data.permissions);
      } else {
        setUserPermissions({});
      }
    };

    // CÓDIGO DE PURGE AUTOMÁTICO REMOVIDO PARA EVITAR EXCLUSÃO DE DADOS DE PRODUÇÃO

    const sessionTimeout = setTimeout(() => {
      setIsLoading(false);
    }, 3500);

    supabase.auth.getSession().then(({ data: { session } }) => {
      clearTimeout(sessionTimeout);
      if (session?.user) {
        setIsAuthenticated(true);
        fetchRole(session.user.id).finally(() => setIsLoading(false));
      } else {
        setIsLoading(false);
      }
    }).catch((err) => {
      clearTimeout(sessionTimeout);
      console.warn("Erro ao obter sessão:", err);
      setIsLoading(false);
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      clearTimeout(sessionTimeout);
      if (session?.user) {
        setIsAuthenticated(true);
        fetchRole(session.user.id).finally(() => setIsLoading(false));
      } else {
        setIsAuthenticated(false);
        setUserRole(null);
        setUserPermissions({});
        setIsLoading(false);
      }
    });

    return () => {
      clearTimeout(sessionTimeout);
      authListener?.subscription?.unsubscribe?.();
    };
  }, []);

  useEffect(() => {
    if (!userRole || userRole === 'owner') return;

    const tabPermissionMap: Record<string, string> = {
      'visao-geral': 'ver_relatorios',
      'pedidos': 'ver_pedidos',
      'caixa': 'gerenciar_caixa',
      'motoboys': 'gerenciar_caixa',
      'gestao-cardapio': 'gerenciar_produtos',
      'categorias': 'gerenciar_categorias',
      'relatorios': 'ver_relatorios',
      'clientes': 'ver_clientes',
      'configuracoes': 'gerenciar_configuracoes',
      'usuarios': 'gerenciar_usuarios',
    };

    const requiredPerm = tabPermissionMap[activeTab];
    if (requiredPerm && !userPermissions[requiredPerm]) {
      if (userPermissions['ver_pedidos']) setActiveTab('pedidos');
      else if (userPermissions['gerenciar_caixa']) setActiveTab('caixa');
      else if (userPermissions['gerenciar_produtos']) setActiveTab('gestao-cardapio');
      else setActiveTab('pedidos');
    }
  }, [userRole, userPermissions, activeTab]);

  useEffect(() => {
    const loadStoreStatus = async () => {
      const { data } = await supabase.from('settings').select('key, value').in('key', ['manual_store_closed', 'store_status', 'paused_until']);
      const getVal = (k: string) => data?.find(d => d.key === k)?.value;
      
      setManualClosed(getVal('manual_store_closed') === true);
      setStoreStatus(getVal('store_status') || 'open');
      setPausedUntil(getVal('paused_until') || null);
    };
    loadStoreStatus();
  }, []);

  useEffect(() => {
    const loadAdminLogo = async () => {
      const { data } = await supabase.from('settings').select('value').eq('key', 'admin_logo_url').maybeSingle();
      if (data?.value) setAdminLogoUrl(data.value);
    };
    loadAdminLogo();
  }, []);

  const handleStoreAction = async (action: 'open' | 'pause_30m' | 'pause_1h' | 'pause_2h' | 'close') => {
    setShowStoreMenu(false);
    
    if (action === 'open' && !dashboardData?.activeSessionId) {
      alert("⚠️ Você precisa ABRIR O CAIXA primeiro (na aba 'Caixa') antes de abrir a loja para receber pedidos.");
      setActiveTab('caixa');
      return;
    }

    let newStatus = 'open';
    let newPausedUntil = null;
    let newManualClosed = false;

    if (action.startsWith('pause_')) {
      newStatus = 'paused';
      const now = new Date();
      if (action === 'pause_30m') now.setMinutes(now.getMinutes() + 30);
      else if (action === 'pause_1h') now.setHours(now.getHours() + 1);
      else if (action === 'pause_2h') now.setHours(now.getHours() + 2);
      newPausedUntil = now.toISOString();
    } else if (action === 'close') {
      newStatus = 'closed';
      newManualClosed = true;
      setActiveTab('caixa'); // Redireciona para o caixa no fim do dia
    }

    setStoreStatus(newStatus as 'open'|'paused'|'closed');
    setPausedUntil(newPausedUntil);
    setManualClosed(newManualClosed);

    await supabase.from('settings').upsert([
      { key: 'store_status', value: newStatus, updated_at: new Date().toISOString() },
      { key: 'paused_until', value: newPausedUntil || '', updated_at: new Date().toISOString() },
      { key: 'manual_store_closed', value: newManualClosed, updated_at: new Date().toISOString() }
    ], { onConflict: 'key' });
  };
  useEffect(() => {
    if (!isAuthenticated) return;
    
    fetchDashboardData();
  }, [isAuthenticated, dateFilter]);

  useEffect(() => {
    if (!isAuthenticated) return;
    
    const interval = setInterval(() => {
      fetchDashboardData(true);
    }, 15000);

    // Supabase Realtime para sincronização instantânea de pedidos entre telas e abas
    const channel = supabase
      .channel('admin-orders-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        () => {
          fetchDashboardData(true);
        }
      )
      .subscribe();
    
    return () => {
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, [isAuthenticated]);

  
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setPasswordChangeMessage("As senhas não coincidem.");
      return;
    }
    if (newPassword.length < 6) {
      setPasswordChangeMessage("A senha deve ter pelo menos 6 caracteres.");
      return;
    }

    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      setPasswordChangeMessage("Senha alterada com sucesso!");
      setTimeout(() => {
        setIsPasswordModalOpen(false);
        setNewPassword("");
        setConfirmPassword("");
        setPasswordChangeMessage("");
      }, 2000);
    } catch (err: any) {
      setPasswordChangeMessage("Erro ao alterar a senha: " + err.message);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");
    setIsLoading(true);

    try {
      const trimmedUser = username.trim().toLowerCase();
      let pass = password.trim();

      let email = trimmedUser;
      if (trimmedUser === 'dobro' || trimmedUser === 'dobropizza' || trimmedUser === 'dobro@dobropizza.com') {
        email = 'dobro@dobropizza.com';
      } else if (trimmedUser === 'admin' || trimmedUser === 'admin@dobropizza.com') {
        email = 'dobro@dobropizza.com';
      } else if (!email.includes('@')) {
        email = email + '@dobropizza.com';
      }

      let { error } = await supabase.auth.signInWithPassword({
        email: email,
        password: pass,
      });

      // Se falhar e for dobro ou admin, tenta a conta alternativa com a mesma senha
      if (error && (email === 'dobro@dobropizza.com' || email === 'admin@dobropizza.com')) {
        const altEmail = email === 'dobro@dobropizza.com' ? 'admin@dobropizza.com' : 'dobro@dobropizza.com';
        const fallback = await supabase.auth.signInWithPassword({
          email: altEmail,
          password: pass,
        });
        error = fallback.error;
      }

      if (error) throw error;
      // isAuthenticated, userRole e isLoading são atualizados automaticamente
      // pelo listener onAuthStateChange configurado acima.
    } catch (err) {
      console.error(err);
      setLoginError("Credenciais inválidas ou erro de conexão");
      setIsLoading(false);
    }
  };

  const togglePauseCategory = async (categoryGroup: string[], isPaused: boolean) => {
    try {
      const itemsInCategory = menuItems.filter(item => categoryGroup.includes(item.category));
      const itemIds = itemsInCategory.map(i => i.id);
            
      if (!isPaused) {
        const toInsert = itemIds.map(id => ({ id, paused_at: new Date().toISOString() }));
        const { error } = await supabase.from('paused_items').upsert(toInsert, { onConflict: 'id' });
        if (error) throw error;
      } else {
        const { error } = await supabase.from('paused_items').delete().in('id', itemIds);
        if (error) throw error;
      }
      fetchDashboardData(true);
    } catch (err: any) {
      console.error("Failed to toggle category pause status", err);
      alert("Erro ao pausar categoria: " + err.message);
    }
  };

  const togglePauseItem = async (itemId: string) => {
    try {
      const isPaused = pausedItems.includes(itemId);
      if (isPaused) {
        const { error } = await supabase.from('paused_items').delete().eq('id', itemId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('paused_items').upsert({ id: itemId }, { onConflict: 'id' });
        if (error) throw error;
      }
      fetchDashboardData(true);
    } catch (err: any) {
      console.error("Failed to toggle item pause status", err);
      alert("Erro ao pausar item: " + err.message);
    }
  };


  const handleExportCSV = () => {
    if (!allOrders || allOrders.length === 0) {
      alert("Nenhum dado para exportar");
      return;
    }
    const orders = allOrders;
    
    const headers = ['ID', 'Data', 'Cliente', 'Telefone', 'Tipo', 'Pagamento', 'Total', 'Status'];
    const rows = orders.map((o: any) => [
      o.id,
      (safeGetDate(o.createdAt) || new Date()).toLocaleString('pt-BR').replace(/,/g, ''),
      `"${o.customerName || ''}"`,
      o.customerPhone || '',
      o.orderType,
      o.paymentMethod,
      (Number(o.totalAmount) || 0).toFixed(2),
      o.status
    ]);
    
    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" 
      + headers.join(',') + '\n' 
      + rows.map(e => e.join(',')).join('\n');
      
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `relatorio_vendas_${dateFilter}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setDashboardData(null);
  };

  const updateOrderStatus = async (orderId: number, status: string) => {
    try {
      const { error } = await supabase.from('orders').update({ status }).eq('id', orderId);
      if (error) throw error;
      fetchDashboardData(true);
    } catch (err) {
      console.error("Failed to update status", err);
      console.error("Failed to update status", err);
    }
  };

  // Toda entrega precisa de um motoboy (próprio ou plataforma) antes de sair ou ser concluída
  const changeOrderStatus = (order: any, status: string) => {
    const needsMotoboy =
      isDeliveryOrderType(order.orderType) &&
      !order.deliveryProvider &&
      (status === 'Saiu para Entrega' || status === 'Finalizado');
    if (needsMotoboy) {
      setAssigningDelivery({ order, nextStatus: status });
      return;
    }
    updateOrderStatus(order.id, status);
  };

  const renderMotoboyBadge = (order: any) => {
    if (!isDeliveryOrderType(order.orderType)) return null;
    const responsible = getDeliveryResponsibleLabel(order.deliveryProvider, order.motoboyId, motoboys);
    return (
      <button
        type="button"
        onClick={() => setAssigningDelivery({ order })}
        title={responsible ? 'Alterar motoboy da entrega' : 'Vincular motoboy à entrega'}
        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-mono font-bold border cursor-pointer transition-colors ${
          responsible
            ? 'bg-white text-stone-800 border-stone-200 hover:bg-stone-100'
            : 'bg-amber-100 text-amber-900 border-amber-300 hover:bg-amber-200'
        }`}
      >
        <Bike size={12} />
        <span>{responsible || 'Sem motoboy'}</span>
        {responsible && order.deliveryCost !== null && order.deliveryCost !== undefined && (
          <span className="font-normal text-stone-500 tabular-nums">R$ {Number(order.deliveryCost).toFixed(2)}</span>
        )}
      </button>
    );
  };

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-50 text-gray-500 font-medium">Carregando...</div>;
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#fdfbf7] flex items-center justify-center p-4 font-sans">
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 w-full max-w-md">
          <div className="flex justify-center mb-6">
            <img src="/dobro/logo-dobro.svg" alt="DOBRO Pizzas" className="h-14 w-auto" />
          </div>
          <h1 className="text-2xl font-black text-center text-gray-900 mb-2">Acesso Restrito</h1>
          <p className="text-center text-gray-500 mb-8 text-sm">Gestor DOBRO Pizzas. Insira suas credenciais para continuar.</p>
          
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Usuário</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#083d07] focus:border-transparent outline-none transition-all"
                placeholder="Ex: dobro"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Senha</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#083d07] focus:border-transparent outline-none transition-all"
                placeholder="Ex: dobro"
                required
              />
            </div>
            {loginError && <p className="text-red-500 text-sm font-medium text-center bg-red-50 p-2 rounded-lg">{loginError}</p>}
            
            <button
              type="submit"
              className="w-full bg-[#083d07] text-white font-bold py-3 rounded-xl hover:bg-[#0b520a] transition-colors mt-2"
            >
              Entrar no Dashboard
            </button>
            <p className="text-xs text-stone-400 text-center mt-3">
              Acesso: <span className="font-semibold text-stone-600">dobro</span> | Senha: <span className="font-semibold text-stone-600">dobro</span>
            </p>
          </form>
        </div>
      </div>
    );
  }

    const categoriesUI = [
    {
      id: "promocoes",
      label: "PROMOÇÕES DO DIA",
      group: ["promocoes"],
    },
    {
      id: "tradicionais",
      label: "TRADICIONAIS",
      group: ["tradicionais"],
    },
    {
      id: "especiais",
      label: "ESPECIAIS",
      group: ["especiais"],
    },
    {
      id: "gourmet",
      label: "GOURMET",
      group: ["gourmet"],
    },
    {
      id: "vegetarianas",
      label: "VEGETARIANA",
      group: ["vegetarianas"],
    },
    {
      id: "doces",
      label: "DOCES",
      group: ["doces"],
    },
    {
      id: "esfihas",
      label: "ESFIHAS",
      group: [
        "esfihas-salgadas-tradicionais",
        "esfihas-salgadas-especiais",
        "esfihas-doces",
      ],
    },
    {
      id: "bebidas",
      label: "BEBIDAS",
      group: ["bebidas"],
    },
    {
      id: "cafe",
      label: "CAFÉ ☕",
      group: ["cafe"],
    },
    {
      id: "bordas",
      label: "BORDAS",
      group: ["bordas"],
    }
  ];

    const currentCategoriesUI = dbCategories && dbCategories.length > 0 && !usingFallback 
    ? dbCategories.map(cat => ({
       id: cat.id,
       label: cat.name.toUpperCase(),
       sub: "",
       group: [cat.id]
    }))
    : categoriesUI;

    if (!currentCategoriesUI.find(cat => cat.id === 'bordas')) {
      currentCategoriesUI.push({
        id: "bordas",
        label: "BORDAS 🧀",
        group: ["bordas"]
      } as any);
    }
  const itemsByCategory: Record<string, any[]> = {};
  currentCategoriesUI.forEach(cat => {
    itemsByCategory[cat.id] = menuItems.filter(item => cat.group.includes(item.category));
  });

  const { totalRevenue: faturamentoBruto = 0, totalOrders: totalPedidos = 0, ticketMedio = 0, uniqueCustomers = 0, paymentMethodsData = [], chartData = {} } = dashboardData || {};
  const salesData = chartData.allDaysVolumeData || [];

  return (
    <>
      {/* Mobile Top Header */}
      <header className="bg-[#e5ddd4] border-b border-[#d3c8bb] px-4 py-3 flex items-center justify-between sticky top-0 z-40 md:hidden w-full no-print">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setIsMobileMenuOpen(true)}
            className="p-2 rounded-lg bg-[#083d07] text-stone-300 hover:bg-[#0b520a] transition-colors border border-[#0b520a]"
            aria-label="Abrir Menu Admin"
          >
            <Menu size={20} />
          </button>
          <div>
            <h2 className="text-sm font-bold text-[#44210f] tracking-tight leading-none">DOBRO Pizzas</h2>
            <span className="text-[10px] text-[#745240] font-mono uppercase tracking-wider">
              {activeTab === 'visao-geral' && 'Visão Geral'}
              {activeTab === 'pedidos' && 'Pedidos'}
              {activeTab === 'caixa' && 'Caixa'}
              {activeTab === 'motoboys' && 'Motoboys'}
              {activeTab === "relatorios" && (
          <div className="mt-1 space-y-2.5 pb-12">
            {/* Filtro de Tempo Compacto Padronizado */}
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, ease: [0.2, 0, 0, 1] }}
              className="bg-white rounded-xl border border-stone-200/90 shadow-2xs px-3 py-1.5"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-600 shrink-0" />
                  <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-stone-800">
                    Período dos Relatórios
                  </span>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <PeriodFilterCompact
                    value={dateFilter as any}
                    startDate={customStartDate}
                    endDate={customEndDate}
                    onChange={(res) => {
                      setDateFilter(res.period);
                      dateFilterRef.current = res.period;
                      if (res.startDate) {
                        setCustomStartDate(res.startDate);
                        customStartDateRef.current = res.startDate;
                      }
                      if (res.endDate) {
                        setCustomEndDate(res.endDate);
                        customEndDateRef.current = res.endDate;
                      }
                      fetchDashboardData(false, res.period);
                    }}
                    align="right"
                  />

                  <button
                    onClick={() => fetchDashboardData()}
                    className="h-7 px-2 rounded-lg border border-stone-200 bg-white text-stone-600 hover:text-stone-950 hover:bg-stone-50 transition-colors cursor-pointer shadow-2xs flex items-center gap-1 text-[11px] font-mono font-medium"
                    title="Recarregar dados"
                  >
                    <RefreshCw size={11} className={isLoading ? 'animate-spin text-rose-600' : 'text-[#745240]'} />
                    <span className="hidden sm:inline">Atualizar</span>
                  </button>
                </div>
              </div>
            </motion.div>

            {/* Relatórios Financeiros & Faturamento */}
            <div>
              <motion.h2 
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, ease: [0.2, 0, 0, 1] }}
                className="text-[10.5px] font-mono font-bold uppercase tracking-wider text-stone-600 flex items-center gap-1.5 mb-1.5"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Relatórios Financeiros & Faturamento
              </motion.h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-2.5">
                <ReportCard
                  customDelay={0.05}
                  title="Fluxo de Caixa"
                  value={`R$ ${(dashboardData?.lucroLiquido ?? (filteredOrders.reduce((acc, o) => acc + o.totalAmount, 0) - (expenses.reduce((s, e) => s + Number(e.amount || 0), 0)))).toFixed(2)}`}
                  icon={<TrendingUp size={14} strokeWidth={1.5} className="text-emerald-950" />}
                  onClick={() => setReportModal({isOpen: true, type: 'fluxo_caixa', title: 'Relatório de Fluxo de Caixa (Entradas vs Saídas)'})}
                  subtitle="Entradas, Saídas e Lucro"
                />
                <ReportCard
                  customDelay={0.10}
                  title="Faturamento Geral"
                  value={`R$ ${filteredOrders.reduce((acc, o) => acc + o.totalAmount, 0).toFixed(2)}`}
                  icon={<DollarSign size={14} strokeWidth={1.5} className="text-emerald-950" />}
                  onClick={() => setReportModal({isOpen: true, type: 'faturamento', title: 'Faturamento Geral por Dia'})}
                  subtitle="Vendas por dia e pedidos"
                />
                <ReportCard
                  customDelay={0.15}
                  title="Pedidos no período"
                  value={`${filteredOrders.length} pedidos`}
                  icon={<Calendar size={14} strokeWidth={1.5} className="text-emerald-950" />}
                  onClick={() => setReportModal({isOpen: true, type: 'vendas_mes', title: 'Detalhamento de Pedidos'})}
                  subtitle="Lista completa de vendas"
                />
                <ReportCard
                  customDelay={0.20}
                  title="Ticket Médio"
                  value={`R$ ${filteredOrders.length > 0 ? (filteredOrders.reduce((acc, o) => acc + o.totalAmount, 0) / filteredOrders.length).toFixed(2) : '0.00'}`}
                  icon={<CreditCard size={14} strokeWidth={1.5} className="text-emerald-950" />}
                  onClick={() => {
                    setTicketMedioTab('todos');
                    setReportModal({isOpen: true, type: 'ticket_medio', title: 'Ticket Médio por Operação (Mesa, Retirada e Entrega)'});
                  }}
                  subtitle="Média por pedido e canais"
                />
              </div>
            </div>

            {/* Vendas por Canal, Produtos & Operação */}
            <div>
              <motion.h2 
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: 0.1, ease: [0.2, 0, 0, 1] }}
                className="text-[10.5px] font-mono font-bold uppercase tracking-wider text-stone-600 flex items-center gap-1.5 mb-1.5"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400" /> Vendas por Canal, Produtos & Operação
              </motion.h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-2.5">
                <ReportCard
                  customDelay={0.15}
                  title="Vendas de produtos"
                  value=""
                  icon={<Package size={14} strokeWidth={1.5} className="text-amber-950" />}
                  onClick={() => setReportModal({isOpen: true, type: 'produtos', title: 'Vendas de Produtos'})}
                  subtitle="Detalhamento por item"
                />
                <ReportCard
                  customDelay={0.20}
                  title="Vendas de complementos"
                  value=""
                  icon={<UtensilsCrossed size={14} strokeWidth={1.5} className="text-amber-950" />}
                  onClick={() => setReportModal({isOpen: true, type: 'complementos', title: 'Vendas de Complementos (Bordas e Extras)'})}
                  subtitle="Bordas e extras"
                />
                <ReportCard
                  customDelay={0.25}
                  title="Formas de Pagamento"
                  value=""
                  icon={<CreditCard size={14} strokeWidth={1.5} className="text-amber-950" />}
                  onClick={() => setReportModal({isOpen: true, type: 'pagamentos', title: 'Formas de Pagamento'})}
                  subtitle="PIX, Cartão e Dinheiro"
                />
                <ReportCard
                  customDelay={0.30}
                  title="Cancelamentos"
                  value=""
                  icon={<AlertCircle size={14} strokeWidth={1.5} className="text-amber-950" />}
                  onClick={() => setReportModal({isOpen: true, type: 'cancelamentos', title: 'Pedidos Cancelados'})}
                  subtitle="Análise de perdas"
                />
              </div>
            </div>
          </div>
        )}

        {activeTab === 'cardapio-digital' && 'Cardápio Digital'}
              {activeTab === 'gestao-cardapio' && 'Produtos'}
              {activeTab === 'categorias' && 'Categorias'}
              {activeTab === 'configuracoes' && 'Configurações'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <label className="flex items-center gap-1.5 cursor-pointer bg-[#083d07] px-2.5 py-1.5 rounded-lg border border-stone-700 text-xs font-mono font-semibold text-stone-300">
            <input 
              type="checkbox" 
              className="w-3.5 h-3.5 accent-emerald-500 rounded cursor-pointer"
              checked={autoPrint}
              onChange={toggleAutoPrint}
            />
            <span className="hidden sm:inline">Auto-Imprimir</span>
            <Printer size={14} className="sm:hidden text-stone-400" />
          </label>
        </div>
      </header>

      {/* Mobile Sidebar Modal Drawer */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden no-print">
          {/* Overlay */}
          <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity" 
            onClick={() => setIsMobileMenuOpen(false)}
          />
          
          {/* Drawer Content */}
          <div className="relative bg-[#e5ddd4] w-72 max-w-[85vw] h-full shadow-2xl p-5 flex flex-col justify-between overflow-y-auto z-10">
            <div>
              <div className="flex justify-between items-center pb-4 mb-4 border-b border-[#d3c8bb]">
                <div>
                  <h2 className="text-sm font-bold text-[#44210f] tracking-tight">DOBRO Pizzas</h2>
                  <p className="text-[10px] text-[#745240] uppercase tracking-wider font-mono mt-0.5">Pizzas Artesanais</p>
                </div>
                <button 
                  onClick={() => setIsMobileMenuOpen(false)} 
                  className="p-2 text-[#8a6f5c] hover:text-[#083d07] hover:bg-[#d9cfc3] rounded-lg transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-1 font-mono text-xs">
                {isOwner && (
                  <button 
                    onClick={() => { setActiveTab("visao-geral"); setIsMobileMenuOpen(false); }} 
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg font-semibold transition-colors ${activeTab === 'visao-geral' ? 'bg-[#fdfbf7] text-[#083d07] font-bold shadow-xs' : 'text-[#5c4433] hover:text-[#083d07] hover:bg-[#d9cfc3]'}`}
                  >
                    Visão Geral
                  </button>
                )}
                <button 
                  onClick={() => { setActiveTab("pedidos"); setIsMobileMenuOpen(false); }} 
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg font-semibold transition-colors ${activeTab === 'pedidos' ? 'bg-[#fdfbf7] text-[#083d07] font-bold shadow-xs' : 'text-[#5c4433] hover:text-[#083d07] hover:bg-[#d9cfc3]'}`}
                >
                  Pedidos
                </button>
                <button 
                  onClick={() => { setActiveTab("caixa"); setIsMobileMenuOpen(false); }} 
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg font-semibold transition-colors ${activeTab === 'caixa' ? 'bg-[#fdfbf7] text-[#083d07] font-bold shadow-xs' : 'text-[#5c4433] hover:text-[#083d07] hover:bg-[#d9cfc3]'}`}
                >
                  Caixa
                </button>
                <button 
                  onClick={() => { setActiveTab("despesas"); setIsMobileMenuOpen(false); }} 
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg font-semibold transition-colors ${activeTab === 'despesas' ? 'bg-[#fdfbf7] text-[#083d07] font-bold shadow-xs' : 'text-[#5c4433] hover:text-[#083d07] hover:bg-[#d9cfc3]'}`}
                >
                  Despesas
                </button>
                <button
                  onClick={() => { setActiveTab("motoboys"); setIsMobileMenuOpen(false); }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg font-semibold transition-colors ${activeTab === 'motoboys' ? 'bg-[#fdfbf7] text-[#083d07] font-bold shadow-xs' : 'text-[#5c4433] hover:text-[#083d07] hover:bg-[#d9cfc3]'}`}
                >
                  Motoboys
                </button>
                {isOwner && (
                  <button 
                    onClick={() => { setActiveTab("relatorios"); setIsMobileMenuOpen(false); }} 
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg font-semibold transition-colors ${activeTab === 'relatorios' ? 'bg-[#fdfbf7] text-[#083d07] font-bold shadow-xs' : 'text-[#5c4433] hover:text-[#083d07] hover:bg-[#d9cfc3]'}`}
                  >
                    Relatórios
                  </button>
                )}
                {isOwner && (
                  <button 
                    onClick={() => { setActiveTab("funil"); setIsMobileMenuOpen(false); }} 
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg font-semibold transition-colors ${activeTab === 'funil' ? 'bg-[#fdfbf7] text-[#083d07] font-bold shadow-xs' : 'text-[#5c4433] hover:text-[#083d07] hover:bg-[#d9cfc3]'}`}
                  >
                    Funil de Vendas
                  </button>
                )}
                {isOwner && (
                  <button 
                    onClick={() => { setActiveTab("clientes"); setIsMobileMenuOpen(false); }} 
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg font-semibold transition-colors ${activeTab === 'clientes' ? 'bg-[#fdfbf7] text-[#083d07] font-bold shadow-xs' : 'text-[#5c4433] hover:text-[#083d07] hover:bg-[#d9cfc3]'}`}
                  >
                    Clientes
                  </button>
                )}

                {isOwner && (
                  <div className="pt-3 mt-3 border-t border-[#d3c8bb]">
                    <p className="px-3 text-[10px] font-mono font-bold text-[#8a6f5c] uppercase tracking-wider mb-1">Cardápio</p>
                    <button 
                      onClick={() => { setActiveTab("cardapio-digital"); setIsMobileMenuOpen(false); }} 
                      className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg font-semibold transition-colors ${activeTab === 'cardapio-digital' ? 'bg-[#fdfbf7] text-[#083d07] font-bold shadow-xs' : 'text-[#5c4433] hover:text-[#083d07] hover:bg-[#d9cfc3]'}`}
                    >
                      Cardápio Digital
                    </button>
                    <button 
                      onClick={() => { setActiveTab("gestao-cardapio"); setIsMobileMenuOpen(false); }} 
                      className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg font-semibold transition-colors ${activeTab === 'gestao-cardapio' ? 'bg-[#fdfbf7] text-[#083d07] font-bold shadow-xs' : 'text-[#5c4433] hover:text-[#083d07] hover:bg-[#d9cfc3]'}`}
                    >
                      Produtos
                    </button>
                    <button 
                      onClick={() => { setActiveTab("categorias"); setIsMobileMenuOpen(false); }} 
                      className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg font-semibold transition-colors ${activeTab === 'categorias' ? 'bg-[#fdfbf7] text-[#083d07] font-bold shadow-xs' : 'text-[#5c4433] hover:text-[#083d07] hover:bg-[#d9cfc3]'}`}
                    >
                      Categorias
                    </button>
                    <button 
                      onClick={() => { setActiveTab("banner-promocional"); setIsMobileMenuOpen(false); }} 
                      className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg font-semibold transition-colors ${activeTab === 'banner-promocional' ? 'bg-[#fdfbf7] text-[#083d07] font-bold shadow-xs' : 'text-[#5c4433] hover:text-[#083d07] hover:bg-[#d9cfc3]'}`}
                    >
                      Banner Promocional
                    </button>
                  </div>
                )}

                {isOwner && (
                  <div className="pt-3 mt-3 border-t border-[#d3c8bb]">
                    <p className="px-3 text-[10px] font-mono font-bold text-[#8a6f5c] uppercase tracking-wider mb-1">Sistema</p>
                    <button 
                      onClick={() => { setActiveTab("configuracoes"); setIsMobileMenuOpen(false); }} 
                      className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg font-semibold transition-colors ${activeTab === 'configuracoes' ? 'bg-[#fdfbf7] text-[#083d07] font-bold shadow-xs' : 'text-[#5c4433] hover:text-[#083d07] hover:bg-[#d9cfc3]'}`}
                    >
                      Configurações
                    </button>
                    {BILLING_ENABLED && (
                    <button 
                      onClick={() => { setActiveTab("cobranca"); setIsMobileMenuOpen(false); }} 
                      className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg font-semibold transition-colors ${activeTab === 'cobranca' ? 'bg-[#fdfbf7] text-[#083d07] font-bold shadow-xs' : 'text-[#5c4433] hover:text-[#083d07] hover:bg-[#d9cfc3]'}`}
                    >
                      Cobrança & Assinatura
                    </button>
                    )}
                    <button 
                      onClick={() => { setActiveTab("usuarios"); setIsMobileMenuOpen(false); }} 
                      className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg font-semibold transition-colors ${activeTab === 'usuarios' ? 'bg-[#fdfbf7] text-[#083d07] font-bold shadow-xs' : 'text-[#5c4433] hover:text-[#083d07] hover:bg-[#d9cfc3]'}`}
                    >
                      Usuários
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="pt-4 border-t border-stone-100 space-y-1.5 font-mono text-xs">
              <button 
                onClick={() => { setIsPasswordModalOpen(true); setIsMobileMenuOpen(false); }}
                className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg font-semibold text-stone-700 hover:bg-stone-100 transition-colors"
              >
                <Key size={15} /> Alterar Senha
              </button>
              <button 
                onClick={handleLogout}
                className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg font-semibold text-rose-600 hover:bg-rose-50 transition-colors"
              >
                <LogOut size={15} /> Sair do Painel
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="min-h-screen bg-stone-50 flex flex-col md:flex-row font-sans no-print">
      {/* Sidebar */}
      <aside className="w-60 bg-[#e5ddd4] text-[#5c4433] border-r border-[#d3c8bb] flex-col hidden md:flex sticky top-0 h-screen overflow-hidden shrink-0 select-none">
        {/* Terminal Header */}
        <div className="py-3 px-3.5 border-b border-[#d3c8bb]/80 bg-[#e5ddd4] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl overflow-hidden bg-black border border-[#0b520a] shrink-0 flex items-center justify-center shadow-sm">
              <img src={adminLogoUrl || "/dobro/logo-dobro.png"} alt="DOBRO Pizzas" className="w-full h-full object-cover rounded-lg" onError={(e) => { (e.target as HTMLImageElement).src = "/dobro/logo-dobro.png"; }} />
            </div>
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-extrabold text-[#44210f] tracking-tight leading-tight truncate">DOBRO Pizzas</h2>
                <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 leading-none">Online</span>
              </div>
              <span className="text-[10px] font-mono text-[#745240] uppercase tracking-wider block mt-1 leading-none">Pizzas Artesanais</span>
            </div>
          </div>
        </div>

        {/* Status Loja */}
        <div className="p-1 border-b border-[#d3c8bb] relative shrink-0">
          <button
            onClick={() => setShowStoreMenu(!showStoreMenu)}
            className={`w-full flex items-center justify-center gap-1 px-2 py-0.5 rounded font-mono text-[10px] font-bold transition-colors cursor-pointer border ${
              storeStatus === 'closed' || manualClosed ? 'bg-rose-950/40 text-rose-300 border-rose-900/60 hover:bg-rose-900/40' : 
              storeStatus === 'paused' ? 'bg-amber-950/40 text-amber-300 border-amber-900/60 hover:bg-amber-900/40' :
              'bg-emerald-950/40 text-emerald-300 border-emerald-900/60 hover:bg-emerald-900/40'
            }`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${
              storeStatus === 'closed' || manualClosed ? 'bg-rose-500' : 
              storeStatus === 'paused' ? 'bg-amber-500' : 
              'bg-emerald-400'
            } animate-pulse`} />
            {storeStatus === 'closed' || manualClosed ? 'LOJA FECHADA' : 
             storeStatus === 'paused' ? 'LOJA PAUSADA' : 'LOJA ABERTA'}
          </button>

          {showStoreMenu && (
            <div className="absolute top-full left-1 right-1 mt-1 bg-[#083d07] border border-stone-700 rounded-lg shadow-xl z-50 overflow-hidden divide-y divide-stone-800 font-sans">
              {(storeStatus === 'closed' || manualClosed || storeStatus === 'paused') ? (
                <button
                  onClick={() => handleStoreAction('open')}
                  className="w-full text-left px-3 py-1.5 text-xs font-semibold text-emerald-400 hover:bg-[#0b520a] transition-colors cursor-pointer"
                >
                  Abrir Loja Agora
                </button>
              ) : (
                <>
                  <div className="p-1">
                    <p className="px-1 text-[8.5px] font-mono font-bold text-stone-500 uppercase tracking-wider">Pausa Temporária</p>
                    <button onClick={() => handleStoreAction('pause_30m')} className="w-full text-left px-2 py-0.5 text-xs text-stone-300 hover:bg-[#0b520a] hover:text-white rounded transition-colors cursor-pointer">Pausar por 30 min</button>
                    <button onClick={() => handleStoreAction('pause_1h')} className="w-full text-left px-2 py-0.5 text-xs text-stone-300 hover:bg-[#0b520a] hover:text-white rounded transition-colors cursor-pointer">Pausar por 1 hora</button>
                    <button onClick={() => handleStoreAction('pause_2h')} className="w-full text-left px-2 py-0.5 text-xs text-stone-300 hover:bg-[#0b520a] hover:text-white rounded transition-colors cursor-pointer">Pausar por 2 horas</button>
                  </div>
                  <div className="p-1 bg-[#d9cfc3]/50">
                    <button 
                      onClick={() => handleStoreAction('close')}
                      className="w-full text-left px-2 py-1 text-xs font-bold text-rose-500 hover:bg-rose-950/50 hover:text-rose-400 rounded transition-colors cursor-pointer"
                    >
                      Encerrar o Dia (Caixa)
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Menu Items */}
        <div className="p-1 flex-1 space-y-[2px] font-sans text-[11px] overflow-hidden">
          {hasPermission('ver_relatorios') && (
            <button 
              onClick={() => setActiveTab("visao-geral")} 
              className={`w-full flex items-center gap-1.5 px-2 py-[3.5px] rounded font-medium transition-colors cursor-pointer ${activeTab === 'visao-geral' ? 'bg-[#fdfbf7] text-[#083d07] font-bold shadow-xs border border-[#d5af7a]' : 'text-[#5c4433] hover:text-[#083d07] hover:bg-[#d9cfc3]'}`}
            >
              <LayoutDashboard size={12} className={activeTab === 'visao-geral' ? 'text-stone-950' : 'text-[#745240]'} />
              Visão Geral
            </button>
          )}
          {hasPermission('ver_pedidos') && (
            <button 
              onClick={() => setActiveTab("pedidos")} 
              className={`w-full flex items-center gap-1.5 px-2 py-[3.5px] rounded font-medium transition-colors cursor-pointer ${activeTab === 'pedidos' ? 'bg-[#fdfbf7] text-[#083d07] font-bold shadow-xs border border-[#d5af7a]' : 'text-[#5c4433] hover:text-[#083d07] hover:bg-[#d9cfc3]'}`}
            >
              <ShoppingBag size={12} className={activeTab === 'pedidos' ? 'text-stone-950' : 'text-[#745240]'} />
              Pedidos
            </button>
          )}
          {hasPermission('gerenciar_caixa') && (
            <button 
              onClick={() => setActiveTab("caixa")} 
              className={`w-full flex items-center gap-1.5 px-2 py-[3.5px] rounded font-medium transition-colors cursor-pointer ${activeTab === 'caixa' ? 'bg-[#fdfbf7] text-[#083d07] font-bold shadow-xs border border-[#d5af7a]' : 'text-[#5c4433] hover:text-[#083d07] hover:bg-[#d9cfc3]'}`}
            >
              <CreditCard size={12} className={activeTab === 'caixa' ? 'text-stone-950' : 'text-[#745240]'} />
              Caixa
            </button>
          )}
          {hasPermission('gerenciar_caixa') && (
            <button 
              onClick={() => setActiveTab("despesas")} 
              className={`w-full flex items-center gap-1.5 px-2 py-[3.5px] rounded font-medium transition-colors cursor-pointer ${activeTab === 'despesas' ? 'bg-[#fdfbf7] text-[#083d07] font-bold shadow-xs border border-[#d5af7a]' : 'text-[#5c4433] hover:text-[#083d07] hover:bg-[#d9cfc3]'}`}
            >
              <TrendingDown size={12} className={activeTab === 'despesas' ? 'text-stone-950' : 'text-[#745240]'} />
              Despesas
            </button>
          )}
          {hasPermission('gerenciar_caixa') && (
            <button
              onClick={() => setActiveTab("motoboys")}
              className={`w-full flex items-center gap-1.5 px-2 py-[3.5px] rounded font-medium transition-colors cursor-pointer ${activeTab === 'motoboys' ? 'bg-[#fdfbf7] text-[#083d07] font-bold shadow-xs border border-[#d5af7a]' : 'text-[#5c4433] hover:text-[#083d07] hover:bg-[#d9cfc3]'}`}
            >
              <Bike size={12} className={activeTab === 'motoboys' ? 'text-stone-950' : 'text-[#745240]'} />
              Motoboys
            </button>
          )}
          {hasPermission('ver_relatorios') && (
            <button 
              onClick={() => setActiveTab("relatorios")} 
              className={`w-full flex items-center gap-1.5 px-2 py-[3.5px] rounded font-medium transition-colors cursor-pointer ${activeTab === 'relatorios' ? 'bg-[#fdfbf7] text-[#083d07] font-bold shadow-xs border border-[#d5af7a]' : 'text-[#5c4433] hover:text-[#083d07] hover:bg-[#d9cfc3]'}`}
            >
              <BarChart3 size={12} className={activeTab === 'relatorios' ? 'text-stone-950' : 'text-[#745240]'} />
              Relatórios
            </button>
          )}
          {hasPermission('ver_relatorios') && (
            <button 
              onClick={() => setActiveTab("funil")} 
              className={`w-full flex items-center gap-1.5 px-2 py-[3.5px] rounded font-medium transition-colors cursor-pointer ${activeTab === 'funil' ? 'bg-[#fdfbf7] text-[#083d07] font-bold shadow-xs border border-[#d5af7a]' : 'text-[#5c4433] hover:text-[#083d07] hover:bg-[#d9cfc3]'}`}
            >
              <Filter size={12} className={activeTab === 'funil' ? 'text-stone-950' : 'text-[#745240]'} />
              Funil de Vendas
            </button>
          )}
          {hasPermission('ver_clientes') && (
            <button 
              onClick={() => setActiveTab("clientes")} 
              className={`w-full flex items-center gap-1.5 px-2 py-[3.5px] rounded font-medium transition-colors cursor-pointer ${activeTab === 'clientes' ? 'bg-[#fdfbf7] text-[#083d07] font-bold shadow-xs border border-[#d5af7a]' : 'text-[#5c4433] hover:text-[#083d07] hover:bg-[#d9cfc3]'}`}
            >
              <Users size={12} className={activeTab === 'clientes' ? 'text-stone-950' : 'text-[#745240]'} />
              Clientes
            </button>
          )}
          
          {(hasPermission('gerenciar_produtos') || hasPermission('gerenciar_categorias')) && (
            <div className="pt-1 mt-1 border-t border-[#d3c8bb] space-y-[2px]">
              <p className="px-2 text-[8px] font-mono font-bold text-[#8a6f5c] uppercase tracking-wider mb-0.5 leading-none">Cardápio</p>
              <button 
                onClick={() => setActiveTab("cardapio-digital")} 
                className={`w-full flex items-center gap-1.5 px-2 py-[3.5px] rounded font-medium transition-colors cursor-pointer ${activeTab === 'cardapio-digital' ? 'bg-[#fdfbf7] text-[#083d07] font-bold shadow-xs border border-[#d5af7a]' : 'text-[#5c4433] hover:text-[#083d07] hover:bg-[#d9cfc3]'}`}
              >
                <UtensilsCrossed size={12} className={activeTab === 'cardapio-digital' ? 'text-stone-950' : 'text-[#745240]'} />
                Cardápio Digital
              </button>
              {hasPermission('gerenciar_produtos') && (
                <button 
                  onClick={() => setActiveTab("gestao-cardapio")} 
                  className={`w-full flex items-center gap-1.5 px-2 py-[3.5px] rounded font-medium transition-colors cursor-pointer ${activeTab === 'gestao-cardapio' ? 'bg-[#fdfbf7] text-[#083d07] font-bold shadow-xs border border-[#d5af7a]' : 'text-[#5c4433] hover:text-[#083d07] hover:bg-[#d9cfc3]'}`}
                >
                  <Package size={12} className={activeTab === 'gestao-cardapio' ? 'text-stone-950' : 'text-[#745240]'} />
                  Produtos
                </button>
              )}
              {hasPermission('gerenciar_categorias') && (
                <button 
                  onClick={() => setActiveTab("categorias")} 
                  className={`w-full flex items-center gap-1.5 px-2 py-[3.5px] rounded font-medium transition-colors cursor-pointer ${activeTab === 'categorias' ? 'bg-[#fdfbf7] text-[#083d07] font-bold shadow-xs border border-[#d5af7a]' : 'text-[#5c4433] hover:text-[#083d07] hover:bg-[#d9cfc3]'}`}
                >
                  <FolderTree size={12} className={activeTab === 'categorias' ? 'text-stone-950' : 'text-[#745240]'} />
                  Categorias
                </button>
              )}
              <button 
                onClick={() => setActiveTab("banner-promocional")} 
                className={`w-full flex items-center gap-1.5 px-2 py-[3.5px] rounded font-medium transition-colors cursor-pointer ${activeTab === 'banner-promocional' ? 'bg-[#fdfbf7] text-[#083d07] font-bold shadow-xs border border-[#d5af7a]' : 'text-[#5c4433] hover:text-[#083d07] hover:bg-[#d9cfc3]'}`}
              >
                <Megaphone size={12} className={activeTab === 'banner-promocional' ? 'text-stone-950' : 'text-[#745240]'} />
                Banner Promocional
              </button>
            </div>
          )}

          {(hasPermission('gerenciar_configuracoes') || hasPermission('gerenciar_usuarios')) && (
            <div className="pt-1 mt-1 border-t border-[#d3c8bb] space-y-[2px]">
              <p className="px-2 text-[8px] font-mono font-bold text-[#8a6f5c] uppercase tracking-wider mb-0.5 leading-none">Sistema</p>
              {hasPermission('gerenciar_configuracoes') && (
                <button 
                  onClick={() => setActiveTab("configuracoes")} 
                  className={`w-full flex items-center gap-1.5 px-2 py-[3.5px] rounded font-medium transition-colors cursor-pointer ${activeTab === 'configuracoes' ? 'bg-[#fdfbf7] text-[#083d07] font-bold shadow-xs border border-[#d5af7a]' : 'text-[#745240] hover:text-[#083d07] hover:bg-[#d9cfc3]'}`}
                >
                  <Settings size={12} className={activeTab === 'configuracoes' ? 'text-stone-950' : 'text-[#8a6f5c]'} />
                  Configurações
                </button>
              )}
              {BILLING_ENABLED && (hasPermission('gerenciar_configuracoes') || isOwner) && (
                <button 
                  onClick={() => setActiveTab("cobranca")} 
                  className={`w-full flex items-center gap-1.5 px-2 py-[3.5px] rounded font-medium transition-colors cursor-pointer ${activeTab === 'cobranca' ? 'bg-[#fdfbf7] text-[#083d07] font-bold shadow-xs border border-[#d5af7a]' : 'text-[#745240] hover:text-[#083d07] hover:bg-[#d9cfc3]'}`}
                >
                  <CreditCard size={12} className={activeTab === 'cobranca' ? 'text-stone-950' : 'text-[#8a6f5c]'} />
                  Cobrança & Assinatura
                </button>
              )}
              {hasPermission('gerenciar_configuracoes') && (
                <button 
                  onClick={() => setActiveTab("agente-ia")} 
                  className={`w-full flex items-center gap-1.5 px-2 py-[3.5px] rounded font-medium transition-colors cursor-pointer ${activeTab === 'agente-ia' ? 'bg-[#fdfbf7] text-[#083d07] font-bold shadow-xs border border-[#d5af7a]' : 'text-[#745240] hover:text-[#083d07] hover:bg-[#d9cfc3]'}`}
                >
                  <BotMessageSquare size={12} className={activeTab === 'agente-ia' ? 'text-stone-950' : 'text-[#8a6f5c]'} />
                  Agente IA
                </button>
              )}
              {hasPermission('gerenciar_usuarios') && (
                <button 
                  onClick={() => setActiveTab("usuarios")} 
                  className={`w-full flex items-center gap-1.5 px-2 py-[3.5px] rounded font-medium transition-colors cursor-pointer ${activeTab === 'usuarios' ? 'bg-[#fdfbf7] text-[#083d07] font-bold shadow-xs border border-[#d5af7a]' : 'text-[#745240] hover:text-[#083d07] hover:bg-[#d9cfc3]'}`}
                >
                  <Shield size={12} className={activeTab === 'usuarios' ? 'text-stone-950' : 'text-[#8a6f5c]'} />
                  Usuários & Acesso
                </button>
              )}
            </div>
          )}
        </div>
        
        <div className="p-2 mt-auto border-t border-[#d3c8bb]">
          <button 
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-1.5 px-2 py-2 rounded font-bold text-rose-500 hover:text-rose-400 hover:bg-rose-950/40 transition-colors text-[11px] cursor-pointer"
          >
            <LogOut size={12} />
            Sair do Sistema
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className={`flex-1 min-w-0 px-4 md:px-8 min-h-[100dvh] relative overflow-y-auto ${
        ['despesas', 'motoboys', 'relatorios', 'caixa', 'funil', 'visao-geral', 'pedidos'].includes(activeTab) 
          ? 'pt-4 pb-4 flex flex-col' 
          : activeTab === 'agente-ia'
            ? 'pt-2 md:pt-3 pb-4'
            : 'pt-2 md:pt-4 pb-8'
      }`}>
        

        <div className={`max-w-7xl mx-auto w-full ${
          ['despesas', 'motoboys', 'relatorios', 'caixa', 'funil', 'visao-geral', 'pedidos'].includes(activeTab) 
            ? 'flex-1 flex flex-col min-h-0' 
            : activeTab === 'agente-ia'
              ? 'space-y-3'
              : 'space-y-4'
        }`}>


          {/* Header Section (Only for Non-Cockpit Views) */}
          {!['despesas', 'motoboys', 'relatorios', 'caixa', 'funil', 'visao-geral', 'pedidos', 'agente-ia'].includes(activeTab) && (
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-2.5 pb-2.5 border-b border-stone-200/80 mb-4">
              <div>
                <h1 className="text-xl font-bold tracking-tight text-stone-900">
                  {PAGE_TITLES[activeTab]?.title || 'Painel'}
                </h1>
                <p className="text-xs text-stone-500 font-mono mt-0.5">
                  {PAGE_TITLES[activeTab]?.subtitle || ''}
                </p>
              </div>
              
              <div className="flex items-center gap-2 self-end md:self-auto">
                {adminLogoUrl && (
                  <>
                    <img src={adminLogoUrl} alt="Logo do restaurante" className="h-7 object-contain" />
                    <div className="w-px h-5 bg-stone-200" />
                  </>
                )}
                <button 
                  onClick={handleLogout} 
                  className="h-8 px-2.5 rounded-lg border border-stone-200 bg-white text-stone-600 hover:text-rose-600 hover:bg-rose-50 hover:border-rose-200 transition-colors cursor-pointer text-xs font-semibold flex items-center gap-1.5 shadow-2xs"
                  title="Sair do Sistema"
                >
                  <LogOut size={13} />
                  <span className="hidden sm:inline text-[11px]">Sair</span>
                </button>
              </div>
            </div>
          )}

        {autoPrint && (
          <div className="bg-blue-50 border border-blue-200 text-blue-800 rounded-xl p-4 text-sm flex items-start gap-3">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold mb-1">Impressão Automática Ativada!</p>
              <p>O sistema verificará novos pedidos a cada 15 segundos e enviará para a impressora. Para que a impressão ocorra de forma invisível (sem abrir janela de confirmação), inicie o Google Chrome com o atalho <b>--kiosk-printing</b> apontando para a sua impressora padrão (térmica 80mm).</p>
            </div>
          </div>
        )}
        
        
        {activeTab === "usuarios" && hasPermission('gerenciar_usuarios') && (
          <div className="mt-1">
            <UsersManager />
          </div>
        )}

        {activeTab === "categorias" && hasPermission('gerenciar_categorias') && (
          <div className="mt-1">
            <CategoryManager />
          </div>
        )}

        {activeTab === "clientes" && hasPermission('ver_clientes') && (
          <div className="mt-1">
            <CustomersManager />
          </div>
        )}

        {/* FUNIL DE VENDAS */}
        {activeTab === "funil" && (
          <div className="mt-1">
            <SalesFunnelManager onNavigateToTab={(t) => setActiveTab(t)} />
          </div>
        )}

        {/* DESPESAS */}
        {activeTab === "despesas" && hasPermission('gerenciar_caixa') && (
          <div className="mt-1">
            <ExpensesManager 
              expenses={expenses}
              onExpenseChange={fetchDashboardData}
            />
          </div>
        )}

        {/* MOTOBOYS */}
        {activeTab === "motoboys" && hasPermission('gerenciar_caixa') && (
          <div className="mt-1">
            <MotoboysManager onChange={() => fetchDashboardData(true)} />
          </div>
        )}

        {activeTab === "caixa" && hasPermission('gerenciar_caixa') && (
          <div className="mt-1">
            <CaixaManager />
          </div>
        )}

        
        {activeTab === "configuracoes" && hasPermission('gerenciar_configuracoes') && (
          <div className="mt-1">
            <SettingsManager 
              onTestPrint={handlePrintOrder}
              autoPrint={autoPrint}
              onToggleAutoPrint={toggleAutoPrint}
              onExportCSV={handleExportCSV}
              onChangePassword={() => setIsPasswordModalOpen(true)}
              soundEnabled={soundEnabled}
              onToggleSound={toggleSound}
              onTestSound={playNotificationSound}
            />
          </div>
        )}

        {BILLING_ENABLED && activeTab === "cobranca" && (
          <div className="mt-1">
            <BillingManager />
          </div>
        )}

        {activeTab === "gestao-cardapio" && hasPermission('gerenciar_produtos') && (
          <div className="mt-1">
             <MenuManager />
          </div>
        )}

        {activeTab === "banner-promocional" && (
          <div className="mt-1">
            <BannerManager />
          </div>
        )}
  
        {/* Agente IA Tab */}
        {activeTab === "agente-ia" && hasPermission('gerenciar_configuracoes') && (
          <div className="mt-1">
            <AgentManager />
          </div>
        )}

        {/* Visão Geral Tab */}
        {activeTab === "visao-geral" && (
          <div className="space-y-3 mt-1 sm:mt-2">

            {/* Filtro de Período - Visão Geral */}
            <div className="flex items-center justify-between bg-white rounded-xl border border-stone-200 px-3 py-2 shadow-2xs gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                <span className="text-[11px] font-mono font-bold text-stone-700 uppercase tracking-wider">
                  Visão Geral
                </span>
              </div>
              <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
                {/* Toggle cockpit / grade */}
                <div className="flex items-center bg-stone-100 rounded-lg p-0.5 border border-stone-200">
                  <button
                    onClick={() => setOverviewViewMode('cockpit')}
                    title="Modo Cockpit"
                    className={`h-6 px-2 rounded-md text-[10px] font-mono font-bold transition-all cursor-pointer flex items-center gap-1 ${
                      overviewViewMode === 'cockpit' ? 'bg-[#E8D8D1] text-[#083D07] shadow-xs border border-[#D5AF7A] font-bold' : 'text-stone-500 hover:text-stone-800'
                    }`}
                  >
                    <Layers size={10} />
                    Cockpit
                  </button>
                  <button
                    onClick={() => setOverviewViewMode('grid')}
                    title="Modo Grade"
                    className={`h-6 px-2 rounded-md text-[10px] font-mono font-bold transition-all cursor-pointer flex items-center gap-1 ${
                      overviewViewMode === 'grid' ? 'bg-[#E8D8D1] text-[#083D07] shadow-xs border border-[#D5AF7A] font-bold' : 'text-stone-500 hover:text-stone-800'
                    }`}
                  >
                    <BarChart3 size={10} />
                    Grade
                  </button>
                </div>
                <PeriodFilterCompact
                  value={dateFilter as any}
                  startDate={customStartDate}
                  endDate={customEndDate}
                  onChange={(res) => {
                    setDateFilter(res.period);
                    dateFilterRef.current = res.period;
                    if (res.startDate) {
                      setCustomStartDate(res.startDate);
                      customStartDateRef.current = res.startDate;
                    }
                    if (res.endDate) {
                      setCustomEndDate(res.endDate);
                      customEndDateRef.current = res.endDate;
                    }
                    fetchDashboardData(false, res.period);
                  }}
                  align="right"
                />
                <button
                  onClick={() => fetchDashboardData()}
                  className="h-7 px-2 rounded-lg border border-stone-200 bg-white text-stone-600 hover:text-stone-950 hover:bg-stone-50 transition-colors cursor-pointer shadow-2xs flex items-center gap-1 text-[11px] font-mono font-medium"
                  title="Atualizar dados"
                >
                  <RefreshCw size={11} className={isLoading ? 'animate-spin text-rose-600' : 'text-stone-400'} />
                  Atualizar
                </button>
              </div>
            </div>

            {/* KPIs Grid - Compacto em 1 linha */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
              <KpiCard
                title="Faturamento Bruto"
                value={`R$ ${faturamentoBruto.toFixed(2)}`}
                icon={<DollarSign size={13} strokeWidth={1.5} className="text-emerald-600" />}
                trend={(dashboardData?.revenueChangePercent ?? 0) >= 0 ? `+${(dashboardData?.revenueChangePercent ?? 0).toFixed(1)}%` : `${(dashboardData?.revenueChangePercent ?? 0).toFixed(1)}%`}
                trendUp={(dashboardData?.revenueChangePercent ?? 0) >= 0}
                description="vs período anterior"
                sparklineData={chartData?.orderVolumeData?.map((d: any) => d.revenue) || []}
                sparklineColor="#15803D"
              />
              <KpiCard
                title="Ticket Médio"
                value={`R$ ${ticketMedio.toFixed(2)}`}
                icon={<CreditCard size={13} strokeWidth={1.5} className="text-stone-700" />}
                trend="+0%"
                trendUp={true}
                description="Hoje"
                sparklineData={chartData?.orderVolumeData?.map((d: any) => d.orders) || []}
                sparklineColor="#1D4ED8"
              />
              <KpiCard
                title="Total de Pedidos"
                value={totalPedidos.toString()}
                icon={<ShoppingBag size={13} strokeWidth={1.5} className="text-purple-600" />}
                trend={(dashboardData?.ordersChangePercent ?? 0) >= 0 ? `+${(dashboardData?.ordersChangePercent ?? 0).toFixed(1)}%` : `${(dashboardData?.ordersChangePercent ?? 0).toFixed(1)}%`}
                trendUp={(dashboardData?.ordersChangePercent ?? 0) >= 0}
                description="vs período anterior"
                sparklineData={chartData?.orderVolumeData?.map((d: any) => d.orders) || []}
                sparklineColor="#7C3AED"
              />
              <KpiCard
                title="Novos Clientes"
                value={uniqueCustomers.toString()}
                icon={<Users size={13} strokeWidth={1.5} className="text-orange-600" />}
                trend="0%"
                trendUp={true}
                description="No período"
                sparklineData={chartData?.orderVolumeData?.map((d: any) => d.orders) || []}
                sparklineColor="#B45309"
              />
            </div>

            {/* MODO COCKPIT (PRIMEIRO PLANO - SEM SCROLL) */}
            {overviewViewMode === 'cockpit' ? (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 items-stretch">
                {/* Coluna Principal: Gráfico Interativo com Dropdown de Métricas */}
                <div className="lg:col-span-2 bg-white p-3.5 sm:p-4 rounded-xl border border-stone-200 shadow-2xs flex flex-col justify-between">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2 pb-2 border-b border-stone-100">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-md bg-[#083d07]/20 border border-[#d5af7a] flex items-center justify-center text-stone-900 shrink-0">
                        <Activity size={14} className="text-stone-900" />
                      </div>
                      <div>
                        <h2 className="text-xs sm:text-sm font-bold text-stone-900 leading-tight">
                          {overviewChartTab === 'faturamento' && 'Faturamento por Dia'}
                          {overviewChartTab === 'categorias' && 'Vendas por Categoria'}
                          {overviewChartTab === 'produtos' && 'Top 5 Produtos Mais Vendidos'}
                          {overviewChartTab === 'pagamentos' && 'Distribuição por Método de Pagamento'}
                        </h2>
                        <p className="text-[10px] text-stone-500 font-mono">
                          {overviewChartTab === 'faturamento' && 'Vendas diárias da semana (Segunda a Domingo)'}
                          {overviewChartTab === 'categorias' && 'Distribuição de receita por linha de produtos'}
                          {overviewChartTab === 'produtos' && 'Ranking dos itens com maior saída'}
                          {overviewChartTab === 'pagamentos' && 'Valores totais agrupados por forma de pagamento'}
                        </p>
                      </div>
                    </div>

                    {/* Seletor Compacto do Gráfico */}
                    <div className="relative shrink-0" ref={overviewChartDropdownRef}>
                      <button
                        type="button"
                        onClick={() => setIsOverviewChartDropdownOpen(!isOverviewChartDropdownOpen)}
                        className="h-8 px-3 bg-white border border-stone-200 hover:border-stone-300 rounded-full text-xs font-semibold text-stone-800 flex items-center gap-2 shadow-2xs transition-all cursor-pointer select-none active:scale-[0.98]"
                      >
                        <span className="text-xs shrink-0">
                          {overviewChartTab === 'faturamento' && '📈'}
                          {overviewChartTab === 'categorias' && '🏷️'}
                          {overviewChartTab === 'produtos' && '🏆'}
                          {overviewChartTab === 'pagamentos' && '💳'}
                        </span>
                        <span className="font-sans text-xs font-bold text-stone-900 truncate">
                          {overviewChartTab === 'faturamento' && 'Faturamento por Dia'}
                          {overviewChartTab === 'categorias' && 'Vendas por Categoria'}
                          {overviewChartTab === 'produtos' && 'Top 5 Produtos'}
                          {overviewChartTab === 'pagamentos' && 'Formas de Pagamento'}
                        </span>
                        <ChevronDown size={14} className={`text-stone-400 transition-transform duration-200 shrink-0 ${isOverviewChartDropdownOpen ? 'rotate-180' : ''}`} />
                      </button>

                      {isOverviewChartDropdownOpen && (
                        <div className="absolute right-0 mt-1.5 w-60 bg-white rounded-xl border border-stone-200 shadow-xl z-50 p-1 space-y-0.5 animate-in fade-in zoom-in-95 duration-150">
                          <div className="px-2.5 py-1 text-[10px] font-mono font-bold text-stone-400 uppercase tracking-wider border-b border-stone-100 mb-0.5">
                            Métricas do Gráfico
                          </div>
                          <button
                            type="button"
                            onClick={() => { setOverviewChartTab('faturamento'); setIsOverviewChartDropdownOpen(false); }}
                            className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all text-left cursor-pointer ${overviewChartTab === 'faturamento' ? 'bg-[#083d07] text-[#fdfbf7] font-bold border border-[#d5af7a]/60' : 'text-stone-600 hover:bg-stone-50 hover:text-stone-900'}`}
                          >
                            <div className="flex items-center gap-2">
                              <span>📈</span>
                              <span>Faturamento por Dia</span>
                            </div>
                            {overviewChartTab === 'faturamento' && <Check size={14} className="text-stone-950 stroke-[2.5]" />}
                          </button>

                          <button
                            type="button"
                            onClick={() => { setOverviewChartTab('categorias'); setIsOverviewChartDropdownOpen(false); }}
                            className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all text-left cursor-pointer ${overviewChartTab === 'categorias' ? 'bg-[#083d07] text-[#fdfbf7] font-bold border border-[#d5af7a]/60' : 'text-stone-600 hover:bg-stone-50 hover:text-stone-900'}`}
                          >
                            <div className="flex items-center gap-2">
                              <span>🏷️</span>
                              <span>Vendas por Categoria</span>
                            </div>
                            {overviewChartTab === 'categorias' && <Check size={14} className="text-stone-950 stroke-[2.5]" />}
                          </button>

                          <button
                            type="button"
                            onClick={() => { setOverviewChartTab('produtos'); setIsOverviewChartDropdownOpen(false); }}
                            className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all text-left cursor-pointer ${overviewChartTab === 'produtos' ? 'bg-[#083d07] text-[#fdfbf7] font-bold border border-[#d5af7a]/60' : 'text-stone-600 hover:bg-stone-50 hover:text-stone-900'}`}
                          >
                            <div className="flex items-center gap-2">
                              <span>🏆</span>
                              <span>Top 5 Produtos</span>
                            </div>
                            {overviewChartTab === 'produtos' && <Check size={14} className="text-stone-950 stroke-[2.5]" />}
                          </button>

                          <button
                            type="button"
                            onClick={() => { setOverviewChartTab('pagamentos'); setIsOverviewChartDropdownOpen(false); }}
                            className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all text-left cursor-pointer ${overviewChartTab === 'pagamentos' ? 'bg-[#083d07] text-[#fdfbf7] font-bold border border-[#d5af7a]/60' : 'text-stone-600 hover:bg-stone-50 hover:text-stone-900'}`}
                          >
                            <div className="flex items-center gap-2">
                              <span>💳</span>
                              <span>Formas de Pagamento</span>
                            </div>
                            {overviewChartTab === 'pagamentos' && <Check size={14} className="text-stone-950 stroke-[2.5]" />}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Área do Gráfico Calibrada para Primeiro Plano (sem scroll) */}
                  <div className="h-[210px] sm:h-[230px] w-full pt-1">
                    {overviewChartTab === 'faturamento' && (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={salesData}
                          margin={{ top: 8, right: 8, left: -20, bottom: 0 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f1f4" />
                          <XAxis 
                            dataKey="name" 
                            axisLine={false} 
                            tickLine={false} 
                            tick={{ fill: '#71717a', fontSize: 10, fontWeight: 600, fontFamily: 'ui-monospace, monospace' }} 
                            dy={5}
                          />
                          <YAxis 
                            axisLine={false} 
                            tickLine={false} 
                            tick={{ fill: '#71717a', fontSize: 10, fontWeight: 600, fontFamily: 'ui-monospace, monospace' }}
                            tickFormatter={(value) => `R$ ${value}`}
                          />
                          <Tooltip
                            contentStyle={{ backgroundColor: '#18181b', color: '#ffffff', borderRadius: '8px', border: '1px solid #27272a', boxShadow: '0 4px 12px rgb(0 0 0 / 0.15)', fontFamily: 'ui-monospace, monospace', fontSize: '11px' }}
                            itemStyle={{ color: '#ffffff', fontWeight: 700 }}
                            labelStyle={{ color: '#a1a1aa', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase' }}
                            labelFormatter={(_label, payload) => payload?.[0]?.payload?.fullName || _label}
                            formatter={(value: any, _name: any, item: any) => [
                              `R$ ${Number(value).toFixed(2)}${item?.payload?.orders !== undefined ? ` (${item.payload.orders} pedidos)` : ''}`,
                              'Vendas do Dia'
                            ]}
                            cursor={{fill: 'rgba(24, 24, 27, 0.04)'}}
                          />
                          <Bar
                            dataKey="revenue"
                            fill="#18181b"
                            radius={[4, 4, 0, 0]}
                            barSize={26}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    )}

                    {overviewChartTab === 'categorias' && (() => {
                      const categories = dashboardData?.chartData?.salesByCategory || [];
                      if (categories.length === 0) {
                        return (
                          <div className="h-full flex items-center justify-center text-stone-400 text-xs font-mono">
                            Nenhum dado de categoria ainda
                          </div>
                        );
                      }
                      const maxValue = Math.max(...categories.map((c: any) => c.value || 1), 1);
                      return (
                        <div className="h-full flex flex-col justify-between py-1 px-1">
                          {categories.slice(0, 5).map((cat: any, index: number) => {
                            const pct = Math.min(100, Math.max(6, (cat.value / maxValue) * 100));
                            const color = CHART_COLORS[index % CHART_COLORS.length];
                            return (
                              <div key={`overview-cat-${index}`} className="flex flex-col gap-1">
                                <div className="flex items-center justify-between gap-2 text-xs">
                                  <div className="flex items-center gap-2 min-w-0">
                                    <span
                                      className="w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-mono font-bold text-white shrink-0"
                                      style={{ backgroundColor: color }}
                                    >
                                      {index + 1}
                                    </span>
                                    <span className="text-stone-800 font-bold text-[11px] sm:text-xs leading-snug">
                                      {cat.name}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2 shrink-0 font-mono text-[10px] sm:text-[11px]">
                                    {cat.qty !== undefined && cat.qty > 0 && (
                                      <span className="font-bold text-stone-900 tabular-nums">{cat.qty} un.</span>
                                    )}
                                    <span className="text-stone-500 font-bold tabular-nums">R$ {(cat.value || 0).toFixed(2)}</span>
                                  </div>
                                </div>
                                <div className="w-full bg-stone-100 rounded-full h-2 overflow-hidden">
                                  <div
                                    className="h-full rounded-full transition-all duration-500"
                                    style={{ width: `${pct}%`, backgroundColor: color }}
                                  />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })()}

                    {overviewChartTab === 'produtos' && (() => {
                      const items = dashboardData?.popularItems || [];
                      if (items.length === 0) {
                        return (
                          <div className="h-full flex items-center justify-center text-stone-400 text-xs font-mono">
                            Nenhum dado de produto ainda
                          </div>
                        );
                      }
                      const maxQty = Math.max(...items.map((i: any) => i.qty || 1), 1);
                      return (
                        <div className="h-full flex flex-col justify-between py-1 px-1">
                          {items.slice(0, 5).map((item: any, index: number) => {
                            const pct = Math.min(100, Math.max(6, (item.qty / maxQty) * 100));
                            const color = CHART_COLORS[index % CHART_COLORS.length];
                            return (
                              <div key={`overview-item-${index}`} className="flex flex-col gap-1">
                                <div className="flex items-center justify-between gap-2 text-xs">
                                  <div className="flex items-center gap-2 min-w-0">
                                    <span
                                      className="w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-mono font-bold text-white shrink-0"
                                      style={{ backgroundColor: color }}
                                    >
                                      {index + 1}
                                    </span>
                                    <span className="text-stone-800 font-medium text-[11px] sm:text-xs leading-snug">
                                      {formatItemNameForPrint({ name: item.name })}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2 shrink-0 font-mono text-[10px] sm:text-[11px]">
                                    <span className="font-bold text-stone-900 tabular-nums">{item.qty} un.</span>
                                    <span className="text-stone-400 font-medium tabular-nums">R$ {(item.revenue || 0).toFixed(2)}</span>
                                  </div>
                                </div>
                                <div className="w-full bg-stone-100 rounded-full h-2 overflow-hidden">
                                  <div
                                    className="h-full rounded-full transition-all duration-500"
                                    style={{ width: `${pct}%`, backgroundColor: color }}
                                  />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })()}

                    {overviewChartTab === 'pagamentos' && (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={paymentMethodsData} margin={{ top: 12, right: 20, left: -5, bottom: 4 }} layout="vertical">
                          <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f1f4" />
                          <XAxis type="number" hide />
                          <YAxis dataKey="name" type="category" width={85} tick={{ fontSize: 11, fontWeight: 700, fill: '#3f3f46', fontFamily: 'ui-monospace, monospace' }} axisLine={false} tickLine={false} />
                          <Tooltip
                            contentStyle={{ backgroundColor: '#18181b', color: '#ffffff', borderRadius: '8px', border: '1px solid #27272a', fontFamily: 'ui-monospace, monospace', fontSize: '11px' }}
                            itemStyle={{ color: '#ffffff', fontWeight: 700 }}
                            formatter={(value: any, _name: any, item: any) => [
                              `R$ ${(Number(value) || 0).toFixed(2)}${item?.payload?.count !== undefined ? ` (${item.payload.count} pedidos)` : ''}`,
                              'Total'
                            ]}
                            cursor={{fill: 'rgba(24, 24, 27, 0.04)'}}
                          />
                          <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={26}>
                            {paymentMethodsData.map((entry: any, index: number) => (
                              <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                </div>

                {/* Coluna Lateral: Resumo Compacto de Categorias e Pizzas Favoritas */}
                <div className="space-y-3 flex flex-col justify-between">
                  {/* Top Categorias */}
                  <div className="bg-white p-3 rounded-xl border border-stone-200 shadow-2xs flex-1 flex flex-col justify-between">
                    <div className="flex justify-between items-center mb-1.5 pb-1 border-b border-stone-100">
                      <div>
                        <h2 className="text-xs font-bold text-stone-900 leading-tight">Categorias em Destaque</h2>
                        <p className="text-[10px] text-stone-500 font-mono">Mais vendidas</p>
                      </div>
                      <div className="w-5 h-5 rounded-md bg-stone-50 border border-stone-200 flex items-center justify-center text-stone-600">
                        <TrendingUp size={12} />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      {(!(dashboardData?.chartData?.salesByCategory || [])?.length) ? (
                        <div className="text-center text-stone-400 font-mono text-[11px] py-2">Sem dados.</div>
                      ) : (
                        [...(dashboardData?.chartData?.salesByCategory || [])]
                          .sort((a, b) => (Number(b.value) || 0) - (Number(a.value) || 0))
                          .slice(0, 3)
                          .map((cat: any, idx: number) => (
                            <div key={idx} className="flex justify-between items-center gap-2 text-xs">
                              <span className="font-mono text-stone-600 capitalize leading-snug">{String(cat.name || '').replace('-', ' ')}</span>
                              <span className="font-mono font-bold tabular-nums text-stone-900 shrink-0">R$ {(Number(cat.value) || 0).toFixed(2)}</span>
                            </div>
                          ))
                      )}
                    </div>
                  </div>

                  {/* Top Pizzas */}
                  <div className="bg-white p-3 rounded-xl border border-stone-200 shadow-2xs flex-1 flex flex-col justify-between">
                    <div className="flex justify-between items-center mb-1.5 pb-1 border-b border-stone-100">
                      <div>
                        <h2 className="text-xs font-bold text-stone-900 leading-tight">Pizzas Favoritas</h2>
                        <p className="text-[10px] text-stone-500 font-mono">Mais escolhidas</p>
                      </div>
                      <div className="w-5 h-5 rounded-md bg-stone-50 border border-stone-200 flex items-center justify-center text-stone-600">
                        <Pizza size={12} />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      {(!(dashboardData?.popularPizzas || [])?.length) ? (
                        <div className="text-center text-stone-400 font-mono text-[11px] py-2">Nenhuma pizza ainda.</div>
                      ) : (
                        (dashboardData?.popularPizzas || []).slice(0, 3).map((product: any, index: number) => (
                          <div key={index} className="flex items-center justify-between gap-2 text-xs">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <span className="w-4 h-4 rounded bg-stone-100 flex items-center justify-center text-[9px] font-mono font-bold text-stone-600 shrink-0">
                                {index + 1}
                              </span>
                              <span className="font-semibold text-stone-900 leading-snug" title={product.name}>
                                {formatItemNameForPrint({ name: product.name })}
                              </span>
                            </div>
                            <span className="font-mono font-bold tabular-nums text-stone-900 shrink-0">
                              R$ {(Number(product.revenue) || 0).toFixed(2)}
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              /* MODO GRADE COMPLETA (TODOS OS GRÁFICOS EXPANDIDOS) */
              <div className="space-y-4">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  <div className="lg:col-span-2 bg-white p-4 rounded-xl border border-stone-200 shadow-2xs">
                    <div className="flex justify-between items-center mb-3">
                      <div>
                        <h2 className="text-sm font-bold text-stone-900">Faturamento por Dia</h2>
                        <p className="text-[11px] text-stone-500 font-mono">Vendas diárias da semana (Segunda a Domingo)</p>
                      </div>
                      <div className="p-1.5 bg-stone-50 rounded border border-stone-200">
                        <Activity size={16} className="text-stone-600" />
                      </div>
                    </div>
                    <div className="h-[250px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={salesData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e4e4e7" />
                          <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#71717a', fontSize: 11, fontWeight: 600, fontFamily: 'ui-monospace, monospace' }} dy={10} />
                          <YAxis axisLine={false} tickLine={false} tick={{ fill: '#71717a', fontSize: 11, fontWeight: 600, fontFamily: 'ui-monospace, monospace' }} tickFormatter={(value) => `R$ ${value}`} />
                          <Tooltip
                            contentStyle={{ backgroundColor: '#18181b', color: '#ffffff', borderRadius: '8px', border: '1px solid #27272a', fontFamily: 'ui-monospace, monospace', fontSize: '11px' }}
                            itemStyle={{ color: '#ffffff', fontWeight: 700 }}
                            labelStyle={{ color: '#a1a1aa', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase' }}
                            labelFormatter={(_label, payload) => payload?.[0]?.payload?.fullName || _label}
                            formatter={(value: any, _name: any, item: any) => [
                              `R$ ${Number(value).toFixed(2)}${item?.payload?.orders !== undefined ? ` (${item.payload.orders} pedidos)` : ''}`,
                              'Vendas do Dia'
                            ]}
                            cursor={{fill: 'rgba(24, 24, 27, 0.04)'}}
                          />
                          <Bar dataKey="revenue" fill="#18181b" radius={[4, 4, 0, 0]} barSize={28} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-2xs">
                      <div className="flex justify-between items-center mb-3">
                        <div>
                          <h2 className="text-sm font-bold text-stone-900">Categorias em Destaque</h2>
                          <p className="text-[11px] text-stone-500 font-mono">Mais vendidas</p>
                        </div>
                        <div className="p-1.5 bg-stone-50 rounded border border-stone-200">
                          <TrendingUp size={16} className="text-stone-600" />
                        </div>
                      </div>
                      <div className="space-y-2">
                        {(!(dashboardData?.chartData?.salesByCategory || [])?.length) ? (
                          <div className="text-center text-stone-500 font-mono text-xs py-2">Sem dados.</div>
                        ) : (
                          [...(dashboardData?.chartData?.salesByCategory || [])].sort((a, b) => (Number(b.value) || 0) - (Number(a.value) || 0)).slice(0, 3).map((cat: any, idx: number) => (
                            <div key={idx} className="flex justify-between items-center gap-2">
                              <span className="text-xs font-mono text-stone-600 capitalize leading-snug">{String(cat.name || '').replace('-', ' ')}</span>
                              <span className="text-xs font-mono font-bold tabular-nums text-stone-900 shrink-0">R$ {(Number(cat.value) || 0).toFixed(2)}</span>
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                    <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-2xs">
                      <div className="flex justify-between items-center mb-3">
                        <div>
                          <h2 className="text-sm font-bold text-stone-900">Pizzas Favoritas</h2>
                          <p className="text-[11px] text-stone-500 font-mono">Mais escolhidas</p>
                        </div>
                        <div className="p-1.5 bg-stone-50 rounded border border-stone-200">
                          <Pizza size={16} className="text-stone-600" />
                        </div>
                      </div>
                      <div className="space-y-2">
                        {(!(dashboardData?.popularPizzas || [])?.length) ? (
                          <div className="text-center text-stone-500 font-mono text-xs py-2">Nenhuma pizza registrada.</div>
                        ) : (
                          (dashboardData?.popularPizzas || []).slice(0, 3).map((product: any, index: number) => (
                            <div key={index} className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2 min-w-0">
                                <span className="w-5 h-5 rounded bg-stone-100 flex items-center justify-center text-[10px] font-mono font-bold text-stone-600 border border-stone-200 shrink-0">{index + 1}</span>
                                <span className="text-xs font-semibold text-stone-900 leading-snug" title={product.name}>{formatItemNameForPrint({ name: product.name })}</span>
                              </div>
                              <span className="text-xs font-mono font-bold tabular-nums text-stone-900 shrink-0">R$ {(Number(product.revenue) || 0).toFixed(2)}</span>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-2xs">
                    <div className="flex justify-between items-center mb-3">
                      <div>
                        <h2 className="text-sm font-bold text-stone-900">Vendas por Categoria</h2>
                        <p className="text-[11px] text-stone-500 font-mono">Distribuição por receita</p>
                      </div>
                    </div>
                    <div className="h-[220px] w-full">
                      {(() => {
                        const categories = dashboardData?.chartData?.salesByCategory || [];
                        if (categories.length === 0) {
                          return (
                            <div className="h-full flex items-center justify-center text-stone-400 text-xs font-mono">
                              Nenhum dado de categoria ainda
                            </div>
                          );
                        }
                        const maxValue = Math.max(...categories.map((c: any) => c.value || 1), 1);
                        return (
                          <div className="h-full flex flex-col justify-between py-1 px-1">
                            {categories.slice(0, 5).map((cat: any, index: number) => {
                              const pct = Math.min(100, Math.max(6, (cat.value / maxValue) * 100));
                              const color = CHART_COLORS[index % CHART_COLORS.length];
                              return (
                                <div key={`exp-cat-${index}`} className="flex flex-col gap-1">
                                  <div className="flex items-center justify-between gap-2 text-xs">
                                    <div className="flex items-center gap-2 min-w-0">
                                      <span
                                        className="w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-mono font-bold text-white shrink-0"
                                        style={{ backgroundColor: color }}
                                      >
                                        {index + 1}
                                      </span>
                                      <span className="text-stone-800 font-bold text-[11px] sm:text-xs leading-snug">
                                        {cat.name}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0 font-mono text-[10px] sm:text-[11px]">
                                      {cat.qty !== undefined && cat.qty > 0 && (
                                        <span className="font-bold text-stone-900 tabular-nums">{cat.qty} un.</span>
                                      )}
                                      <span className="text-stone-500 font-bold tabular-nums">R$ {(cat.value || 0).toFixed(2)}</span>
                                    </div>
                                  </div>
                                  <div className="w-full bg-stone-100 rounded-full h-2 overflow-hidden">
                                    <div
                                      className="h-full rounded-full transition-all duration-500"
                                      style={{ width: `${pct}%`, backgroundColor: color }}
                                    />
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        );
                      })()}
                    </div>
                  </div>

                  <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-2xs">
                    <div className="flex justify-between items-center mb-3">
                      <div>
                        <h2 className="text-sm font-bold text-stone-900">Top 5 Produtos</h2>
                        <p className="text-[11px] text-stone-500 font-mono">Por volume de vendas</p>
                      </div>
                    </div>
                    <div className="h-[220px] w-full">
                      {(() => {
                        const items = dashboardData?.popularItems || [];
                        if (items.length === 0) {
                          return (
                            <div className="h-full flex items-center justify-center text-stone-400 text-xs font-mono">
                              Nenhum dado de produto ainda
                            </div>
                          );
                        }
                        const maxQty = Math.max(...items.map((i: any) => i.qty || 1), 1);
                        return (
                          <div className="h-full flex flex-col justify-between py-1 px-1">
                            {items.slice(0, 5).map((item: any, index: number) => {
                              const pct = Math.min(100, Math.max(6, (item.qty / maxQty) * 100));
                              const color = CHART_COLORS[index % CHART_COLORS.length];
                              return (
                                <div key={`exp-item-${index}`} className="flex flex-col gap-1">
                                  <div className="flex items-center justify-between gap-2 text-xs">
                                    <div className="flex items-center gap-2 min-w-0">
                                      <span
                                        className="w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-mono font-bold text-white shrink-0"
                                        style={{ backgroundColor: color }}
                                      >
                                        {index + 1}
                                      </span>
                                      <span className="text-stone-800 font-medium text-[11px] sm:text-xs leading-snug">
                                        {formatItemNameForPrint({ name: item.name })}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0 font-mono text-[10px] sm:text-[11px]">
                                      <span className="font-bold text-stone-900 tabular-nums">{item.qty} un.</span>
                                      <span className="text-stone-400 font-medium tabular-nums">R$ {(item.revenue || 0).toFixed(2)}</span>
                                    </div>
                                  </div>
                                  <div className="w-full bg-stone-100 rounded-full h-2 overflow-hidden">
                                    <div
                                      className="h-full rounded-full transition-all duration-500"
                                      style={{ width: `${pct}%`, backgroundColor: color }}
                                    />
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        );
                      })()}
                    </div>
                  </div>

                  <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-2xs">
                    <div className="flex justify-between items-center mb-3">
                      <div>
                        <h2 className="text-sm font-bold text-stone-900">Formas de Pagamento</h2>
                        <p className="text-[11px] text-stone-500 font-mono">Distribuição por método</p>
                      </div>
                    </div>
                    <div className="h-[220px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={paymentMethodsData} margin={{ top: 12, right: 20, left: -5, bottom: 4 }} layout="vertical">
                          <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#e4e4e7" />
                          <XAxis type="number" hide />
                          <YAxis dataKey="name" type="category" width={85} tick={{ fontSize: 11, fontWeight: 700, fill: '#3f3f46', fontFamily: 'ui-monospace, monospace' }} axisLine={false} tickLine={false} />
                          <Tooltip
                            contentStyle={{ backgroundColor: '#18181b', color: '#ffffff', borderRadius: '8px', border: '1px solid #27272a', fontFamily: 'ui-monospace, monospace', fontSize: '11px' }}
                            itemStyle={{ color: '#ffffff', fontWeight: 700 }}
                            formatter={(value: any, _name: any, item: any) => [
                              `R$ ${(Number(value) || 0).toFixed(2)}${item?.payload?.count !== undefined ? ` (${item.payload.count} pedidos)` : ''}`,
                              'Total'
                            ]}
                            cursor={{fill: 'rgba(24, 24, 27, 0.04)'}}
                          />
                          <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={26}>
                            {paymentMethodsData.map((entry: any, index: number) => (
                              <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Pedidos Tab */}
        {activeTab === "pedidos" && (
          <div className="mt-1 space-y-3">
            {(() => {
              const allRecent = dashboardData?.recentOrders || [];
              const searchLower = ordersSearchTerm.toLowerCase().trim();

              const filteredList = allRecent.filter((o: any) => {
                if (ordersStatusFilter !== 'todos' && o.status !== ordersStatusFilter) {
                  return false;
                }
                if (searchLower) {
                  const idMatch = o.id?.toString().includes(searchLower);
                  const nameMatch = (o.customerName || '').toLowerCase().includes(searchLower);
                  const phoneMatch = (o.customerPhone || '').toLowerCase().includes(searchLower);
                  const addrMatch = (o.deliveryAddress || '').toLowerCase().includes(searchLower);
                  const nifMatch = (o.nif || '').toLowerCase().includes(searchLower);
                  const notesMatch = (o.notes || '').toLowerCase().includes(searchLower);
                  return idMatch || nameMatch || phoneMatch || addrMatch || nifMatch || notesMatch;
                }
                return true;
              });

              const countAll = allRecent.length;
              const countPendente = allRecent.filter((o: any) => o.status === 'Pendente').length;
              const countPreparo = allRecent.filter((o: any) => o.status === 'Em Preparo').length;
              const countEntrega = allRecent.filter((o: any) => o.status === 'Saiu para Entrega').length;
              const countFinalizado = allRecent.filter((o: any) => o.status === 'Finalizado').length;
              const countCancelado = allRecent.filter((o: any) => o.status === 'Cancelado').length;
              const countAtivos = countPendente + countPreparo + countEntrega;

              return (
                <div className="bg-white p-4 sm:p-5 rounded-xl border border-stone-200 shadow-2xs space-y-4">
                  {/* Topo do Gestor: Título, Modo de Visão e Botão PDV */}
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-3 border-b border-stone-100">
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-base font-black text-stone-900 tracking-tight">Gestor de Pedidos</h2>
                        {countAtivos > 0 ? (
                          <span className="px-2 py-0.5 rounded-full text-[11px] font-mono font-bold bg-amber-100 text-amber-900 border border-amber-300 animate-pulse">
                            {countAtivos} em andamento
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[11px] font-mono font-medium bg-stone-100 text-stone-600 border border-stone-200">
                            Cozinha em dia
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-stone-500 font-mono mt-0.5">
                        Total de <span className="font-bold text-stone-800 tabular-nums">{countAll}</span> pedidos no período selecionado
                      </p>
                    </div>

                    <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
                      {/* Alternador de Modo: Tabela vs Cards */}
                      <div className="flex items-center bg-stone-100 rounded-lg p-0.5 border border-stone-200">
                        <button
                          type="button"
                          onClick={() => setOrdersViewMode('table')}
                          title="Visualização em Tabela (Principal)"
                          className={`h-7 px-2.5 rounded-md text-xs font-mono font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                            ordersViewMode === 'table'
                              ? 'bg-[#083d07] text-[#fdfbf7] shadow-xs border border-[#d5af7a]/60'
                              : 'text-stone-500 hover:text-stone-800'
                          }`}
                        >
                          <List size={13} />
                          <span>Tabela</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setOrdersViewMode('cards')}
                          title="Visualização em Comandas (Cards)"
                          className={`h-7 px-2.5 rounded-md text-xs font-mono font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                            ordersViewMode === 'cards'
                              ? 'bg-[#083d07] text-[#fdfbf7] shadow-xs border border-[#d5af7a]/60'
                              : 'text-stone-500 hover:text-stone-800'
                          }`}
                        >
                          <LayoutGrid size={13} />
                          <span>Cards</span>
                        </button>
                      </div>

                      {/* Botão Novo Pedido PDV */}
                      <button
                        onClick={() => setShowPDVModal(true)}
                        className="flex items-center gap-1.5 px-3.5 py-1.5 bg-[#083d07] hover:bg-[#0b520a] active:bg-[#062b06] text-[#fdfbf7] rounded-lg text-xs font-black font-mono tracking-wide shadow-xs transition-all cursor-pointer border border-[#d5af7a]/60"
                      >
                        <Plus size={15} className="stroke-[2.5]" />
                        <span>NOVO PEDIDO (PDV)</span>
                      </button>
                    </div>
                  </div>

                  {/* Barra de Filtros por Status e Campo de Busca (Minimalista Padrão da Empresa) */}
                  <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-2.5">
                    {/* Filtros em Pílulas Clean */}
                    <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0 scrollbar-none">
                      <button
                        type="button"
                        onClick={() => setOrdersStatusFilter('todos')}
                        className={`px-3 py-1 rounded-lg text-xs font-mono font-bold transition-all shrink-0 cursor-pointer border flex items-center gap-1.5 ${
                          ordersStatusFilter === 'todos' ? 'bg-[#E8D8D1] text-[#083D07] border-[#D5AF7A] shadow-2xs font-bold' : 'bg-white text-stone-600 border-stone-200 hover:bg-stone-50 hover:text-stone-900'
                        }`}
                      >
                        <span>Todos</span>
                        <span className="opacity-70 tabular-nums font-normal">({countAll})</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setOrdersStatusFilter('Pendente')}
                        className={`px-3 py-1 rounded-lg text-xs font-mono font-bold transition-all shrink-0 cursor-pointer border flex items-center gap-1.5 ${
                          ordersStatusFilter === 'Pendente' ? 'bg-[#E8D8D1] text-[#083D07] border-[#D5AF7A] shadow-2xs font-bold' : 'bg-white text-stone-600 border-stone-200 hover:bg-stone-50 hover:text-stone-900'
                        }`}
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                        <span>Pendentes</span>
                        <span className="opacity-70 tabular-nums font-normal">({countPendente})</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setOrdersStatusFilter('Em Preparo')}
                        className={`px-3 py-1 rounded-lg text-xs font-mono font-bold transition-all shrink-0 cursor-pointer border flex items-center gap-1.5 ${
                          ordersStatusFilter === 'Em Preparo' ? 'bg-[#E8D8D1] text-[#083D07] border-[#D5AF7A] shadow-2xs font-bold' : 'bg-white text-stone-600 border-stone-200 hover:bg-stone-50 hover:text-stone-900'
                        }`}
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-stone-700 shrink-0" />
                        <span>Em Preparo</span>
                        <span className="opacity-70 tabular-nums font-normal">({countPreparo})</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setOrdersStatusFilter('Saiu para Entrega')}
                        className={`px-3 py-1 rounded-lg text-xs font-mono font-bold transition-all shrink-0 cursor-pointer border flex items-center gap-1.5 ${
                          ordersStatusFilter === 'Saiu para Entrega' ? 'bg-[#E8D8D1] text-[#083D07] border-[#D5AF7A] shadow-2xs font-bold' : 'bg-white text-stone-600 border-stone-200 hover:bg-stone-50 hover:text-stone-900'
                        }`}
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-stone-500 shrink-0" />
                        <span>Em Rota</span>
                        <span className="opacity-70 tabular-nums font-normal">({countEntrega})</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setOrdersStatusFilter('Finalizado')}
                        className={`px-3 py-1 rounded-lg text-xs font-mono font-bold transition-all shrink-0 cursor-pointer border flex items-center gap-1.5 ${
                          ordersStatusFilter === 'Finalizado' ? 'bg-[#E8D8D1] text-[#083D07] border-[#D5AF7A] shadow-2xs font-bold' : 'bg-white text-stone-600 border-stone-200 hover:bg-stone-50 hover:text-stone-900'
                        }`}
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 shrink-0" />
                        <span>Concluídos</span>
                        <span className="opacity-70 tabular-nums font-normal">({countFinalizado})</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setOrdersStatusFilter('Cancelado')}
                        className={`px-3 py-1 rounded-lg text-xs font-mono font-bold transition-all shrink-0 cursor-pointer border flex items-center gap-1.5 ${
                          ordersStatusFilter === 'Cancelado' ? 'bg-[#E8D8D1] text-[#083D07] border-[#D5AF7A] shadow-2xs font-bold' : 'bg-white text-stone-600 border-stone-200 hover:bg-stone-50 hover:text-stone-900'
                        }`}
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
                        <span>Cancelados</span>
                        <span className="opacity-70 tabular-nums font-normal">({countCancelado})</span>
                      </button>
                    </div>

                    {/* Busca Inteligente */}
                    <div className="relative w-full lg:w-72 shrink-0">
                      <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-stone-400" />
                      <input
                        type="text"
                        value={ordersSearchTerm}
                        onChange={(e) => setOrdersSearchTerm(e.target.value)}
                        placeholder="Buscar por Nº, cliente, CPF..."
                        className="w-full pl-8 pr-7 py-1.5 bg-stone-50 border border-stone-200 rounded-lg text-xs font-mono text-stone-900 placeholder:text-stone-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-stone-400 transition-all"
                      />
                      {ordersSearchTerm && (
                        <button
                          onClick={() => setOrdersSearchTerm('')}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 p-0.5 cursor-pointer"
                        >
                          <X size={13} />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Estado Vazio */}
                  {filteredList.length === 0 && (
                    <div className="py-12 text-center flex flex-col items-center justify-center text-stone-400 bg-stone-50/50 rounded-xl border border-dashed border-stone-200">
                      <ShoppingBag size={36} className="mb-2 opacity-40 text-stone-500" />
                      <p className="font-bold text-stone-700 text-sm">Nenhum pedido encontrado</p>
                      <p className="text-stone-500 font-mono text-xs mt-0.5 max-w-sm">
                        {ordersSearchTerm || ordersStatusFilter !== 'todos'
                          ? 'Tente ajustar os filtros ou o termo de busca para visualizar os pedidos.'
                          : 'Aguardando novos pedidos entrarem pelo cardápio digital ou balcão.'}
                      </p>
                      {(ordersSearchTerm || ordersStatusFilter !== 'todos') && (
                        <button
                          onClick={() => { setOrdersSearchTerm(''); setOrdersStatusFilter('todos'); }}
                          className="mt-3 px-3 py-1 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-md text-xs font-mono font-bold transition-colors cursor-pointer border border-stone-200"
                        >
                          Limpar Filtros
                        </button>
                      )}
                    </div>
                  )}

                  {/* VISUALIZAÇÃO EM CARDS (COMANDA OPERACIONAL DE ALTA USABILIDADE) */}
                  {ordersViewMode === 'cards' && filteredList.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 pt-1">
                      {filteredList.map((order: any) => {
                        const elapsed = getElapsedTime(order.createdAt);
                        const isDelivery = order.orderType === 'entrega' || order.orderType === 'Delivery';
                        const items = safeParseItems(order.items);
                        const isPending = order.status === 'Pendente';
                        const isInPrep = order.status === 'Em Preparo';
                        const isInRoute = order.status === 'Saiu para Entrega';
                        const isDone = order.status === 'Finalizado';
                        const isCanceled = order.status === 'Cancelado';

                        // Cores de status de alta legibilidade para operação de cozinha/balcão
                        const statusColor = isPending
                          ? 'border-t-amber-400'
                          : isInPrep
                          ? 'border-t-amber-500'
                          : isInRoute
                          ? 'border-t-sky-500'
                          : isDone
                          ? 'border-t-emerald-500'
                          : 'border-t-rose-400';

                        return (
                          <div
                            key={order.id}
                            className={`bg-white rounded-xl border border-stone-200/90 shadow-sm hover:shadow-md transition-all flex flex-col justify-between overflow-hidden border-t-4 ${statusColor}`}
                          >
                            {/* Topo da Comanda: ID, Tipo de Pedido, Horário e Valor */}
                            <div className="p-3.5 pb-3 border-b border-stone-100 bg-stone-50/40 space-y-2">
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2">
                                  <span className="font-mono font-black text-sm text-stone-900 bg-white px-2 py-0.5 rounded-md border border-stone-200 shadow-2xs">
                                    #{order.id}
                                  </span>

                                  {/* Badge Tipo: Entrega, Retirada, Balcão, Mesa */}
                                  {(() => {
                                    const normType = normalizeOrderType(order.orderType || order.order_type);
                                    const isDel = normType === 'entrega';
                                    const isRet = normType === 'retirada';
                                    const isMesa = normType === 'mesa';
                                    return (
                                      <span
                                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold border ${
                                          isDel
                                            ? 'bg-sky-50 text-sky-800 border-sky-200'
                                            : isRet
                                            ? 'bg-amber-50 text-amber-800 border-amber-200'
                                            : isMesa
                                            ? 'bg-purple-50 text-purple-800 border-purple-200'
                                            : 'bg-stone-100 text-stone-800 border-stone-200'
                                        }`}
                                      >
                                        {isDel ? (
                                          <Bike size={12} className="text-sky-600" />
                                        ) : isRet ? (
                                          <ShoppingBag size={12} className="text-amber-600" />
                                        ) : isMesa ? (
                                          <UtensilsCrossed size={12} className="text-purple-600" />
                                        ) : (
                                          <Store size={12} className="text-stone-600" />
                                        )}
                                        <span>
                                          {isDel ? 'Entrega' : isRet ? 'Retirada' : isMesa ? 'Mesa' : 'Balcão'}
                                        </span>
                                      </span>
                                    );
                                  })()}

                                  {/* Badge Editado */}
                                  {(order.isEdited || order.is_edited) && (
                                    <span className="text-[10px] font-mono font-black px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-300">
                                      EDITADO
                                    </span>
                                  )}
                                </div>

                                {/* Valor Total em Destaque */}
                                <div className="text-right">
                                  <span className="font-mono font-black text-lg text-stone-900 tabular-nums">
                                    R$ {Number(order.totalAmount || 0).toFixed(2)}
                                  </span>
                                </div>
                              </div>

                              {/* Linha de Horário, Tempo Decorrido e Status */}
                              <div className="flex items-center justify-between gap-2 flex-wrap">
                                <div className="flex items-center gap-1.5 text-xs text-stone-500 font-mono">
                                  <Clock size={12} className="text-stone-400" />
                                  <span className="font-bold text-stone-700">
                                    {new Date(order.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                  </span>
                                  {order.status !== 'Finalizado' && order.status !== 'Cancelado' && elapsed.text && (
                                    <span className="text-[11px] font-bold px-1.5 py-0.2 rounded bg-stone-100 text-stone-700 border border-stone-200">
                                      {elapsed.text}
                                    </span>
                                  )}
                                </div>

                                {/* Tag de Status */}
                                <span
                                  className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                                    isPending
                                      ? 'bg-amber-100 text-amber-900 border-amber-300'
                                      : isInPrep
                                      ? 'bg-[#083d07] text-[#d5af7a] border-[#0b520a]'
                                      : isInRoute
                                      ? 'bg-sky-100 text-sky-900 border-sky-300'
                                      : isDone
                                      ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                                      : 'bg-rose-100 text-rose-900 border-rose-300'
                                  }`}
                                >
                                  <span
                                    className={`w-1.5 h-1.5 rounded-full ${
                                      isPending
                                        ? 'bg-amber-500'
                                        : isInPrep
                                        ? 'bg-[#083d07]'
                                        : isInRoute
                                        ? 'bg-sky-500'
                                        : isDone
                                        ? 'bg-emerald-600'
                                        : 'bg-rose-500'
                                    }`}
                                  />
                                  <span>{order.status}</span>
                                </span>
                              </div>
                            </div>

                            {/* Informações do Cliente e Pagamento */}
                            <div className="p-3.5 py-2.5 space-y-2 border-b border-stone-100">
                              <div className="flex items-center justify-between gap-2">
                                <span className="font-black text-stone-900 text-sm truncate">{order.customerName}</span>
                                {order.customerPhone && (
                                  <a
                                    href={`tel:${order.customerPhone}`}
                                    className="text-stone-700 hover:text-stone-950 font-mono font-bold text-xs flex items-center gap-1 bg-stone-100 hover:bg-stone-200 px-2 py-0.5 rounded border border-stone-200 transition-colors"
                                    title="Ligar para cliente"
                                  >
                                    <Phone size={11} className="text-stone-500" />
                                    <span>{order.customerPhone}</span>
                                  </a>
                                )}
                              </div>

                              {/* Endereço de Entrega Resumido & Limpo */}
                              {isDelivery && order.deliveryAddress && (
                                <div className="flex items-start gap-1.5 text-xs text-stone-700 bg-sky-50/50 p-2 rounded-lg border border-sky-100">
                                  <MapPin size={13} className="text-sky-600 shrink-0 mt-0.5" />
                                  <div className="leading-snug">
                                    <span className="font-medium text-stone-800">{order.deliveryAddress}</span>
                                    {order.deliveryZone && (
                                      <span className="block text-[11px] font-bold text-sky-800 mt-0.5">
                                        Zona: {order.deliveryZone}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              )}

                              {renderMotoboyBadge(order)}

                              {/* Pagamento e Troco */}
                              <div className="flex items-center justify-between gap-2 text-xs flex-wrap">
                                <div className="flex items-center gap-1.5 text-stone-600 font-mono">
                                  <CreditCard size={12} className="text-stone-400" />
                                  <span className="font-bold text-stone-800">{order.paymentMethod || 'Numerário'}</span>
                                  {order.nif && (
                                    <span className="text-[10px] font-bold bg-stone-100 text-stone-600 px-1 rounded border border-stone-200">
                                      CPF: {order.nif}
                                    </span>
                                  )}
                                </div>

                                {order.changeFor && Number(order.changeFor) > 0 && (
                                  <span className="text-[11px] font-mono font-bold text-amber-900 bg-amber-100 px-2 py-0.5 rounded border border-amber-300">
                                    Troco p/ R$ {Number(order.changeFor).toFixed(2)}
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Comanda de Produção: Lista dos Itens com Alta Clareza */}
                            <div className="p-3.5 py-2.5 flex-1">
                              <div className="space-y-2">
                                {items.map((item: any, idx: number) => {
                                  const qty = item.quantity || item.qty || 1;
                                  const isPizza = item.type === 'pizza' || item.isPizza || (item.flavors && item.flavors.length > 0);
                                  const flavors = item.flavors || [];
                                  const itemPrice = Number(item.price || 0) * qty;

                                  return (
                                    <div key={idx} className="border-b border-stone-100 last:border-b-0 pb-1.5 last:pb-0">
                                      <div className="flex items-start justify-between gap-2">
                                        <div className="flex items-start gap-2 min-w-0">
                                          {/* Quantidade em Destaque Real de Cozinha */}
                                          <span className="font-mono font-black text-[#fdfbf7] bg-[#083d07] px-1.5 py-0.5 rounded text-xs shrink-0 border border-[#d5af7a]/60 shadow-2xs">
                                            {qty}x
                                          </span>
                                          <div className="min-w-0">
                                            <div className="font-black text-stone-900 text-xs sm:text-sm leading-snug">
                                              {item.name || 'Produto'}
                                            </div>

                                            {/* Sabores Meio a Meio */}
                                            {isPizza && flavors.length > 0 && (
                                              <div className="mt-1 space-y-0.5">
                                                {flavors.map((fl: any, fIdx: number) => {
                                                  const fraction = flavors.length === 2 ? '1/2' : flavors.length === 3 ? '1/3' : flavors.length === 4 ? '1/4' : '1/1';
                                                  const flName = typeof fl === 'string' ? fl : fl.name;
                                                  return (
                                                    <div key={fIdx} className="flex items-center gap-1.5 text-xs text-stone-700 font-medium">
                                                      <span className="text-[10px] font-mono font-bold bg-stone-100 text-stone-800 px-1 rounded border border-stone-200">
                                                        {fraction}
                                                      </span>
                                                      <span className="truncate">{flName}</span>
                                                    </div>
                                                  );
                                                })}
                                              </div>
                                            )}

                                            {/* Borda Recheada */}
                                            {(item.crust || item.borda) && (
                                              <div className="text-[11px] text-amber-900 font-bold mt-0.5 flex items-center gap-1">
                                                <span>🧀 Borda:</span>
                                                <span>{item.crust || item.borda}</span>
                                              </div>
                                            )}
                                          </div>
                                        </div>

                                        {/* Preço só é exibido se for maior que 0 (evita R$0.00 confuso de IA) */}
                                        {itemPrice > 0 && (
                                          <span className="font-mono text-stone-700 text-xs font-bold tabular-nums shrink-0">
                                            R$ {itemPrice.toFixed(2)}
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>

                              {/* Observação Geral com Alerta em Destaque */}
                              {order.notes && order.notes.trim() && (
                                <div className="mt-2.5 bg-amber-50 border border-amber-300 px-2.5 py-1.5 rounded-lg text-xs font-bold text-amber-950 flex items-start gap-1.5">
                                  <AlertCircle size={14} className="text-amber-700 shrink-0 mt-0.5" />
                                  <span className="break-words leading-tight">
                                    Obs: {order.notes}
                                  </span>
                                </div>
                              )}
                            </div>

                            {/* Rodapé do Card: Ações Operacionais */}
                            <div className="p-3 pt-2 border-t border-stone-100 bg-stone-50/50 space-y-2">
                              {/* Botão de Avanço Rápido */}
                              {isPending && (
                                <button
                                  type="button"
                                  onClick={() => changeOrderStatus(order, 'Em Preparo')}
                                  className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-[#083d07] hover:bg-[#0b520a] active:bg-[#062b06] text-[#fdfbf7] font-mono font-black text-xs shadow-2xs transition-all cursor-pointer border border-[#d5af7a]/60"
                                >
                                  <Flame size={14} />
                                  <span>INICIAR PREPARO</span>
                                  <ArrowRight size={14} />
                                </button>
                              )}

                              {isInPrep && (
                                <button
                                  type="button"
                                  onClick={() => changeOrderStatus(order, isDelivery ? 'Saiu para Entrega' : 'Finalizado')}
                                  className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-[#083d07] hover:bg-[#062b06] active:bg-black text-[#d5af7a] font-mono font-black text-xs shadow-2xs transition-all cursor-pointer border border-[#0b520a]"
                                >
                                  {isDelivery ? <Bike size={14} /> : <Check size={14} />}
                                  <span>{isDelivery ? 'DESPACHAR (MOTOBOY)' : 'FINALIZAR PEDIDO'}</span>
                                  <ArrowRight size={14} />
                                </button>
                              )}

                              {isInRoute && (
                                <button
                                  type="button"
                                  onClick={() => changeOrderStatus(order, 'Finalizado')}
                                  className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-[#083d07] hover:bg-[#062b06] active:bg-black text-white font-mono font-black text-xs shadow-2xs transition-all cursor-pointer border border-[#0b520a]"
                                >
                                  <Check size={14} className="text-[#d5af7a]" />
                                  <span>CONCLUIR ENTREGA</span>
                                </button>
                              )}

                              {isDone && (
                                <div className="text-center py-1.5 text-xs font-mono font-bold text-emerald-800 bg-emerald-50 rounded-lg border border-emerald-200">
                                  ✓ PEDIDO CONCLUÍDO
                                </div>
                              )}

                              {isCanceled && (
                                <div className="text-center py-1.5 text-xs font-mono font-bold text-rose-800 bg-rose-50 rounded-lg border border-rose-200">
                                  ✕ PEDIDO CANCELADO
                                </div>
                              )}

                              {/* Linha de Atalhos: Mudar Status + Imprimir + Editar + Cancelar + Excluir */}
                              <div className="flex items-center justify-between gap-1 pt-1">
                                <select
                                  value={order.status}
                                  onChange={(e) => changeOrderStatus(order, e.target.value)}
                                  className="text-[11px] font-mono font-bold px-2 py-1 bg-white rounded border border-stone-200 text-stone-800 cursor-pointer outline-none hover:bg-stone-50 transition-colors"
                                  title="Mudar status manualmente"
                                >
                                  <option value="Pendente">Pendente</option>
                                  <option value="Em Preparo">Em Preparo</option>
                                  <option value="Saiu para Entrega">Saiu para Entrega</option>
                                  <option value="Finalizado">Finalizado</option>
                                  <option value="Cancelado">Cancelado</option>
                                </select>

                                <div className="flex items-center gap-1">
                                  <button
                                    onClick={() => handlePrintOrder(order)}
                                    className="p-1.5 text-stone-700 hover:text-stone-950 bg-white hover:bg-stone-100 border border-stone-200 rounded-md transition-colors cursor-pointer"
                                    title="Imprimir Talão Térmico"
                                  >
                                    <Printer size={13} />
                                  </button>

                                  <button
                                    onClick={() => setEditingOrder(order)}
                                    className="p-1.5 text-stone-700 hover:text-stone-950 bg-white hover:bg-stone-100 border border-stone-200 rounded-md transition-colors cursor-pointer"
                                    title="Editar Pedido"
                                  >
                                    <Edit2 size={13} />
                                  </button>

                                  {order.status !== 'Finalizado' && order.status !== 'Cancelado' && (
                                    <button
                                      onClick={() => {
                                        if (window.confirm(`Deseja realmente CANCELAR o Pedido #${order.id}?`)) {
                                          changeOrderStatus(order, 'Cancelado');
                                        }
                                      }}
                                      className="p-1.5 text-stone-400 hover:text-rose-600 hover:bg-rose-50 border border-stone-200 hover:border-rose-200 rounded-md transition-colors cursor-pointer"
                                      title="Cancelar Pedido"
                                    >
                                      <X size={13} />
                                    </button>
                                  )}

                                  <button
                                    onClick={() => handleDeleteOrder(order.id)}
                                    className="p-1.5 text-stone-400 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 rounded-md transition-colors cursor-pointer"
                                    title="Excluir Permanentemente"
                                  >
                                    <Trash2 size={13} />
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* VISUALIZAÇÃO EM TABELA (LIMPA, SEM ENDEREÇOS POLUINDO A PÁGINA PRINCIPAL) */}
                  {ordersViewMode === 'table' && filteredList.length > 0 && (
                    <div className="overflow-x-auto rounded-lg border border-stone-200">
                      <table className="min-w-full text-left">
                        <thead>
                          <tr className="border-b border-stone-200 text-[11px] font-mono font-bold text-stone-600 uppercase tracking-wider bg-stone-50">
                            <th className="py-3 px-4">Nº / Hora</th>
                            <th className="py-3 px-4">Cliente / Contato</th>
                            <th className="py-3 px-4">Tipo</th>
                            <th className="py-3 px-4">Pagamento</th>
                            <th className="py-3 px-4">Valor</th>
                            <th className="py-3 px-4 text-center">Status</th>
                            <th className="py-3 px-4 text-right">Ações</th>
                          </tr>
                        </thead>
                        <tbody className="text-xs font-mono divide-y divide-stone-100">
                          {filteredList.map((order: any) => {
                            const elapsed = getElapsedTime(order.createdAt);
                            const isDelivery = order.orderType === 'entrega' || order.orderType === 'Delivery';

                            return (
                              <tr key={order.id} className="hover:bg-stone-50/80 transition-colors">
                                <td className="py-3 px-4">
                                  <div className="flex items-center gap-1.5">
                                    <span className="font-black text-stone-900 tabular-nums">#{order.id}</span>
                                    {(order.isEdited || order.is_edited) && (
                                      <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-300">
                                        EDITADO
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-[11px] text-stone-500 mt-0.5 flex items-center gap-1">
                                    <span className="font-bold text-stone-700">
                                      {new Date(order.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                    {order.status !== 'Finalizado' && order.status !== 'Cancelado' && elapsed.text && (
                                      <span className="text-[10px] text-stone-400">({elapsed.text})</span>
                                    )}
                                  </div>
                                </td>

                                {/* Cliente & Contato: Limpo e objetivo, sem endereço poluindo */}
                                <td className="py-3 px-4">
                                  <div className="font-black text-stone-900 text-xs sm:text-sm">{order.customerName}</div>
                                  <div className="flex items-center gap-2 mt-0.5 text-[11px] text-stone-500">
                                    {order.customerPhone && (
                                      <a
                                        href={`tel:${order.customerPhone}`}
                                        className="hover:text-stone-900 font-bold transition-colors"
                                      >
                                        {order.customerPhone}
                                      </a>
                                    )}
                                    {order.nif && (
                                      <span className="px-1 bg-stone-100 rounded text-[10px] font-bold border border-stone-200">
                                        CPF: {order.nif}
                                      </span>
                                    )}
                                  </div>
                                </td>

                                <td className="py-3 px-4">
                                  {(() => {
                                    const normType = normalizeOrderType(order.orderType || order.order_type);
                                    const isDel = normType === 'entrega';
                                    const isRet = normType === 'retirada';
                                    const isMesa = normType === 'mesa';
                                    return (
                                      <span
                                        title={isDel && order.deliveryAddress ? `Endereço: ${order.deliveryAddress}` : undefined}
                                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-mono font-bold border ${
                                          isDel
                                            ? 'bg-sky-50 text-sky-800 border-sky-200'
                                            : isRet
                                            ? 'bg-amber-50 text-amber-800 border-amber-200'
                                            : isMesa
                                            ? 'bg-purple-50 text-purple-800 border-purple-200'
                                            : 'bg-stone-100 text-stone-700 border-stone-200'
                                        }`}
                                      >
                                        {isDel ? (
                                          <Bike size={12} className="text-sky-600" />
                                        ) : isRet ? (
                                          <ShoppingBag size={12} className="text-amber-600" />
                                        ) : isMesa ? (
                                          <UtensilsCrossed size={12} className="text-purple-600" />
                                        ) : (
                                          <Store size={12} className="text-stone-500" />
                                        )}
                                        <span>
                                          {isDel ? 'Entrega' : isRet ? 'Retirada' : isMesa ? 'Mesa' : 'Balcão'}
                                        </span>
                                      </span>
                                    );
                                  })()}
                                  {isDeliveryOrderType(order.orderType) && (
                                    <div className="mt-1">{renderMotoboyBadge(order)}</div>
                                  )}
                                </td>

                                <td className="py-3 px-4">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold font-mono bg-stone-100 text-stone-800 border border-stone-200">
                                      {order.paymentMethod || 'Numerário'}
                                    </span>
                                    {order.changeFor && Number(order.changeFor) > 0 && (
                                      <span className="text-[10px] font-bold text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                                        Troco R$ {Number(order.changeFor).toFixed(0)}
                                      </span>
                                    )}
                                  </div>
                                </td>

                                <td className="py-3 px-4 font-black tabular-nums text-stone-900 text-sm">
                                  R$ {Number(order.totalAmount || 0).toFixed(2)}
                                </td>

                                <td className="py-3 px-4 text-center">
                                  <select
                                    value={order.status}
                                    onChange={(e) => changeOrderStatus(order, e.target.value)}
                                    className="px-2.5 py-1 rounded-md text-[11px] font-mono font-bold border border-stone-200 bg-white text-stone-800 cursor-pointer outline-none hover:bg-stone-50 transition-all"
                                    style={{ textAlignLast: 'center' }}
                                    title="Alterar status"
                                  >
                                    <option value="Pendente">Pendente</option>
                                    <option value="Em Preparo">Em Preparo</option>
                                    <option value="Saiu para Entrega">Saiu para Entrega</option>
                                    <option value="Finalizado">Finalizado</option>
                                    <option value="Cancelado">Cancelado</option>
                                  </select>
                                </td>

                                <td className="py-3 px-4 text-right">
                                  <div className="flex items-center justify-end gap-1.5">
                                    {order.status === 'Pendente' && (
                                      <button
                                        onClick={() => changeOrderStatus(order, 'Em Preparo')}
                                        className="text-[11px] font-mono font-black px-2.5 py-1 rounded bg-[#083d07] hover:bg-[#0b520a] text-[#fdfbf7] transition-colors cursor-pointer border border-[#d5af7a]/60 shadow-2xs"
                                        title="Iniciar Preparo"
                                      >
                                        PREPARAR
                                      </button>
                                    )}
                                    {order.status === 'Em Preparo' && (
                                      <button
                                        onClick={() => changeOrderStatus(order, isDelivery ? 'Saiu para Entrega' : 'Finalizado')}
                                        className="text-[11px] font-mono font-black px-2.5 py-1 rounded bg-[#083d07] hover:bg-[#062b06] text-[#d5af7a] transition-colors cursor-pointer border border-[#0b520a] shadow-2xs"
                                        title={isDelivery ? 'Despachar Motoboy' : 'Finalizar Pedido'}
                                      >
                                        {isDelivery ? 'DESPACHAR' : 'FINALIZAR'}
                                      </button>
                                    )}
                                    {order.status === 'Saiu para Entrega' && (
                                      <button
                                        onClick={() => changeOrderStatus(order, 'Finalizado')}
                                        className="text-[11px] font-mono font-bold px-2.5 py-1 rounded bg-[#083d07] hover:bg-[#062b06] text-white transition-colors cursor-pointer border border-[#0b520a] shadow-2xs"
                                        title="Concluir Pedido"
                                      >
                                        CONCLUIR
                                      </button>
                                    )}
                                    <button
                                      onClick={() => handlePrintOrder(order)}
                                      className="p-1.5 text-stone-700 hover:text-stone-950 bg-white hover:bg-stone-100 border border-stone-200 rounded-md transition-colors cursor-pointer"
                                      title="Imprimir Talão"
                                    >
                                      <Printer size={13} />
                                    </button>
                                    <button
                                      onClick={() => setEditingOrder(order)}
                                      className="p-1.5 text-stone-700 hover:text-stone-950 bg-white hover:bg-stone-100 border border-stone-200 rounded-md transition-colors cursor-pointer"
                                      title="Editar Pedido"
                                    >
                                      <Edit2 size={13} />
                                    </button>
                                    {order.status !== 'Finalizado' && order.status !== 'Cancelado' && (
                                      <button
                                        onClick={() => {
                                          if (window.confirm(`Deseja cancelar o Pedido #${order.id}?`)) {
                                            changeOrderStatus(order, 'Cancelado');
                                          }
                                        }}
                                        className="p-1.5 text-stone-400 hover:text-rose-600 hover:bg-rose-50 border border-stone-200 hover:border-rose-200 rounded-md transition-colors cursor-pointer"
                                        title="Cancelar Pedido"
                                      >
                                        <X size={13} />
                                      </button>
                                    )}
                                    <button
                                      onClick={() => handleDeleteOrder(order.id)}
                                      className="p-1.5 text-stone-400 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 rounded-md transition-colors cursor-pointer"
                                      title="Excluir Pedido"
                                    >
                                      <Trash2 size={13} />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        )}

        {/* Relatórios Tab */}
        {activeTab === "relatorios" && (
          <motion.div 
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, ease: [0.2, 0, 0, 1] }}
            className="mt-1 space-y-2.5 pb-12"
          >
            {/* Filtro de Tempo Compacto Padronizado */}
            <motion.div 
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, ease: [0.2, 0, 0, 1] }}
              className="bg-white rounded-xl border border-stone-200/90 shadow-2xs px-3 py-1.5"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-600 shrink-0" />
                  <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-stone-800">
                    Período dos Relatórios
                  </span>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <PeriodFilterCompact
                    value={dateFilter as any}
                    startDate={customStartDate}
                    endDate={customEndDate}
                    onChange={(res) => {
                      setDateFilter(res.period);
                      dateFilterRef.current = res.period;
                      if (res.startDate) {
                        setCustomStartDate(res.startDate);
                        customStartDateRef.current = res.startDate;
                      }
                      if (res.endDate) {
                        setCustomEndDate(res.endDate);
                        customEndDateRef.current = res.endDate;
                      }
                      fetchDashboardData(false, res.period);
                    }}
                    align="right"
                  />

                  <button
                    onClick={() => fetchDashboardData()}
                    className="h-7 px-2 rounded-lg border border-stone-200 bg-white text-stone-700 hover:text-stone-950 hover:bg-stone-50 transition-colors cursor-pointer shadow-2xs flex items-center gap-1.5 text-[10px] font-bold"
                  >
                    <RefreshCw size={11} className={isLoading ? 'animate-spin text-rose-600' : 'text-stone-400'} />
                    <span className="hidden sm:inline uppercase tracking-wide">Atualizar</span>
                  </button>
                </div>
              </div>
            </motion.div>

            {/* Relatórios Financeiros & Faturamento */}
            <div>
              <motion.h2 
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.25, delay: 0.04, ease: [0.2, 0, 0, 1] }}
                className="text-[10.5px] font-mono font-bold uppercase tracking-wider text-stone-600 flex items-center gap-1.5 mb-1.5"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Relatórios Financeiros & Faturamento
              </motion.h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-2.5">
                <ReportCard
                  customDelay={0.06}
                  title="Faturamento Bruto"
                  value={formatCurrency(dashboardData?.totalRevenue ?? dashboardData?.faturamento ?? dashboardData?.faturamentoBruto ?? 0)}
                  icon={<DollarSign size={14} strokeWidth={1.5} className="text-emerald-950" />}
                  onClick={() => setReportModal({isOpen: true, type: 'faturamento', title: 'Composição do Faturamento'})}
                  subtitle="Total em vendas"
                />
                <ReportCard
                  customDelay={0.10}
                  title="Ticket Médio"
                  value={formatCurrency(dashboardData.ticketMedio)}
                  icon={<TrendingUp size={14} strokeWidth={1.5} className="text-emerald-950" />}
                  onClick={() => setReportModal({isOpen: true, type: 'ticket_medio', title: 'Cálculo e Análise do Ticket Médio'})}
                  subtitle="Média por pedido e canais"
                />
              </div>
            </div>

            {/* Vendas por Canal, Produtos & Operação */}
            <div>
              <motion.h2 
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.25, delay: 0.12, ease: [0.2, 0, 0, 1] }}
                className="text-[10.5px] font-mono font-bold uppercase tracking-wider text-stone-600 flex items-center gap-1.5 mb-1.5"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400" /> Vendas por Canal, Produtos & Operação
              </motion.h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-2.5">
                <ReportCard
                  customDelay={0.14}
                  title="Vendas de produtos"
                  value=""
                  icon={<Package size={14} strokeWidth={1.5} className="text-amber-950" />}
                  onClick={() => setReportModal({isOpen: true, type: 'produtos', title: 'Vendas de Produtos'})}
                  subtitle="Detalhamento por item"
                />
                <ReportCard
                  customDelay={0.18}
                  title="Vendas de complementos"
                  value=""
                  icon={<UtensilsCrossed size={14} strokeWidth={1.5} className="text-amber-950" />}
                  onClick={() => setReportModal({isOpen: true, type: 'complementos', title: 'Vendas de Complementos (Bordas e Extras)'})}
                  subtitle="Bordas e extras"
                />
                <ReportCard
                  customDelay={0.22}
                  title="Formas de Pagamento"
                  value=""
                  icon={<CreditCard size={14} strokeWidth={1.5} className="text-amber-950" />}
                  onClick={() => setReportModal({isOpen: true, type: 'pagamentos', title: 'Formas de Pagamento'})}
                  subtitle="Distribuição"
                />
                <ReportCard
                  customDelay={0.26}
                  title="Cancelamentos"
                  value=""
                  icon={<AlertCircle size={14} strokeWidth={1.5} className="text-amber-950" />}
                  onClick={() => setReportModal({isOpen: true, type: 'cancelamentos', title: 'Pedidos Cancelados'})}
                  subtitle="Análise de perdas"
                />
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === "cardapio-digital" && (
          <div className="space-y-4 pb-12 mt-1">
            {/* Unified Sticky Header for Cardápio Digital: Search + Category Pills */}
            <div className="sticky top-0 z-50 bg-stone-50/98 backdrop-blur-md border-b border-stone-200/90 shadow-sm -mx-4 md:-mx-8 px-4 md:px-8 pt-4 pb-3 mb-4 space-y-2.5">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                {/* Search Bar */}
                <div className="relative flex-1 max-w-md">
                  <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                  <input
                    type="text"
                    placeholder="Buscar produto por nome, ingrediente ou ID..."
                    value={cardapioSearchTerm}
                    onChange={(e) => setCardapioSearchTerm(e.target.value)}
                    className="w-full pl-9 pr-8 py-1.5 bg-white border border-stone-200 rounded-xl text-xs font-medium focus:outline-none focus:border-[#8b0000] focus:ring-1 focus:ring-[#8b0000] transition-colors shadow-2xs"
                  />
                  {cardapioSearchTerm && (
                    <button onClick={() => setCardapioSearchTerm('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 text-xs font-bold p-1 cursor-pointer">✕</button>
                  )}
                </div>
              </div>
              
              {/* Category Filter Pills */}
              <div className="flex overflow-x-auto no-scrollbar gap-1.5 items-center">
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    setActiveCategory('');
                    const mainEl = document.querySelector('main');
                    if (mainEl) mainEl.scrollTo({ top: 0, behavior: 'smooth' });
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className={`py-1 px-3 rounded-full text-xs whitespace-nowrap font-bold transition-all duration-150 active:scale-95 cursor-pointer border ${
                    !activeCategory
                      ? "bg-[#083d07] text-[#d5af7a] border-[#083d07] shadow-2xs"
                      : "bg-white text-stone-600 border-stone-200 hover:bg-stone-100"
                  }`}
                >
                  TODOS
                </button>
                {currentCategoriesUI.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      setActiveCategory(cat.id);
                      if (cardapioSearchTerm) {
                        setCardapioSearchTerm('');
                      }
                      setTimeout(() => {
                        const el = document.getElementById(`admin-cat-${cat.id}`);
                        if (el) {
                          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                          const mainEl = document.querySelector('main');
                          if (mainEl && mainEl.scrollHeight > mainEl.clientHeight) {
                            const topY = el.getBoundingClientRect().top + mainEl.scrollTop - mainEl.getBoundingClientRect().top - 130;
                            mainEl.scrollTo({ top: Math.max(0, topY), behavior: 'smooth' });
                          }
                          const windowY = el.getBoundingClientRect().top + window.pageYOffset - 130;
                          window.scrollTo({ top: Math.max(0, windowY), behavior: 'smooth' });
                        }
                      }, 40);
                    }}
                    className={`py-1 px-3 rounded-full text-xs whitespace-nowrap font-bold transition-all duration-150 active:scale-95 cursor-pointer border ${
                      activeCategory === cat.id
                        ? "bg-[#083d07] text-[#d5af7a] border-[#083d07] shadow-2xs"
                        : "bg-white text-stone-600 border-stone-200 hover:bg-stone-100"
                    } ${cat.id === "promocoes" && activeCategory !== cat.id ? "animate-pulse text-[#d5af7a] border-[#0b520a]" : ""}`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>

            {currentCategoriesUI.map(cat => {
              let items = itemsByCategory[cat.id];
              if (!items) return null;
              
              if (cardapioSearchTerm) {
                const term = cardapioSearchTerm.toLowerCase();
                items = items.filter(item => 
                  item.name.toLowerCase().includes(term) || 
                  item.id.toLowerCase().includes(term) ||
                  (item.ingredients && item.ingredients.toLowerCase().includes(term))
                );
              }
              
              if (items.length === 0) return null;
              
              // Check if all items in this category are paused
              const allPaused = items.every(item => pausedItems.includes(item.id));
              
              return (
                <div key={cat.id} id={`admin-cat-${cat.id}`} className="scroll-mt-36 bg-white p-5 rounded-xl border border-[#E7E5E1] shadow-[0_1px_2px_rgba(28,25,23,0.04),0_1px_8px_rgba(28,25,23,0.04)] hover:shadow-[0_4px_12px_rgba(28,25,23,0.08)] hover:border-[#D4AF6A]/30 transition-all duration-300">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-5 gap-3">
                    <div>
                      <h2 className="text-lg font-bold text-stone-900">{cat.label}</h2>
                      <p className="text-xs text-stone-500 font-mono">Total: {items.length} itens</p>
                    </div>
                    <button
                      onClick={() => togglePauseCategory(cat.group, allPaused)}
                      className={`px-3 py-1.5 rounded-lg font-bold text-xs transition-colors cursor-pointer ${allPaused ? 'bg-emerald-600 text-white hover:bg-emerald-700' : 'bg-rose-100 text-rose-700 hover:bg-rose-200 border border-rose-200'}`}
                    >
                      {allPaused ? 'Ativar Categoria' : 'Pausar Categoria'}
                    </button>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5">
                    {items.map((item) => (
                      <div key={item.id} className={`p-3.5 rounded-xl border ${pausedItems.includes(item.id) ? 'border-rose-200 bg-rose-50/50' : 'border-[#E7E5E1] bg-white'} shadow-xs hover:shadow-md transition-all flex gap-3 min-w-0 overflow-hidden`}>
                        {item.imageUrl ? (
                          <div className="w-20 h-20 rounded-lg overflow-hidden shrink-0 bg-stone-100 relative border border-stone-200/60">
                             <img 
                               src={item.imageUrl.startsWith('http') ? item.imageUrl : (item.imageUrl.startsWith('/') ? item.imageUrl : '/' + item.imageUrl)} 
                               alt={item.name} 
                               className={`w-full h-full object-cover ${pausedItems.includes(item.id) ? 'grayscale opacity-50' : ''}`}
                               onError={(e) => { (e.target as HTMLElement).parentElement!.style.display = 'none'; }}
                             />
                             {pausedItems.includes(item.id) && (
                               <div className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-xs text-white text-[9px] font-bold uppercase tracking-wider">
                                 Pausado
                               </div>
                             )}
                          </div>
                        ) : null}
                        <div className="flex-1 min-w-0 flex flex-col justify-between">
                          <div>
                            <h3 className={`font-bold text-xs truncate ${pausedItems.includes(item.id) ? 'text-stone-400 line-through' : 'text-stone-900'}`}>{item.name}</h3>
                            <p className="text-[11px] text-stone-500 mt-0.5 line-clamp-2 leading-snug">{item.ingredients}</p>
                          </div>
                          <div className="mt-2 flex flex-col gap-1.5">
                            <div className="flex justify-between items-center gap-1">
                              <span className="font-bold text-xs text-stone-900 font-mono shrink-0">
                                {item.priceSingle ? `R$ ${Number(item.priceSingle).toFixed(2)}` : (item.priceP ? `Pq: R$ ${Number(item.priceP).toFixed(2)}` : '')}
                              </span>
                              <button
                                onClick={() => togglePauseItem(item.id)}
                                className={`text-[10px] font-bold px-2 py-1 rounded-md transition-colors cursor-pointer shrink-0 ${pausedItems.includes(item.id) ? 'bg-emerald-600 text-white hover:bg-emerald-700' : 'bg-rose-600 text-white hover:bg-rose-700'}`}
                              >
                                {pausedItems.includes(item.id) ? 'Ativar Item' : 'Pausar Item'}
                              </button>
                            </div>
                            
                            {/* Size-specific pausing for pizzas */}
                            {item.priceM !== undefined && item.priceG !== undefined && (
                              <div className="flex items-center justify-between border-t border-stone-100 pt-1.5 mt-0.5 gap-1">
                                <span className="text-[9px] font-mono font-semibold text-stone-400 shrink-0">Tamanhos:</span>
                                <div className="flex gap-1 shrink-0">
                                  <button
                                    onClick={() => togglePauseItem(`${item.id}-P`)}
                                    className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border transition-colors cursor-pointer ${pausedItems.includes(`${item.id}-P`) ? 'bg-rose-100 text-rose-700 border-rose-300' : 'bg-stone-100 text-stone-700 border-stone-200 hover:bg-stone-200'}`}
                                    title={pausedItems.includes(`${item.id}-P`) ? 'Ativar Tamanho P' : 'Pausar Tamanho P'}
                                  >
                                    P {pausedItems.includes(`${item.id}-P`) ? '✕' : ''}
                                  </button>
                                  <button
                                    onClick={() => togglePauseItem(`${item.id}-M`)}
                                    className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border transition-colors cursor-pointer ${pausedItems.includes(`${item.id}-M`) ? 'bg-rose-100 text-rose-700 border-rose-300' : 'bg-stone-100 text-stone-700 border-stone-200 hover:bg-stone-200'}`}
                                    title={pausedItems.includes(`${item.id}-M`) ? 'Ativar Tamanho M' : 'Pausar Tamanho M'}
                                  >
                                    M {pausedItems.includes(`${item.id}-M`) ? '✕' : ''}
                                  </button>
                                  <button
                                    onClick={() => togglePauseItem(`${item.id}-G`)}
                                    className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border transition-colors cursor-pointer ${pausedItems.includes(`${item.id}-G`) ? 'bg-rose-100 text-rose-700 border-rose-300' : 'bg-stone-100 text-stone-700 border-stone-200 hover:bg-stone-200'}`}
                                    title={pausedItems.includes(`${item.id}-G`) ? 'Ativar Tamanho G' : 'Pausar Tamanho G'}
                                  >
                                    G {pausedItems.includes(`${item.id}-G`) ? '✕' : ''}
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

      </div>
      </main>
    </div>
    
      {/* Subscription Lockout Overlay (quando o acesso estiver bloqueado após carência) */}
      {BILLING_ENABLED && subscriptionStatusInfo.isBlocked && (
        <SubscriptionLockoutOverlay
          subscription={subscription}
          statusInfo={subscriptionStatusInfo}
          onRefresh={refreshSubscription}
          onSimulateState={simulateSubscriptionState}
        />
      )}
    
      {/* PDV Modal */}
      <PDVModal
        isOpen={showPDVModal}
        onClose={() => setShowPDVModal(false)}
        activeSessionId={dashboardData?.activeSessionId}
        onOrderCreated={(order) => {
          fetchDashboardData();
        }}
      />

      {isPasswordModalOpen && (
        <div 
          className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
          onClick={() => setIsPasswordModalOpen(false)}
        >
          <div 
            className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button onClick={() => setIsPasswordModalOpen(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
              <X size={24} />
            </button>
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Key size={24} className="text-[#083d07]" />
              Alterar Senha
            </h2>
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nova Senha</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#083d07] focus:border-transparent outline-none transition-shadow"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Confirmar Nova Senha</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#083d07] focus:border-transparent outline-none transition-shadow"
                  required
                />
              </div>
              
              {passwordChangeMessage && (
                <div className={`p-3 rounded-lg text-sm ${passwordChangeMessage.includes('sucesso') ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                  {passwordChangeMessage}
                </div>
              )}
              
              <button
                type="submit"
                className="w-full py-3 bg-[#083d07] text-white font-bold rounded-xl hover:bg-[#0b520a] transition-colors"
              >
                Salvar Nova Senha
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal Popup para Relatórios */}
      {reportModal.isOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#083d07]/60 backdrop-blur-sm animate-fadeIn"
          onClick={() => setReportModal({isOpen: false, type: '', title: ''})}
        >
          <div 
            className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden border border-stone-200 relative"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-5 border-b border-stone-200 flex justify-between items-center bg-stone-50">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-amber-500/10 text-amber-700 rounded-xl border border-amber-500/20">
                  <BarChart3 size={20} />
                </div>
                <div>
                  <h3 className="font-extrabold text-lg text-stone-900 leading-tight">
                    {reportModal.title}
                  </h3>
                  <p className="text-xs text-stone-500 font-medium">Relatório analítico do sistema</p>
                </div>
              </div>
              <button
                onClick={() => setReportModal({isOpen: false, type: '', title: ''})}
                className="p-2 text-stone-400 hover:text-stone-700 bg-white hover:bg-stone-100 rounded-xl transition-colors cursor-pointer border border-stone-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 flex-1">
              {(() => {
                let filteredReportOrders = filteredOrders && filteredOrders.length > 0 ? filteredOrders : (allOrders.length > 0 && dateFilter === 'todos' ? allOrders : (filteredOrders || []));
                if (reportModal.type === 'vendas_mes') {
                  filteredReportOrders = allOrders.filter(o => {
                    const d = safeGetDate(o.createdAt);
                    return d ? (d.getMonth() === new Date().getMonth() && d.getFullYear() === new Date().getFullYear()) : false;
                  });
                } else if (reportModal.type === 'vendas_7dias') {
                  filteredReportOrders = allOrders.filter(o => {
                    const d = safeGetDate(o.createdAt);
                    return d ? (d.getTime() >= (new Date().getTime() - 7 * 24 * 60 * 60 * 1000)) : false;
                  });
                } else if (reportModal.type === 'fluxo_caixa') {
                  const todayStr = new Date().toISOString().split('T')[0];
                  filteredReportOrders = allOrders.filter(o => {
                    const d = safeGetDate(o.createdAt);
                    return d ? (d.toISOString().split('T')[0] === todayStr) : false;
                  });
                } else if (reportModal.type === 'cancelamentos') {
                  filteredReportOrders = (filteredOrders || allOrders).filter(o => o.status === 'Cancelado' || o.status === 'cancelado');
                }
                
                if (reportModal.type === 'faturamento') {
                  const formatCurrency = (val: any) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(val) || 0);
                  const formatDateTime = (val: any) => {
                    if (!val) return 'Ativo';
                    const d = new Date(val);
                    return `${d.toLocaleDateString('pt-BR')} às ${d.toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'})}`;
                  };

                  return (
                    <div className="space-y-4">
                      <div className="flex justify-between items-center bg-stone-50 p-4 rounded-xl border border-stone-200">
                        <span className="font-bold text-stone-700 text-sm">Faturamento Acumulado (Período):</span>
                        <span className="font-black text-xl font-mono text-emerald-700">
                          {formatCurrency(dashboardData?.faturamentoBruto ?? 0)}
                        </span>
                      </div>
                      <div className="border border-stone-200 rounded-xl overflow-hidden shadow-xs">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="bg-stone-100 border-b border-stone-200 text-xs font-mono font-bold text-stone-700 uppercase">
                              <th className="py-3 px-4">Sessão (Abertura)</th>
                              <th className="py-3 px-4">Fechamento</th>
                              <th className="py-3 px-4 text-center">Status</th>
                              <th className="py-3 px-4 text-right">Faturamento</th>
                              <th className="py-3 px-4 text-right">Ação</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-stone-100 text-sm">
                            {filteredCashSessions.map((sess, idx) => (
                              <tr key={idx} className="hover:bg-stone-50/80 transition-colors">
                                <td className="py-3 px-4 text-stone-900">{formatDateTime(sess.opened_at)}</td>
                                <td className="py-3 px-4 text-stone-600">{formatDateTime(sess.closed_at)}</td>
                                <td className="py-3 px-4 text-center">
                                  <span className={`inline-block px-2 py-0.5 rounded text-xs font-bold ${sess.status === 'aberto' ? 'bg-emerald-100 text-emerald-800' : 'bg-stone-100 text-stone-800'}`}>
                                    {sess.status === 'aberto' ? 'Aberto' : 'Fechado'}
                                  </span>
                                </td>
                                <td className="py-3 px-4 text-right font-mono font-bold text-emerald-700">
                                  {formatCurrency(sess.total_faturado)}
                                </td>
                                <td className="py-3 px-4 text-right">
                                  <button
                                    onClick={() => setSelectedSessionForDetails(sess)}
                                    className="px-3 py-1.5 bg-[#083d07] text-white hover:bg-[#0b520a] rounded-lg text-xs font-bold transition-colors cursor-pointer shadow-sm"
                                  >
                                    Ver Detalhes
                                  </button>
                                </td>
                              </tr>
                            ))}
                            {filteredCashSessions.length === 0 && (
                              <tr><td colSpan={5} className="py-8 text-center text-stone-400 font-medium">Nenhum fechamento de caixa encontrado no período.</td></tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                }

                if (reportModal.type === 'produtos' || reportModal.type === 'complementos') {
                  const counts: Record<string, { qty: number, rev: number }> = {};
                  filteredReportOrders.forEach(o => {
                    if (o.status === 'Cancelado' || o.status === 'cancelado') return;
                    const items = safeParseItems(o.items);
                    items.forEach((it: any) => {
                      if (reportModal.type === 'produtos') {
                         counts[it.name] = counts[it.name] || {qty: 0, rev: 0};
                         counts[it.name].qty += Number(it.quantity || 1);
                         counts[it.name].rev += (Number(it.priceCalculated || it.price || 0)) * Number(it.quantity || 1);
                      } else {
                         if (it.extras) {
                           it.extras.forEach((ext: any) => {
                              counts[ext.name] = counts[ext.name] || {qty: 0, rev: 0};
                              counts[ext.name].qty += Number(it.quantity || 1);
                              counts[ext.name].rev += Number(ext.price || 0) * Number(it.quantity || 1);
                           });
                         }
                      }
                    });
                  });
                  const sorted = Object.entries(counts).sort((a,b) => b[1].rev - a[1].rev);
                  const totalRev = sorted.reduce((acc, curr) => acc + curr[1].rev, 0);

                  return (
                    <div className="space-y-4">
                      <div className="flex justify-between items-center bg-stone-50 p-4 rounded-xl border border-stone-200">
                        <span className="font-bold text-stone-700 text-sm">Faturamento Acumulado dos Itens:</span>
                        <span className="font-black text-xl font-mono text-emerald-700">R$ {totalRev.toFixed(2)}</span>
                      </div>
                      <div className="border border-stone-200 rounded-xl overflow-hidden shadow-xs">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="bg-stone-100 border-b border-stone-200 text-xs font-mono font-bold text-stone-700 uppercase">
                              <th className="py-3 px-4">Item / Produto</th>
                              <th className="py-3 px-4 text-center">Quantidade Vendida</th>
                              <th className="py-3 px-4 text-right">Faturamento Total</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-stone-100 text-sm">
                            {sorted.map(([name, data], idx) => (
                              <tr key={idx} className="hover:bg-stone-50/80 transition-colors">
                                <td className="py-3 px-4 font-bold text-stone-900">{name}</td>
                                <td className="py-3 px-4 text-center font-mono font-bold text-stone-600">{data.qty} uni</td>
                                <td className="py-3 px-4 text-right font-mono font-bold text-emerald-700">R$ {data.rev.toFixed(2)}</td>
                              </tr>
                            ))}
                            {sorted.length === 0 && (
                              <tr><td colSpan={3} className="py-8 text-center text-stone-400 font-medium">Nenhum dado encontrado para o período.</td></tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                } else if (reportModal.type === 'ticket_medio') {
                  const baseOrders = (filteredOrders && filteredOrders.length > 0) ? filteredOrders : allOrders;
                  const activeOrders = baseOrders.filter(o => isOrderActive(o));

                  const mesaOrders = activeOrders.filter(o => normalizeOrderType(o.orderType || o.order_type) === 'mesa');
                  const retiradaOrders = activeOrders.filter(o => ['retirada', 'balcao'].includes(normalizeOrderType(o.orderType || o.order_type)));
                  const entregaOrders = activeOrders.filter(o => normalizeOrderType(o.orderType || o.order_type) === 'entrega');

                  const mesaRev = mesaOrders.reduce((acc, o) => acc + (Number(o.totalAmount) || 0), 0);
                  const retiradaRev = retiradaOrders.reduce((acc, o) => acc + (Number(o.totalAmount) || 0), 0);
                  const entregaRev = entregaOrders.reduce((acc, o) => acc + (Number(o.totalAmount) || 0), 0);
                  const totalRev = activeOrders.reduce((acc, o) => acc + (Number(o.totalAmount) || 0), 0);

                  const mesaTicket = mesaOrders.length > 0 ? mesaRev / mesaOrders.length : 0;
                  const retiradaTicket = retiradaOrders.length > 0 ? retiradaRev / retiradaOrders.length : 0;
                  const entregaTicket = entregaOrders.length > 0 ? entregaRev / entregaOrders.length : 0;
                  const totalTicket = activeOrders.length > 0 ? totalRev / activeOrders.length : 0;

                  let currentTabOrders = activeOrders;
                  let currentTabName = 'Todas as Operações';
                  let currentTabTicket = totalTicket;
                  let currentTabRev = totalRev;

                  if (ticketMedioTab === 'mesa') {
                    currentTabOrders = mesaOrders;
                    currentTabName = 'Mesa';
                    currentTabTicket = mesaTicket;
                    currentTabRev = mesaRev;
                  } else if (ticketMedioTab === 'retirada') {
                    currentTabOrders = retiradaOrders;
                    currentTabName = 'Retirada';
                    currentTabTicket = retiradaTicket;
                    currentTabRev = retiradaRev;
                  } else if (ticketMedioTab === 'entrega') {
                    currentTabOrders = entregaOrders;
                    currentTabName = 'Entregas';
                    currentTabTicket = entregaTicket;
                    currentTabRev = entregaRev;
                  }

                  const segments = [
                    { id: 'todos', label: 'Geral', icon: TrendingUp, count: activeOrders.length, ticket: totalTicket, rev: totalRev },
                    { id: 'mesa', label: 'Mesa', icon: UtensilsCrossed, count: mesaOrders.length, ticket: mesaTicket, rev: mesaRev },
                    { id: 'retirada', label: 'Retirada', icon: ShoppingBag, count: retiradaOrders.length, ticket: retiradaTicket, rev: retiradaRev },
                    { id: 'entrega', label: 'Entregas', icon: Bike, count: entregaOrders.length, ticket: entregaTicket, rev: entregaRev },
                  ];

                  return (
                    <div className="space-y-3.5">
                      {/* Segmented Cards Minimalistas - Atuam como Filtro e Indicadores */}
                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
                        {segments.map((seg) => {
                          const IconComp = seg.icon;
                          const isSelected = ticketMedioTab === seg.id;
                          return (
                            <button
                              key={seg.id}
                              type="button"
                              onClick={() => setTicketMedioTab(seg.id as any)}
                              className={`p-3 rounded-xl text-left transition-all cursor-pointer border ${
                                isSelected
                                  ? 'bg-[#083d07] text-white border-[#083d07] shadow-sm'
                                  : 'bg-white text-stone-900 border-stone-200 hover:border-stone-300 hover:bg-stone-50/50'
                              }`}
                            >
                              <div className="flex items-center justify-between gap-1 mb-1">
                                <div className="flex items-center gap-1.5">
                                  <IconComp size={12} className={isSelected ? 'text-stone-300' : 'text-stone-500'} />
                                  <span className={`text-xs font-bold ${isSelected ? 'text-white' : 'text-stone-800'}`}>
                                    {seg.label}
                                  </span>
                                </div>
                                <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded font-medium ${
                                  isSelected ? 'bg-[#0b520a] text-stone-300' : 'bg-stone-100 text-stone-600'
                                }`}>
                                  {seg.count} {seg.count === 1 ? 'ped' : 'peds'}
                                </span>
                              </div>

                              <div className="mt-1.5">
                                <div className={`text-xl font-black font-mono tracking-tight leading-none ${
                                  isSelected ? 'text-white' : 'text-stone-900'
                                }`}>
                                  R$ {seg.ticket.toFixed(2)}
                                </div>
                                <div className={`text-[10.5px] font-mono mt-1 ${
                                  isSelected ? 'text-stone-400' : 'text-stone-500'
                                }`}>
                                  Total: R$ {seg.rev.toFixed(2)}
                                </div>
                              </div>
                            </button>
                          );
                        })}
                      </div>

                      {/* Barra de Informação Direta & Objetiva */}
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-1 px-1 text-[11px] text-stone-500 font-mono">
                        <div>
                          Mostrando pedidos de: <strong className="text-stone-900 font-bold">{currentTabName}</strong> ({currentTabOrders.length})
                        </div>
                        <div className="text-stone-400 text-[10px]">
                          Fórmula: Total (R$ {currentTabRev.toFixed(2)}) ÷ {currentTabOrders.length || 0} pedidos = <span className="text-stone-800 font-bold">R$ {currentTabTicket.toFixed(2)}</span>
                        </div>
                      </div>

                      {/* Tabela Limpa e Direta de Pedidos */}
                      <div className="border border-stone-200 rounded-xl overflow-hidden shadow-2xs bg-white">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="bg-stone-50 border-b border-stone-200 text-[10.5px] font-mono font-bold text-stone-500 uppercase tracking-wider">
                              <th className="py-2.5 px-3.5">Pedido</th>
                              <th className="py-2.5 px-3.5">Hora</th>
                              <th className="py-2.5 px-3.5">Cliente</th>
                              <th className="py-2.5 px-3.5">Operação</th>
                              <th className="py-2.5 px-3.5">Pagamento</th>
                              <th className="py-2.5 px-3.5 text-right">Valor</th>
                              <th className="py-2.5 px-3.5 text-center">Ações</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-stone-100 text-xs">
                            {currentTabOrders.map(o => {
                              const oType = normalizeOrderType(o.orderType || o.order_type);
                              return (
                                <tr key={o.id} className="hover:bg-stone-50/70 transition-colors">
                                  <td className="py-2 px-3.5 font-mono font-bold text-stone-900">#{o.id}</td>
                                  <td className="py-2 px-3.5 font-mono text-stone-600 text-[11px]">
                                    {new Date(o.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                  </td>
                                  <td className="py-2 px-3.5 font-medium text-stone-800">{o.customerName}</td>
                                  <td className="py-2 px-3.5">
                                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-stone-100 text-stone-700">
                                      {oType === 'mesa' ? 'Mesa' : oType === 'retirada' || oType === 'balcao' ? 'Retirada' : 'Entrega'}
                                    </span>
                                  </td>
                                  <td className="py-2 px-3.5 font-mono text-stone-600 text-[11px]">{o.paymentMethod}</td>
                                  <td className="py-2 px-3.5 text-right font-mono font-bold text-stone-900">R$ {Number(o.totalAmount || 0).toFixed(2)}</td>
                                  <td className="py-2 px-3.5 text-center">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setReportModal({isOpen: false, type: '', title: ''});
                                        setEditingOrder(o);
                                      }}
                                      className="px-2 py-0.5 text-[11px] font-medium text-stone-700 hover:text-stone-950 bg-stone-100 hover:bg-stone-200 rounded transition-colors cursor-pointer"
                                    >
                                      Detalhes
                                    </button>
                                  </td>
                                </tr>
                              );
                            })}
                            {currentTabOrders.length === 0 && (
                              <tr>
                                <td colSpan={7} className="py-8 text-center text-stone-400 font-medium">
                                  Nenhum pedido de {currentTabName} encontrado no período.
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                } else if (reportModal.type === 'pagamentos') {
                   const counts: Record<string, { count: number, rev: number }> = {};
                   filteredReportOrders.forEach(o => {
                      if (o.status === 'Cancelado' || o.status === 'cancelado') return;
                      const pm = o.paymentMethod || 'Outros';
                      counts[pm] = counts[pm] || {count: 0, rev: 0};
                      counts[pm].count++;
                      counts[pm].rev += Number(o.totalAmount || 0);
                   });
                   const sorted = Object.entries(counts).sort((a,b) => b[1].rev - a[1].rev);
                   const totalRev = sorted.reduce((acc, curr) => acc + curr[1].rev, 0);

                   return (
                    <div className="space-y-4">
                      <div className="flex justify-between items-center bg-stone-50 p-4 rounded-xl border border-stone-200">
                        <span className="font-bold text-stone-700 text-sm">Total Geral em Pagamentos:</span>
                        <span className="font-black text-xl font-mono text-emerald-700">R$ {totalRev.toFixed(2)}</span>
                      </div>
                      <div className="border border-stone-200 rounded-xl overflow-hidden shadow-xs">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="bg-stone-100 border-b border-stone-200 text-xs font-mono font-bold text-stone-700 uppercase">
                              <th className="py-3 px-4">Forma de Pagamento</th>
                              <th className="py-3 px-4 text-center">Nº de Pedidos</th>
                              <th className="py-3 px-4 text-right">Total Recebido</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-stone-100 text-sm">
                            {sorted.map(([pm, data], idx) => (
                              <tr key={idx} className="hover:bg-stone-50/80 transition-colors">
                                <td className="py-3 px-4 font-bold text-stone-900">{pm}</td>
                                <td className="py-3 px-4 text-center font-mono font-bold text-stone-600">{data.count} pedidos</td>
                                <td className="py-3 px-4 text-right font-mono font-bold text-emerald-700">R$ {data.rev.toFixed(2)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                   );
                }
                
                // Modal Padrão: Lista de Pedidos (Faturamento / Vendas 7 Dias / Vendas Mês / Fluxo de Caixa / Cancelamentos)
                const totalPeriodo = filteredReportOrders.reduce((acc, o) => acc + (Number(o.totalAmount) || 0), 0);
                return (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center bg-stone-50 p-4 rounded-xl border border-stone-200">
                      <span className="font-bold text-stone-700 text-sm">Total de Pedidos no Período ({filteredReportOrders.length}):</span>
                      <span className="font-black text-xl font-mono text-emerald-700">R$ {totalPeriodo.toFixed(2)}</span>
                    </div>
                    <div className="border border-stone-200 rounded-xl overflow-hidden shadow-xs">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-stone-100 border-b border-stone-200 text-xs font-mono font-bold text-stone-700 uppercase">
                            <th className="py-3 px-4">Pedido</th>
                            <th className="py-3 px-4">Data e Hora</th>
                            <th className="py-3 px-4">Cliente</th>
                            <th className="py-3 px-4">Status</th>
                            <th className="py-3 px-4 text-right">Valor Total</th>
                            <th className="py-3 px-4 text-center">Ações</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-stone-100 text-sm">
                          {filteredReportOrders.map(o => (
                            <tr key={o.id} className="hover:bg-stone-50/80 transition-colors">
                              <td className="py-3 px-4 font-mono font-bold text-stone-900">#{o.id}</td>
                              <td className="py-3 px-4 text-xs font-medium text-stone-600">
                                {new Date(o.createdAt).toLocaleString('pt-BR')}
                              </td>
                              <td className="py-3 px-4 font-semibold text-stone-800">{o.customerName}</td>
                              <td className="py-3 px-4">
                                <span className={`px-2.5 py-1 text-[11px] font-bold rounded-md ${
                                  o.status === 'Concluído' || o.status === 'entregue' ? 'bg-emerald-100 text-emerald-800' :
                                  o.status === 'Cancelado' || o.status === 'cancelado' ? 'bg-rose-100 text-rose-800' :
                                  'bg-amber-100 text-amber-800'
                                }`}>
                                  {o.status}
                                </span>
                              </td>
                              <td className="py-3 px-4 text-right font-mono font-bold text-emerald-700">R$ {Number(o.totalAmount || 0).toFixed(2)}</td>
                              <td className="py-3 px-4 text-center">
                                <div className="flex items-center justify-center gap-1.5">
                                  <button
                                    onClick={() => {
                                      setReportModal({isOpen: false, type: '', title: ''});
                                      setEditingOrder(o);
                                    }}
                                    className="px-2.5 py-1 text-xs font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg transition-colors cursor-pointer"
                                    title="Editar Pedido"
                                  >
                                    Editar
                                  </button>
                                  <button
                                    onClick={() => {
                                      setPrintOrder(o);
                                      setShowPrintPreview(true);
                                    }}
                                    className="px-2.5 py-1 text-xs font-bold text-stone-700 bg-stone-100 hover:bg-stone-200 border border-stone-300 rounded-lg transition-colors cursor-pointer"
                                    title="Imprimir Talão"
                                  >
                                    Imprimir
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                          {filteredReportOrders.length === 0 && (
                            <tr><td colSpan={6} className="py-8 text-center text-stone-400 font-medium">Nenhum pedido encontrado para este relatório.</td></tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })()}
            </div>

            <div className="p-4 border-t border-stone-200 bg-stone-50 flex justify-end">
              <button
                onClick={() => setReportModal({isOpen: false, type: '', title: ''})}
                className="px-5 py-2 bg-[#083d07] hover:bg-[#0b520a] text-white text-xs font-bold rounded-xl transition-colors cursor-pointer"
              >
                Fechar Relatório
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Print Preview Modal */}
      {showPrintPreview && printOrder && (
        <div 
          className="no-print" 
          style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.7)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}
          onClick={handleClosePrintPreview}
        >
          <div 
            style={{ backgroundColor: '#fff', borderRadius: '12px', maxHeight: '90vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', boxShadow: '0 25px 60px rgba(0,0,0,0.4)', width: '340px' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
              <span style={{ fontWeight: 'bold', fontSize: '16px', color: '#111', display: 'flex', alignItems: 'center', gap: '8px' }}><Printer size={18} /> Pré-visualização do Talão</span>
              <button onClick={handleClosePrintPreview} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', lineHeight: 1, display: 'flex', alignItems: 'center' }}><X size={20} /></button>
            </div>
            {/* Receipt Content */}
            <div style={{ padding: '10px 8px', flexGrow: 1, overflowY: 'auto' }}>
              <div className="print-receipt-content" style={{ fontFamily: 'Arial, Helvetica, sans-serif', color: '#000' }}>
                {/* Store Name + Order Type */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '4px' }}>
                  <h2 style={{ margin: 0, fontSize: '15px', fontWeight: '900' }}>DOBRO Pizzas</h2>
                  <span style={{ fontSize: '14px', fontWeight: '800' }}>
                    {printOrder.orderType === 'Delivery' || printOrder.orderType === 'entrega' ? 'ENTREGA' : 'RETIRADA'}
                  </span>
                </div>

                {/* Customer Name + Order ID (Black Bar) */}
                <div style={{ backgroundColor: '#000', color: '#fff', padding: '3px 6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <span style={{ fontSize: '14px', fontWeight: '900' }}>{printOrder.customerName}</span>
                  <span style={{ fontSize: '14px', fontWeight: '900' }}>#{printOrder.id}</span>
                </div>

                {/* Customer Info (Notes / Address) */}
                <div style={{ marginBottom: '6px' }}>
                  {printOrder.customerPhone && <p style={{ margin: '0 0 1px 0', fontSize: '11px', fontWeight: 'bold' }}>Tel: {printOrder.customerPhone}</p>}
                  {printOrder.nif && <p style={{ margin: '0 0 1px 0', fontSize: '11px', fontWeight: 'bold' }}>CPF: {printOrder.nif}</p>}
                  {(printOrder.orderType === 'Delivery' || printOrder.orderType === 'entrega') && printOrder.deliveryAddress && (
                    <>
                      <p style={{ margin: '2px 0 1px 0', fontSize: '11px', fontWeight: 'normal' }}>{printOrder.deliveryAddress}</p>
                      {printOrder.deliveryZone && <p style={{ margin: '0', fontSize: '11px', fontWeight: 'normal' }}>Zona: {printOrder.deliveryZone}</p>}
                    </>
                  )}
                </div>

                <div style={{ borderBottom: '1px solid #000', marginBottom: '6px' }}></div>

                {/* Order Items */}
                <div style={{ marginBottom: '6px' }}>
                  {safeParseItems(printOrder.items).map((item: any, idx: number) => (
                    <div key={idx} style={{ marginBottom: '6px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div style={{ flex: 1, paddingRight: '4px' }}>
                          <span style={{ fontSize: '14px', fontWeight: 'bold' }}>{item.quantity} x </span>
                          <span style={{ fontSize: '12px', fontWeight: 'normal' }}>{formatItemNameForPrint(item)}</span>
                        </div>
                        <span style={{ fontSize: '13px', fontWeight: '800', whiteSpace: 'nowrap' }}>
                          R$ {(((item.basePrice !== undefined ? item.basePrice : item.priceCalculated) || 0) * (item.quantity || 1)).toFixed(2)}
                        </span>
                      </div>
                      {item.extras && item.extras.length > 0 && item.extras.map((extra: any, extraIdx: number) => (
                        <div key={`${idx}-extra-${extraIdx}`} style={{ display: 'flex', justifyContent: 'space-between', paddingLeft: '8px', marginTop: '1px' }}>
                          <span style={{ fontSize: '10px', fontWeight: 'normal' }}>{extra.quantity > 1 ? `${extra.quantity}x ` : ''}{extra.name}</span>
                          <span style={{ fontSize: '10px', fontWeight: 'normal' }}>R$ {((extra.price || 0) * (item.quantity || 1)).toFixed(2)}</span>
                        </div>
                      ))}
                      {item.notes && (
                        <p style={{ margin: '2px 0 0 8px', fontSize: '10px', fontStyle: 'italic', fontWeight: 'bold' }}>Obs: {item.notes}</p>
                      )}
                    </div>
                  ))}
                </div>

                <div style={{ borderBottom: '1px solid #000', marginBottom: '6px' }}></div>

                {/* Totals Section */}
                {(() => {
                  const itemsSubtotal = safeParseItems(printOrder.items).reduce((sum: number, item: any) => {
                    const price = Number(item.priceCalculated ?? item.basePrice ?? item.price ?? 0);
                    const qty = Number(item.quantity || 1);
                    return sum + (price * qty);
                  }, 0);
                  const addAmount = Number(printOrder.additionalAmount || printOrder.additional_amount || 0);
                  const discAmount = Number(printOrder.discountAmount || printOrder.discount_amount || 0);
                  const isDelivery = printOrder.orderType === 'Delivery' || printOrder.orderType === 'entrega';
                  const deliveryFee = isDelivery ? Math.max(0, (printOrder.totalAmount || 0) - itemsSubtotal - addAmount + discAmount) : 0;
                  const reasonNote = printOrder.editReason || printOrder.edit_reason || '';

                  return (
                    <div style={{ marginBottom: '6px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontWeight: 'normal', marginBottom: '2px' }}>
                        <span>Subtotal</span>
                        <span>R$ {itemsSubtotal.toFixed(2)}</span>
                      </div>
                      {isDelivery && deliveryFee > 0 && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontWeight: 'normal', marginBottom: '2px' }}>
                          <span>Taxa de Entrega</span>
                          <span>R$ {deliveryFee.toFixed(2)}</span>
                        </div>
                      )}
                      {addAmount > 0 && (
                        <div style={{ marginBottom: '3px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontWeight: 'bold' }}>
                            <span>+ Taxa / Adicional</span>
                            <span>+ R$ {addAmount.toFixed(2)}</span>
                          </div>
                          {reasonNote && (
                            <div style={{ fontSize: '10px', fontStyle: 'italic', paddingLeft: '8px', color: '#333' }}>
                              Obs: {reasonNote}
                            </div>
                          )}
                        </div>
                      )}
                      {discAmount > 0 && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontWeight: 'bold', marginBottom: '2px' }}>
                          <span>- Desconto</span>
                          <span>- R$ {discAmount.toFixed(2)}</span>
                        </div>
                      )}
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: '900', marginTop: '3px', borderTop: '1px dashed #000', paddingTop: '3px' }}>
                        <span>Montante pago</span>
                        <span>R$ {(printOrder.totalAmount || 0).toFixed(2)}</span>
                      </div>
                    </div>
                  );
                })()}

                {/* Payment + Time */}
                <div style={{ fontSize: '10px' }}>
                  <p style={{ margin: '0 0 2px 0', fontWeight: 'normal' }}>Realizado a {new Date(printOrder.createdAt).toLocaleString('pt-BR')}</p>
                  <p style={{ margin: '0 0 2px 0', fontWeight: 'bold' }}>
                    {(printOrder.orderType === 'Delivery' || printOrder.orderType === 'entrega')
                      ? 'Entrega est.: 40 a 50 min'
                      : 'Recolher em: 25 a 35 min'}
                  </p>
                  <p style={{ margin: 0, fontWeight: 'normal' }}>Pagamento: {printOrder.paymentMethod}</p>
                  {printOrder.changeFor && <p style={{ margin: '1px 0 0 0', fontWeight: 'normal' }}>Troco para: R$ {printOrder.changeFor}</p>}
                </div>

                {/* Footer */}
                <div style={{ textAlign: 'center', marginTop: '8px', paddingTop: '4px', borderTop: '1px solid #000', fontSize: '10px', fontWeight: 'normal' }}>
                  <p style={{ margin: 0 }}>Obrigado por fazer um pedido de DOBRO Pizzas</p>
                </div>
              </div>
            </div>
            {/* Modal Actions */}
            <div style={{ padding: '12px 20px', borderTop: '1px solid #e5e7eb', display: 'flex', gap: '10px', flexShrink: 0 }}>
              <button
                onClick={handleConfirmPrint}
                style={{ flex: 1, backgroundColor: '#083d07', color: '#fff', border: 'none', borderRadius: '8px', padding: '10px', fontWeight: 'bold', fontSize: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
              >
                <Printer size={16} /> Imprimir
              </button>
              <button
                onClick={handleClosePrintPreview}
                style={{ flex: 1, backgroundColor: '#f3f4f6', color: '#374151', border: '1px solid #d1d5db', borderRadius: '8px', padding: '10px', fontWeight: 'bold', fontSize: '14px', cursor: 'pointer' }}
              >
                <X size={16} /> Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Hidden receipt for actual printing */}
      {printOrder && (
        <div className="print-only">
          <div className="print-receipt-content">
            {/* Store Name + Order Type */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '6px' }}>
              <h2 style={{ margin: 0, fontSize: '14pt', fontWeight: '900', letterSpacing: '0.5px' }}>DOBRO Pizzas</h2>
              <span style={{ fontSize: '12pt', fontWeight: '800' }}>
                {printOrder.orderType === 'Delivery' || printOrder.orderType === 'entrega' ? 'ENTREGA' : 'RETIRADA'}
              </span>
            </div>

            {/* Customer Name + Order ID (Black Bar) */}
            <div style={{ backgroundColor: '#000', color: '#fff', padding: '4px 8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '12pt', fontWeight: '900' }}>{printOrder.customerName}</span>
              <span style={{ fontSize: '12pt', fontWeight: '900' }}>#{printOrder.id}</span>
            </div>

            {/* Customer Info (Notes / Address) */}
            <div style={{ marginBottom: '8px' }}>
              {printOrder.customerPhone && <p style={{ margin: '0 0 2px 0', fontSize: '11pt', fontWeight: 'bold' }}>Tel: {printOrder.customerPhone}</p>}
              {printOrder.nif && <p style={{ margin: '0 0 2px 0', fontSize: '11pt', fontWeight: 'bold' }}>CPF: {printOrder.nif}</p>}
              {(printOrder.orderType === 'Delivery' || printOrder.orderType === 'entrega') && printOrder.deliveryAddress && (
                <>
                  <p style={{ margin: '3px 0 2px 0', fontSize: '10pt', fontWeight: 'normal' }}>{printOrder.deliveryAddress}</p>
                  {printOrder.deliveryZone && <p style={{ margin: '0', fontSize: '10pt', fontWeight: 'normal' }}>Zona: {printOrder.deliveryZone}</p>}
                </>
              )}
            </div>

            <div style={{ borderBottom: '1px solid #000', marginBottom: '8px' }}></div>

            {/* Order Items */}
            <div style={{ marginBottom: '8px' }}>
              {safeParseItems(printOrder.items).map((item: any, idx: number) => (
                <div key={idx} style={{ marginBottom: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ flex: 1, paddingRight: '6px' }}>
                      <span style={{ fontSize: '13pt', fontWeight: 'bold' }}>{item.quantity} x </span>
                      <span style={{ fontSize: '10pt', fontWeight: 'normal' }}>{formatItemNameForPrint(item)}</span>
                    </div>
                    <span style={{ fontSize: '12pt', fontWeight: '800', whiteSpace: 'nowrap' }}>
                      R$ {(((item.basePrice !== undefined ? item.basePrice : item.priceCalculated) || 0) * (item.quantity || 1)).toFixed(2)}
                    </span>
                  </div>
                  {item.extras && item.extras.length > 0 && item.extras.map((extra: any, extraIdx: number) => (
                    <div key={`${idx}-extra-${extraIdx}`} style={{ display: 'flex', justifyContent: 'space-between', paddingLeft: '10px', marginTop: '2px' }}>
                      <span style={{ fontSize: '10pt', fontWeight: 'normal' }}>{extra.quantity > 1 ? `${extra.quantity}x ` : ''}{extra.name}</span>
                      <span style={{ fontSize: '10pt', fontWeight: 'normal' }}>R$ {((extra.price || 0) * (item.quantity || 1)).toFixed(2)}</span>
                    </div>
                  ))}
                  {item.notes && (
                    <p style={{ margin: '3px 0 0 10px', fontSize: '10pt', fontStyle: 'italic', fontWeight: 'bold' }}>Obs: {item.notes}</p>
                  )}
                </div>
              ))}
            </div>

            <div style={{ borderBottom: '1px solid #000', marginBottom: '8px' }}></div>

            {/* Totals Section */}
            {(() => {
              const itemsSubtotal = safeParseItems(printOrder.items).reduce((sum: number, item: any) => {
                const price = Number(item.priceCalculated ?? item.basePrice ?? item.price ?? 0);
                const qty = Number(item.quantity || 1);
                return sum + (price * qty);
              }, 0);
              const addAmount = Number(printOrder.additionalAmount || printOrder.additional_amount || 0);
              const discAmount = Number(printOrder.discountAmount || printOrder.discount_amount || 0);
              const isDelivery = printOrder.orderType === 'Delivery' || printOrder.orderType === 'entrega';
              const deliveryFee = isDelivery ? Math.max(0, (printOrder.totalAmount || 0) - itemsSubtotal - addAmount + discAmount) : 0;
              const reasonNote = printOrder.editReason || printOrder.edit_reason || '';

              return (
                <div style={{ marginBottom: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11pt', fontWeight: 'normal', marginBottom: '3px' }}>
                    <span>Subtotal</span>
                    <span>R$ {itemsSubtotal.toFixed(2)}</span>
                  </div>
                  {isDelivery && deliveryFee > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11pt', fontWeight: 'normal', marginBottom: '3px' }}>
                      <span>Taxa de Entrega</span>
                      <span>R$ {deliveryFee.toFixed(2)}</span>
                    </div>
                  )}
                  {addAmount > 0 && (
                    <div style={{ marginBottom: '3px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11pt', fontWeight: 'bold' }}>
                        <span>+ Taxa / Adicional</span>
                        <span>+ R$ {addAmount.toFixed(2)}</span>
                      </div>
                      {reasonNote && (
                        <div style={{ fontSize: '10pt', fontStyle: 'italic', paddingLeft: '8px', color: '#000' }}>
                          Obs: {reasonNote}
                        </div>
                      )}
                    </div>
                  )}
                  {discAmount > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11pt', fontWeight: 'bold', marginBottom: '3px' }}>
                      <span>- Desconto</span>
                      <span>- R$ {discAmount.toFixed(2)}</span>
                    </div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11pt', fontWeight: '900', marginTop: '3px', borderTop: '1px dashed #000', paddingTop: '3px' }}>
                    <span>Montante pago</span>
                    <span>R$ {(printOrder.totalAmount || 0).toFixed(2)}</span>
                  </div>
                </div>
              );
            })()}

            {/* Payment + Time */}
            <div style={{ fontSize: '10pt' }}>
              <p style={{ margin: '0 0 3px 0', fontWeight: 'normal' }}>Realizado a {new Date(printOrder.createdAt).toLocaleString('pt-BR')}</p>
              <p style={{ margin: '0 0 3px 0', fontWeight: 'bold' }}>
                {(printOrder.orderType === 'Delivery' || printOrder.orderType === 'entrega')
                  ? 'Entrega est.: 40 a 50 min'
                  : 'Recolher em: 25 a 35 min'}
              </p>
              <p style={{ margin: 0, fontWeight: 'normal' }}>Pagamento: {printOrder.paymentMethod}</p>
              {printOrder.changeFor && <p style={{ margin: '2px 0 0 0', fontWeight: 'normal' }}>Troco para: R$ {printOrder.changeFor}</p>}
            </div>

            {/* Footer */}
            <div style={{ textAlign: 'center', marginTop: '10px', paddingTop: '6px', borderTop: '1px solid #000', fontSize: '10pt', fontWeight: 'normal' }}>
              <p style={{ margin: 0 }}>Obrigado por fazer um pedido de DOBRO Pizzas</p>
            </div>
          </div>
        </div>
      )}
    {editingOrder && (
      <EditOrderModal
        order={editingOrder}
        menuItems={menuItems && menuItems.length > 0 ? menuItems : ALL_MENU_ITEMS}
        onClose={() => setEditingOrder(null)}
        onSave={handleSaveOrderEdit}
      />
    )}

    {assigningDelivery && (
      <MotoboyAssignModal
        order={assigningDelivery.order}
        motoboys={motoboys}
        nextStatus={assigningDelivery.nextStatus}
        onClose={() => setAssigningDelivery(null)}
        onSaved={() => {
          setAssigningDelivery(null);
          fetchDashboardData(true);
        }}
      />
    )}

    {selectedSessionForDetails && (
      <CashSessionDetailsModal
        session={selectedSessionForDetails}
        onClose={() => setSelectedSessionForDetails(null)}
      />
    )}
    </>
  );
}

function EditOrderModal({ order, menuItems, onClose, onSave }: { order: any, menuItems: any[], onClose: () => void, onSave: (updatedOrder: any) => Promise<void> }) {
  const rawCustomerName = (order.customerName || order.customer_name || '').toString();
  const nifMatch = rawCustomerName.match(/\((?:NIF|CPF):\s*([^)]+)\)/i);
  const initialNif = (order.nif || (nifMatch ? nifMatch[1] : '')).toString().trim();
  const cleanName = rawCustomerName.replace(/\s*\((?:NIF|CPF):\s*[^)]+\)/i, '').trim();

  const [customerName, setCustomerName] = useState(cleanName);
  const [customerNif, setCustomerNif] = useState(initialNif);
  const [customerPhone, setCustomerPhone] = useState(order.customerPhone || order.customer_phone || '');
  const [deliveryAddress, setDeliveryAddress] = useState(order.deliveryAddress || order.delivery_address || '');
  const [deliveryZone, setDeliveryZone] = useState(order.deliveryZone || order.delivery_zone || '');
  const initialPm = (order.paymentMethod || order.payment_method || 'Dinheiro').toString().trim();
  const [paymentMethod, setPaymentMethod] = useState(initialPm.toLowerCase() === 'mbway' ? 'MB Way' : initialPm);
  const [orderType, setOrderType] = useState<string>(() => {
    const raw = (order.orderType || order.order_type || '').toString().toLowerCase().trim();
    if (raw === 'balcao' || raw === 'balcão') return 'balcao';
    if (raw === 'retirada' || raw === 'takeaway' || raw === 'recolha') return 'retirada';
    if (raw === 'mesa') return 'mesa';
    if (raw === 'entrega' || raw === 'delivery') return 'entrega';
    return normalizeOrderType(order.orderType || order.order_type);
  });

  const [zones, setZones] = useState<{ id: string; name: string; fee: number }[]>([]);
  const [loadingZones, setLoadingZones] = useState(false);

  const initialItemsSubtotal = React.useMemo(() => {
    let raw = order.items;
    if (typeof raw === 'string') {
      try { raw = JSON.parse(raw); } catch (e) { raw = []; }
    }
    if (!Array.isArray(raw)) return 0;
    return raw.reduce((acc: number, item: any) => {
      const price = Number(item.priceCalculated ?? item.basePrice ?? item.price ?? 0);
      const qty = Number(item.quantity || 1);
      return acc + (price * qty);
    }, 0);
  }, []);

  const [deliveryFee, setDeliveryFee] = useState<number>(() => {
    const raw = (order.orderType || order.order_type || '').toString().toLowerCase().trim();
    const isDel = raw === 'entrega' || raw === 'delivery';
    if (!isDel) return 0;
    const add = Number(order.additionalAmount || order.additional_amount || 0);
    const disc = Number(order.discountAmount || order.discount_amount || 0);
    const tot = Number(order.totalAmount || order.total_amount || 0);
    const feeDiff = Math.max(0, tot - initialItemsSubtotal - add + disc);
    return Number(feeDiff.toFixed(2));
  });

  useEffect(() => {
    const loadDeliveryZones = async () => {
      try {
        setLoadingZones(true);
        const { data, error } = await supabase
          .from('delivery_zones')
          .select('id, name, fee')
          .eq('is_active', true)
          .order('sort_order', { ascending: true });
        if (!error && data && data.length > 0) {
          const mapped = data.map((z: any) => ({
            id: z.id,
            name: z.name,
            fee: Number(z.fee || 0)
          }));
          setZones(mapped);

          // Se for entrega e tiver zona salva, mas deliveryFee for 0, sincroniza com o valor da zona
          const rawType = (order.orderType || order.order_type || '').toString().toLowerCase().trim();
          const isDel = rawType === 'entrega' || rawType === 'delivery';
          const currentZone = (order.deliveryZone || order.delivery_zone || '').toString().trim();
          if (isDel && currentZone) {
            const matched = mapped.find(z => z.name.toLowerCase() === currentZone.toLowerCase());
            if (matched && deliveryFee === 0) {
              setDeliveryFee(matched.fee);
            }
          }
        }
      } catch (err) {
        console.error('Erro ao carregar zonas de entrega:', err);
      } finally {
        setLoadingZones(false);
      }
    };
    loadDeliveryZones();
  }, []);

  const [items, setItems] = useState<any[]>(() => {
    let raw = order.items;
    if (typeof raw === 'string') {
      try { raw = JSON.parse(raw); } catch(e) { raw = []; }
    }
    if (Array.isArray(raw)) return JSON.parse(JSON.stringify(raw));
    return [];
  });

  const [discountAmount, setDiscountAmount] = useState<number>(order.discountAmount || order.discount_amount || 0);
  const [additionalAmount, setAdditionalAmount] = useState<number>(order.additionalAmount || order.additional_amount || 0);
  const [cashProvided, setCashProvided] = useState<number>(order.cashProvided || order.cash_provided || 0);
  const [editReason, setEditReason] = useState(order.editReason || order.edit_reason || '');
  
  const [selectedProductSearch, setSelectedProductSearch] = useState('');
  const [selectedProductId, setSelectedProductId] = useState('');
  const [customAdditionalFlavors, setCustomAdditionalFlavors] = useState<{ id: string; search: string }[]>([]);
  const [selectedSize, setSelectedSize] = useState('priceSingle');
  const [saving, setSaving] = useState(false);

  const subtotal = React.useMemo(() => {
    return items.reduce((acc, item) => {
      const price = Number(item.priceCalculated ?? item.basePrice ?? item.price ?? 0);
      const qty = Number(item.quantity || 1);
      return acc + (price * qty);
    }, 0);
  }, [items]);

  const activeDeliveryFee = orderType === 'entrega' ? Number(deliveryFee || 0) : 0;

  const finalTotal = React.useMemo(() => {
    const tot = subtotal + activeDeliveryFee + Number(additionalAmount || 0) - Number(discountAmount || 0);
    return Math.max(0, tot);
  }, [subtotal, activeDeliveryFee, additionalAmount, discountAmount]);

  const handleSelectOrderType = (newType: string) => {
    setOrderType(newType);
    if (newType !== 'entrega') {
      // Retirada, Balcão ou Mesa: Remove taxa de entrega na hora
      setDeliveryFee(0);
    } else {
      // Alternou para Entrega: se houver zona selecionada, restaura o valor correspondente
      if (deliveryZone) {
        const matched = zones.find(z => z.name.toLowerCase() === deliveryZone.toLowerCase());
        if (matched) {
          setDeliveryFee(matched.fee);
        }
      }
    }
  };

  const handleSelectZone = (selectedName: string) => {
    setDeliveryZone(selectedName);
    const matched = zones.find(z => z.name.toLowerCase() === selectedName.toLowerCase());
    if (matched) {
      setDeliveryFee(matched.fee);
    }
  };

  const calculatedChange = React.useMemo(() => {
    if (paymentMethod !== 'Dinheiro' || !cashProvided || cashProvided <= 0) return 0;
    return Math.max(0, cashProvided - finalTotal);
  }, [paymentMethod, cashProvided, finalTotal]);

  // Smart Search & Editing States (CRM Pattern)
  const [editingItemIndex, setEditingItemIndex] = useState<number | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'pizzas' | 'esfihas' | 'bebidas' | 'extras' | 'outros'>('all');
  const [searchingFlavorSlot, setSearchingFlavorSlot] = useState<number | null>(null);
  const [flavorSearchQuery, setFlavorSearchQuery] = useState('');
  const [isProductSearchOpen, setIsProductSearchOpen] = useState(false);
  const productSearchContainerRef = useRef<HTMLDivElement>(null);
  const flavorSearchInputRef = useRef<HTMLInputElement>(null);

  // Extras do Cardápio & Seleção Atual para o Item em Edição
  const [availableExtras, setAvailableExtras] = useState<ExtraIngredient[]>(pizzaExtras);
  const [selectedExtras, setSelectedExtras] = useState<ExtraIngredient[]>([]);

  useEffect(() => {
    let isMounted = true;
    const loadExtras = async () => {
      try {
        const { data, error } = await supabase
          .from('extras')
          .select('id, name, price')
          .eq('is_active', true)
          .order('sort_order');
        if (error) throw error;
        if (data && data.length > 0 && isMounted) {
          setAvailableExtras(data.map((e: any) => ({ id: e.id, name: e.name, price: Number(e.price) })));
        }
      } catch (err) {
        console.warn('[EditOrderModal] Não foi possível carregar extras:', err);
      }
    };
    loadExtras();
    return () => { isMounted = false; };
  }, []);

  const handleToggleExtra = (extra: ExtraIngredient) => {
    setSelectedExtras(prev => {
      const exists = prev.some(e => e.id === extra.id || e.name.toLowerCase() === extra.name.toLowerCase());
      if (exists) {
        return prev.filter(e => e.id !== extra.id && e.name.toLowerCase() !== extra.name.toLowerCase());
      } else {
        return [...prev, { id: extra.id, name: extra.name, price: Number(extra.price) || 0 }];
      }
    });
  };

  const getExtraIcon = (name: string) => {
    const n = (name || '').toLowerCase();
    if (n.includes('bacon')) return '🥓';
    if (n.includes('catupiry') || n.includes('requeijão')) return '🧀';
    if (n.includes('queijo') || n.includes('mozzarella') || n.includes('muçarela')) return '🧀';
    if (n.includes('cebola')) return '🧅';
    if (n.includes('cogumelo') || n.includes('champignon')) return '🍄';
    if (n.includes('azeitona')) return '🫒';
    if (n.includes('fiambre') || n.includes('presunto')) return '🍖';
    if (n.includes('milho')) return '🌽';
    if (n.includes('ovo')) return '🥚';
    if (n.includes('alho')) return '🧄';
    return '➕';
  };

  useEffect(() => {
    if (searchingFlavorSlot !== null) {
      const timer = setTimeout(() => {
        flavorSearchInputRef.current?.focus();
      }, 60);
      return () => clearTimeout(timer);
    }
  }, [searchingFlavorSlot]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (productSearchContainerRef.current && !productSearchContainerRef.current.contains(e.target as Node)) {
        setIsProductSearchOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Dismiss on ESC inside OrderEditorModal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (searchingFlavorSlot !== null) {
          setSearchingFlavorSlot(null);
          setFlavorSearchQuery('');
        } else if (isProductSearchOpen) {
          setIsProductSearchOpen(false);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [searchingFlavorSlot, isProductSearchOpen, onClose]);

  const isPizzaItem = (m: any) => {
    if (!m) return false;
    const id = (m.id || '').toLowerCase();
    const cat = (m.category || '').toLowerCase();
    return (
      id.startsWith('p-') ||
      cat.includes('pizza') ||
      ['tradicionais', 'especiais', 'gourmet', 'doces'].includes(cat) ||
      Boolean(m.priceG || m.priceBig || m.priceSuperBig)
    );
  };

  const isEsfihaItem = (m: any) => {
    if (!m) return false;
    const id = (m.id || '').toLowerCase();
    const cat = (m.category || '').toLowerCase();
    return id.startsWith('e-') || cat.includes('esfiha') || cat.includes('esfirra');
  };

  const isBebidaItem = (m: any) => {
    if (!m) return false;
    const id = (m.id || '').toLowerCase();
    const cat = (m.category || '').toLowerCase();
    return cat.includes('bebida') || cat.includes('refrigerante') || cat.includes('cerveja') || cat.includes('suco');
  };

  const pizzasList = React.useMemo(() => {
    return menuItems.filter(isPizzaItem);
  }, [menuItems]);

  const selectedBaseMenuItem = React.useMemo(() => {
    return menuItems.find(m => m.id === selectedProductId) || null;
  }, [menuItems, selectedProductId]);

  const isCurrentSelectionPizza = React.useMemo(() => {
    return isPizzaItem(selectedBaseMenuItem) || ['priceP', 'priceM', 'priceG', 'priceBig', 'priceSuperBig'].includes(selectedSize);
  }, [selectedBaseMenuItem, selectedSize]);

  const maxAdditionalFlavors = React.useMemo(() => {
    if (selectedSize === 'priceSuperBig') return 3;
    if (selectedSize === 'priceBig') return 2;
    if (selectedSize === 'priceG') return 1;
    return 0;
  }, [selectedSize]);

  const totalFlavors = 1 + customAdditionalFlavors.length;

  const getPizzaPriceForSize = (item: any, sizeKey: string) => {
    if (!item) return 0;
    if (sizeKey === 'priceP') return item.priceP || (item.priceM ? item.priceM - 2 : 0) || item.priceSingle || item.basePrice || item.price || 0;
    if (sizeKey === 'priceM') return item.priceM || item.priceSingle || item.basePrice || item.price || 0;
    if (sizeKey === 'priceG') return item.priceG || item.priceM || item.priceSingle || item.basePrice || item.price || 0;
    if (sizeKey === 'priceBig') return item.priceBig || item.priceG || item.priceSingle || item.basePrice || item.price || 0;
    if (sizeKey === 'priceSuperBig') return item.priceSuperBig || item.priceBig || item.priceG || item.priceSingle || item.basePrice || item.price || 0;
    return item.priceSingle || item.basePrice || item.price || 0;
  };

  const handleSelectSize = (sizeKey: string) => {
    setSelectedSize(sizeKey);
    let maxAdd = 0;
    if (sizeKey === 'priceSuperBig') maxAdd = 3;
    else if (sizeKey === 'priceBig') maxAdd = 2;
    else if (sizeKey === 'priceG') maxAdd = 1;

    if (customAdditionalFlavors.length > maxAdd) {
      setCustomAdditionalFlavors(prev => prev.slice(0, maxAdd));
    }
  };

  const handleSelectProduct = (m: any) => {
    if (m.isExtraItem && m.extraData) {
      if (editingItemIndex !== null || selectedProductId) {
        handleToggleExtra(m.extraData);
        setIsProductSearchOpen(false);
        return;
      }
    }

    setSelectedProductId(m.id);
    setSelectedProductSearch(m.name);
    setIsProductSearchOpen(false);

    if (isPizzaItem(m)) {
      if (selectedSize === 'priceSingle') {
        setSelectedSize(m.priceG ? 'priceG' : m.priceM ? 'priceM' : 'priceP');
      }
    } else {
      setSelectedSize('priceSingle');
      setCustomAdditionalFlavors([]);
    }
    setSearchingFlavorSlot(null);
  };

  const handleStartEditItem = (idx: number) => {
    const item = items[idx];
    if (!item) return;
    setEditingItemIndex(idx);

    // Carregar adicionais extras já existentes no item
    if (item.extras && Array.isArray(item.extras)) {
      setSelectedExtras(item.extras.map((e: any) => ({
        id: e.id || `ex-${e.name}`,
        name: e.name,
        price: Number(e.price) || 0
      })));
    } else if (item.selectedExtras && Array.isArray(item.selectedExtras)) {
      setSelectedExtras(item.selectedExtras.map((e: any) => ({
        id: e.id || `ex-${e.name}`,
        name: e.name,
        price: Number(e.price) || 0
      })));
    } else {
      setSelectedExtras([]);
    }

    const combinedSizeStr = `${item.size || ''} ${item.name || ''}`.toLowerCase();
    let sizeKey = 'priceSingle';
    if (combinedSizeStr.includes('super big') || combinedSizeStr.includes('4 sab')) sizeKey = 'priceSuperBig';
    else if (combinedSizeStr.includes('big') || combinedSizeStr.includes('3 sab')) sizeKey = 'priceBig';
    else if (combinedSizeStr.includes('grande') || combinedSizeStr.includes('(g)') || combinedSizeStr.includes('(gr)') || combinedSizeStr.includes('2 sab')) sizeKey = 'priceG';
    else if (combinedSizeStr.includes('média') || combinedSizeStr.includes('media') || combinedSizeStr.includes('(m)') || combinedSizeStr.includes('(md)')) sizeKey = 'priceM';
    else if (combinedSizeStr.includes('pequena') || combinedSizeStr.includes('(p)') || combinedSizeStr.includes('(pq)')) sizeKey = 'priceP';

    setSelectedSize(sizeKey);

    let baseItem = item.menuItem;
    const rawName = item.name || '';
    const extraFlavorsFound: { id: string; search: string }[] = [];

    if (!baseItem) {
      if (rawName.includes('+')) {
        const parts = rawName.split('+').map((p: string) => p.replace(/1\/\d+/g, '').replace(/\[.*?\]/g, '').replace(/\(.*?\)/g, '').replace(/^pizza\s+/i, '').replace(/^esfi(?:ha|rra)\s+/i, '').trim());
        if (parts[0]) {
          baseItem = menuItems.find(m => m.name.toLowerCase().includes(parts[0].toLowerCase()) || parts[0].toLowerCase().includes(m.name.toLowerCase()));
        }
        for (let pIdx = 1; pIdx < parts.length; pIdx++) {
          const pName = parts[pIdx];
          const matchExtra = menuItems.find(m => m.name.toLowerCase().includes(pName.toLowerCase()) || pName.toLowerCase().includes(m.name.toLowerCase()));
          if (matchExtra) {
            extraFlavorsFound.push({ id: matchExtra.id, search: matchExtra.name });
          } else if (pName) {
            extraFlavorsFound.push({ id: `custom-${pIdx}`, search: pName });
          }
        }
      } else {
        const cleanName = rawName.replace(/\[.*?\]/g, '').replace(/\(.*?\)/g, '').replace(/^pizza\s+/i, '').replace(/^esfi(?:ha|rra)\s+/i, '').trim();
        baseItem = menuItems.find(m => m.name.toLowerCase().includes(cleanName.toLowerCase()) || cleanName.toLowerCase().includes(m.name.toLowerCase()));
      }
    } else {
      if (item.additionalFlavors && Array.isArray(item.additionalFlavors)) {
        item.additionalFlavors.forEach((af: any) => {
          extraFlavorsFound.push({ id: af.id || af.name, search: af.name });
        });
      } else if (item.secondFlavor) {
        extraFlavorsFound.push({ id: item.secondFlavor.id || item.secondFlavor.name, search: item.secondFlavor.name });
      }
    }

    if (baseItem) {
      setSelectedProductId(baseItem.id);
      setSelectedProductSearch(baseItem.name);
    } else {
      setSelectedProductId(item.id || 'custom');
      setSelectedProductSearch(rawName);
    }

    setCustomAdditionalFlavors(extraFlavorsFound);
    setSearchingFlavorSlot(null);
    setFlavorSearchQuery('');
  };

  const handleCancelEdit = () => {
    setEditingItemIndex(null);
    setSelectedProductId('');
    setSelectedProductSearch('');
    setCustomAdditionalFlavors([]);
    setSelectedSize('priceSingle');
    setSearchingFlavorSlot(null);
    setFlavorSearchQuery('');
    setSelectedExtras([]);
  };

  const getFractionText = (slotIndex: number, total: number) => {
    if (total === 1) return '1/1 Único';
    if (total === 2) return `${slotIndex + 1}/2 Metade`;
    if (total === 3) return `${slotIndex + 1}/3 Terço`;
    if (total === 4) return `${slotIndex + 1}/4 Quarto`;
    return `${slotIndex + 1}º Sabor`;
  };

  const currentBasePrice = React.useMemo(() => {
    if (isCurrentSelectionPizza && selectedBaseMenuItem) {
      const extraFlavors = customAdditionalFlavors
        .filter(f => f.id || f.search)
        .map(f => menuItems.find(m => m.id === f.id) || { id: f.id, name: f.search, priceSingle: 0 });
      if (selectedSize === 'priceP') return getPizzaPriceForSize(selectedBaseMenuItem, 'priceP');
      if (selectedSize === 'priceM') return getPizzaPriceForSize(selectedBaseMenuItem, 'priceM');
      if (selectedSize === 'priceG') {
        const allPricesG = [getPizzaPriceForSize(selectedBaseMenuItem, 'priceG'), ...extraFlavors.map(f => getPizzaPriceForSize(f, 'priceG'))];
        return Math.max(...allPricesG) || getPizzaPriceForSize(selectedBaseMenuItem, 'priceG');
      }
      if (selectedSize === 'priceBig') {
        const allPricesBig = [getPizzaPriceForSize(selectedBaseMenuItem, 'priceBig'), ...extraFlavors.map(f => getPizzaPriceForSize(f, 'priceBig'))];
        return Math.max(...allPricesBig) || getPizzaPriceForSize(selectedBaseMenuItem, 'priceBig');
      }
      if (selectedSize === 'priceSuperBig') {
        const allPricesSB = [getPizzaPriceForSize(selectedBaseMenuItem, 'priceSuperBig'), ...extraFlavors.map(f => getPizzaPriceForSize(f, 'priceSuperBig'))];
        return Math.max(...allPricesSB) || getPizzaPriceForSize(selectedBaseMenuItem, 'priceSuperBig');
      }
    }
    if (editingItemIndex !== null && items[editingItemIndex]) {
      const it = items[editingItemIndex];
      const prevExtrasSum = (it.extras || []).reduce((s: number, e: any) => s + (Number(e.price) || 0), 0);
      return it.basePrice ?? (it.priceCalculated ? it.priceCalculated - prevExtrasSum : it.price ?? 0);
    }
    return selectedBaseMenuItem?.priceSingle || selectedBaseMenuItem?.price || 0;
  }, [isCurrentSelectionPizza, selectedBaseMenuItem, selectedSize, customAdditionalFlavors, editingItemIndex, items]);

  const currentExtrasTotal = React.useMemo(() => {
    return selectedExtras.reduce((sum, e) => sum + (Number(e.price) || 0), 0);
  }, [selectedExtras]);

  const currentItemFinalPrice = currentBasePrice + currentExtrasTotal;

  const handleAddItem = () => {
    if (!selectedProductId && !selectedProductSearch.trim() && editingItemIndex === null) return;
    const menuItem = menuItems.find(m => m.id === selectedProductId) || {
      id: selectedProductId || `custom-${Date.now()}`,
      name: selectedProductSearch.trim() || (editingItemIndex !== null ? items[editingItemIndex]?.name : ''),
      priceSingle: 0
    };

    const extraFlavors = customAdditionalFlavors
      .filter(f => f.id || f.search)
      .map(f => menuItems.find(m => m.id === f.id) || { id: f.id, name: f.search, priceSingle: 0 });

    const totalFlavors = 1 + extraFlavors.length;

    let basePrice = getPizzaPriceForSize(menuItem, selectedSize);
    let sizeName = 'Único';
    if (selectedSize === 'priceP') { basePrice = getPizzaPriceForSize(menuItem, 'priceP'); sizeName = 'Pequena (P)'; }
    else if (selectedSize === 'priceM') { basePrice = getPizzaPriceForSize(menuItem, 'priceM'); sizeName = 'Média (M)'; }
    else if (selectedSize === 'priceG') {
      const allPricesG = [getPizzaPriceForSize(menuItem, 'priceG'), ...extraFlavors.map(f => getPizzaPriceForSize(f, 'priceG'))];
      basePrice = Math.max(...allPricesG) || basePrice;
      sizeName = 'Grande (G)';
    } else if (selectedSize === 'priceBig') {
      const allPricesBig = [getPizzaPriceForSize(menuItem, 'priceBig'), ...extraFlavors.map(f => getPizzaPriceForSize(f, 'priceBig'))];
      basePrice = Math.max(...allPricesBig) || basePrice;
      sizeName = 'Big';
    } else if (selectedSize === 'priceSuperBig') {
      const allPricesSB = [getPizzaPriceForSize(menuItem, 'priceSuperBig'), ...extraFlavors.map(f => getPizzaPriceForSize(f, 'priceSuperBig'))];
      basePrice = Math.max(...allPricesSB) || basePrice;
      sizeName = 'Super Big';
    }

    if (basePrice === 0 && editingItemIndex !== null) {
      const prevItem = items[editingItemIndex];
      const prevExtrasSum = (prevItem.extras || []).reduce((s: number, e: any) => s + (Number(e.price) || 0), 0);
      basePrice = prevItem.basePrice ?? (prevItem.priceCalculated ? prevItem.priceCalculated - prevExtrasSum : prevItem.price ?? 0);
    }

    const extrasTotalPrice = selectedExtras.reduce((sum, e) => sum + (Number(e.price) || 0), 0);
    const finalPriceWithExtras = Number((basePrice + extrasTotalPrice).toFixed(2));

    let itemName = menuItem.name;
    if (extraFlavors.length > 0) {
      const fraction = `1/${totalFlavors}`;
      const allNames = [menuItem, ...extraFlavors].map(f => `${fraction} ${f.name}`);
      itemName = allNames.join(' + ');
    }

    const newItem = {
      menuItem: menuItem,
      name: itemName,
      quantity: editingItemIndex !== null ? (items[editingItemIndex]?.quantity || 1) : 1,
      size: sizeName,
      basePrice: basePrice,
      priceCalculated: finalPriceWithExtras,
      price: finalPriceWithExtras,
      extras: selectedExtras.map(e => ({ id: e.id, name: e.name, price: Number(e.price) || 0 })),
      additionalFlavors: extraFlavors
    };

    if (editingItemIndex !== null) {
      setItems(prev => {
        const copy = [...prev];
        copy[editingItemIndex] = {
          ...copy[editingItemIndex],
          ...newItem,
          quantity: copy[editingItemIndex].quantity || 1
        };
        return copy;
      });
      setEditingItemIndex(null);
    } else {
      setItems(prev => [...prev, newItem]);
    }

    setSelectedProductId('');
    setSelectedProductSearch('');
    setCustomAdditionalFlavors([]);
    setSelectedSize('priceSingle');
    setSearchingFlavorSlot(null);
    setFlavorSearchQuery('');
    setSelectedExtras([]);
  };

  const handleUpdateQty = (index: number, delta: number) => {
    setItems(prev => {
      const updated = [...prev];
      const newQty = (updated[index].quantity || 1) + delta;
      if (newQty <= 0) {
        return updated.filter((_, i) => i !== index);
      }
      updated[index].quantity = newQty;
      return updated;
    });
  };

  const handleRemoveItem = (index: number) => {
    setItems(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const finalCustomerName = customerNif.trim() 
      ? `${customerName.trim()} (CPF: ${customerNif.trim()})`
      : customerName.trim();

    const updatedPayload = {
      ...order,
      customer_name: finalCustomerName,
      customerName: finalCustomerName,
      nif: customerNif.trim() || null,
      customer_phone: customerPhone,
      order_type: orderType,
      orderType: orderType,
      payment_method: paymentMethod,
      paymentMethod: paymentMethod,
      delivery_address: orderType === 'entrega' ? deliveryAddress : '',
      deliveryAddress: orderType === 'entrega' ? deliveryAddress : '',
      delivery_zone: orderType === 'entrega' ? deliveryZone : '',
      deliveryZone: orderType === 'entrega' ? deliveryZone : '',
      items: items,
      discount_amount: Number(discountAmount) || 0,
      additional_amount: Number(additionalAmount) || 0,
      discountAmount: Number(discountAmount) || 0,
      additionalAmount: Number(additionalAmount) || 0,
      total_amount: finalTotal,
      totalAmount: finalTotal,
      cash_provided: Number(cashProvided) || 0,
      cashProvided: Number(cashProvided) || 0,
      edit_reason: editReason,
      editReason: editReason,
      is_edited: true,
      isEdited: true
    };
    await onSave(updatedPayload);
    setSaving(false);
  };

  const filteredMenuItems = React.useMemo(() => {
    const q = selectedProductSearch.toLowerCase().trim();
    let list = menuItems.filter(m => {
      if (categoryFilter === 'pizzas' && !isPizzaItem(m)) return false;
      if (categoryFilter === 'esfihas' && !isEsfihaItem(m)) return false;
      if (categoryFilter === 'bebidas' && !isBebidaItem(m)) return false;
      if (categoryFilter === 'extras') return false;
      if (categoryFilter === 'outros' && (isPizzaItem(m) || isEsfihaItem(m) || isBebidaItem(m))) return false;

      // When a pizza size is active, only allow pizzas!
      if (['priceP', 'priceM', 'priceG', 'priceBig', 'priceSuperBig'].includes(selectedSize) && !isPizzaItem(m)) {
        return false;
      }

      if (!q) return true;
      return m.name.toLowerCase().includes(q) || (m.ingredients && m.ingredients.toLowerCase().includes(q));
    });

    if (categoryFilter === 'extras' || (categoryFilter === 'all' && q.length > 0)) {
      const extraItems = availableExtras
        .filter(ex => !q || ex.name.toLowerCase().includes(q))
        .map(ex => ({
          id: ex.id,
          name: ex.name,
          priceSingle: ex.price,
          category: 'extras',
          isExtraItem: true,
          extraData: ex
        }));
      list = [...list, ...extraItems];
    }

    return list;
  }, [menuItems, availableExtras, selectedProductSearch, categoryFilter, selectedSize]);

  const filteredSlotPizzas = React.useMemo(() => {
    const q = flavorSearchQuery.toLowerCase().trim();
    return pizzasList.filter(p => {
      if (p.id === selectedProductId) return false;
      const isAlreadyChosen = customAdditionalFlavors.some((f, idx) => idx !== searchingFlavorSlot && f.id === p.id);
      if (isAlreadyChosen) return false;
      if (!q) return true;
      return p.name.toLowerCase().includes(q) || (p.ingredients && p.ingredients.toLowerCase().includes(q));
    });
  }, [pizzasList, selectedProductId, customAdditionalFlavors, searchingFlavorSlot, flavorSearchQuery]);

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/70 backdrop-blur-xs"
      onClick={onClose}
    >
      <div 
        className="bg-stone-100 rounded-xl w-full max-w-xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden border border-[#0b520a]"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Header Compacto */}
        <div className="px-3.5 py-2 bg-[#e5ddd4] text-[#44210f] flex justify-between items-center shrink-0">
          <div className="flex items-center gap-2">
            <div className="p-1 bg-[#0b520a] text-rose-500 rounded border border-stone-700">
              <Edit3 size={14} />
            </div>
            <div>
              <h3 className="font-extrabold text-xs leading-tight text-[#44210f] tracking-tight">Editar Pedido #{order.id}</h3>
              <p className="text-[9px] text-[#745240] font-medium leading-none mt-0.5">Altere produtos, valores e forma de pagamento</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-stone-400 hover:text-white bg-[#083d07] hover:bg-rose-600 rounded transition-colors cursor-pointer border border-[#0b520a] hover:border-rose-500"
          >
            <X size={14} />
          </button>
        </div>

        {/* Real-time total summary bar Compacto */}
        <div className="bg-[#E8D8D1] px-3.5 py-1.5 border-b border-[#D5AF7A] flex items-center justify-between text-xs text-[#083D07] font-bold shrink-0">
          <div className="flex items-center gap-2.5 font-mono text-[10px] flex-wrap">
            <span className="text-stone-300">
              Subtotal: <strong className="text-white font-bold">R$ {subtotal.toFixed(2)}</strong>
            </span>
            {orderType === 'entrega' && activeDeliveryFee > 0 && (
              <span className="text-sky-400 font-semibold">
                (+) Ent: R$ {activeDeliveryFee.toFixed(2)}
              </span>
            )}
            {Number(additionalAmount) > 0 && (
              <span className="text-amber-400 font-semibold">
                (+) Adic: R$ {Number(additionalAmount).toFixed(2)}
              </span>
            )}
            {Number(discountAmount) > 0 && (
              <span className="text-emerald-400 font-semibold">
                (-) Desc: R$ {Number(discountAmount).toFixed(2)}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <span className="text-[9px] font-mono text-stone-400 uppercase">Total:</span>
            <span className="text-sm font-black text-rose-500 font-mono leading-none">R$ {finalTotal.toFixed(2)}</span>
          </div>
        </div>

        {/* Form Body com Conteúdo Otimizado */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-3 py-2 space-y-2 flex flex-col justify-between">
          <div className="space-y-2">
            {/* Section 1: Customer Info & 1-Click Order Type */}
            <div className="bg-white p-2.5 rounded-lg border border-stone-200/90 shadow-2xs space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-[9px] font-mono font-bold text-stone-400 uppercase tracking-wider">
                  Cliente & Atendimento
                </h4>
                {orderType === 'entrega' && activeDeliveryFee > 0 && (
                  <span className="text-[10px] font-mono font-bold text-sky-700 bg-sky-50 px-2 py-0.5 rounded border border-sky-200">
                    + R$ {activeDeliveryFee.toFixed(2)} Taxa de Entrega
                  </span>
                )}
              </div>

              {/* Linha 1: Dados do Cliente e Pagamento */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-1.5">
                <div className="space-y-0.5">
                  <label className="block text-[8px] font-mono font-bold text-stone-500 uppercase tracking-wider">Nome</label>
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full px-2 py-1 bg-stone-50 rounded border border-stone-200 text-[11px] font-bold text-stone-900 outline-none focus:border-[#083d07] focus:bg-white transition-colors"
                    required
                  />
                </div>
                <div className="space-y-0.5">
                  <label className="block text-[8px] font-mono font-bold text-stone-500 uppercase tracking-wider">Telefone</label>
                  <input
                    type="text"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    className="w-full px-2 py-1 bg-stone-50 rounded border border-stone-200 text-[11px] font-bold text-stone-900 outline-none focus:border-[#083d07] focus:bg-white transition-colors"
                  />
                </div>
                <div className="space-y-0.5">
                  <label className="block text-[8px] font-mono font-bold text-stone-500 uppercase tracking-wider">CPF na nota (Opcional)</label>
                  <input
                    type="text"
                    value={customerNif}
                    onChange={(e) => setCustomerNif(e.target.value)}
                    placeholder="Ex: 123456789"
                    className="w-full px-2 py-1 bg-stone-50 rounded border border-stone-200 text-[11px] font-bold text-stone-900 outline-none focus:border-[#083d07] focus:bg-white transition-colors font-mono"
                  />
                </div>
                <div className="space-y-0.5">
                  <label className="block text-[8px] font-mono font-bold text-stone-500 uppercase tracking-wider">Pagamento</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full px-2 py-1 bg-stone-50 rounded border border-stone-200 text-[11px] font-bold text-stone-900 outline-none focus:border-[#083d07] focus:bg-white transition-colors cursor-pointer"
                  >
                    <option value="MB Way">MB Way</option>
                    <option value="Dinheiro">Dinheiro (Numerário)</option>
                    <option value="Cartão">Cartão (Multibanco)</option>
                  </select>
                </div>
              </div>

              {/* Linha 2: Tipo de Atendimento em 1 CLIQUE */}
              <div className="space-y-1 pt-1.5 border-t border-stone-100">
                <label className="block text-[8px] font-mono font-bold text-stone-500 uppercase tracking-wider">
                  Tipo de Pedido (1 Clique para alterar)
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                  {[
                    { key: 'entrega', label: 'Entrega', icon: Bike, desc: 'Delivery' },
                    { key: 'retirada', label: 'Retirada', icon: ShoppingBag, desc: 'Takeaway' },
                    { key: 'balcao', label: 'Balcão', icon: Store, desc: 'Balcão' },
                    { key: 'mesa', label: 'Mesa', icon: UtensilsCrossed, desc: 'Consumo Local' }
                  ].map((btn) => {
                    const isSelected = orderType === btn.key;
                    const IconComp = btn.icon;
                    return (
                      <button
                        key={btn.key}
                        type="button"
                        onClick={() => handleSelectOrderType(btn.key)}
                        className={`py-1.5 px-2 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer border text-center ${
                          isSelected
                            ? btn.key === 'entrega'
                              ? 'bg-sky-600 text-white font-black border-sky-700 shadow-xs ring-2 ring-sky-300'
                              : 'bg-[#083d07] text-white font-black border-[#062b06] shadow-xs ring-2 ring-stone-300'
                            : 'bg-stone-50 text-stone-700 font-bold border-stone-200 hover:bg-stone-100'
                        }`}
                      >
                        <IconComp size={13} className={isSelected ? 'text-white' : 'text-stone-500'} />
                        <span className="text-[11px]">{btn.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Se for Entrega: Morada, Seleção de Zonas Cadastradas e Taxa Automática */}
              {orderType === 'entrega' && (
                <div className="pt-2 border-t border-stone-100 space-y-2 bg-sky-50/50 p-2 rounded-lg border border-sky-100">
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                    {/* Endereço / Morada */}
                    <div className="sm:col-span-6 space-y-0.5">
                      <label className="block text-[8px] font-mono font-bold text-sky-950 uppercase tracking-wider flex items-center gap-1">
                        <MapPin size={11} className="text-sky-600" /> Morada / Endereço de Entrega
                      </label>
                      <input
                        type="text"
                        value={deliveryAddress}
                        onChange={(e) => setDeliveryAddress(e.target.value)}
                        className="w-full px-2 py-1.5 bg-white rounded border border-sky-200 text-xs font-semibold text-stone-900 outline-none focus:border-sky-600 transition-colors shadow-2xs"
                        placeholder="Rua, número, andar, código postal, pontos de ref..."
                        required={orderType === 'entrega'}
                      />
                    </div>

                    {/* Zona de Entrega (Select com Todas as Zonas Cadastradas) */}
                    <div className="sm:col-span-4 space-y-0.5">
                      <label className="block text-[8px] font-mono font-bold text-sky-950 uppercase tracking-wider flex items-center justify-between">
                        <span>Zona de Entrega</span>
                        {loadingZones && <span className="text-[7.5px] text-sky-600 font-normal">Carregando...</span>}
                      </label>
                      <select
                        value={deliveryZone}
                        onChange={(e) => handleSelectZone(e.target.value)}
                        className="w-full px-2 py-1.5 bg-white rounded border border-sky-200 text-xs font-bold text-stone-900 outline-none focus:border-sky-600 transition-colors cursor-pointer shadow-2xs"
                      >
                        <option value="">-- Selecione a Zona --</option>
                        {zones.map((z) => (
                          <option key={z.id} value={z.name}>
                            {z.name} (+ R$ {z.fee.toFixed(2)})
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Taxa de Entrega (R$) */}
                    <div className="sm:col-span-2 space-y-0.5">
                      <label className="block text-[8px] font-mono font-bold text-sky-950 uppercase tracking-wider text-center">
                        Taxa (R$)
                      </label>
                      <input
                        type="number"
                        step="0.50"
                        min="0"
                        value={deliveryFee}
                        onChange={(e) => setDeliveryFee(parseFloat(e.target.value) || 0)}
                        className="w-full px-2 py-1.5 bg-white rounded border border-sky-200 text-xs font-black text-sky-800 outline-none focus:border-sky-600 transition-colors font-mono text-center shadow-2xs"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-sky-900 font-medium px-1">
                    <span>
                      {deliveryZone ? (
                        <>Zona: <strong>{deliveryZone}</strong></>
                      ) : (
                        <span className="text-amber-800 font-semibold">⚠️ Selecione uma zona para somar a taxa</span>
                      )}
                    </span>
                    <span className="font-mono font-bold text-sky-800">
                      Taxa somada no total: + R$ {activeDeliveryFee.toFixed(2)}
                    </span>
                  </div>
                </div>
              )}

              {/* Se Pagamento em Dinheiro: Campo de Troco */}
              {paymentMethod === 'Dinheiro' && (
                <div className="pt-1.5 border-t border-stone-100 grid grid-cols-2 gap-2">
                  <div className="space-y-0.5">
                    <label className="block text-[8px] font-mono font-bold text-stone-500 uppercase tracking-wider">Troco Para (R$)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={cashProvided || ''}
                      onChange={(e) => setCashProvided(parseFloat(e.target.value) || 0)}
                      className="w-full px-2 py-1 bg-stone-50 rounded border border-stone-200 text-xs font-bold text-stone-900 outline-none focus:border-[#083d07] focus:bg-white transition-colors"
                      placeholder="Ex: 50.00"
                    />
                  </div>
                  <div className="flex items-center justify-between bg-stone-50 px-2 py-1 rounded border border-stone-100">
                    <span className="text-[8px] font-mono font-bold text-stone-500 uppercase tracking-wider">Troco:</span>
                    <span className="text-xs font-black text-emerald-600">R$ {calculatedChange.toFixed(2)}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Section 2: Items List & Add Items */}
            <div className="space-y-1.5 bg-white p-2 rounded-lg border border-stone-200/90 shadow-2xs">
              <div className="flex justify-between items-center">
                <h4 className="text-[9px] font-mono font-bold text-stone-400 uppercase tracking-wider">Itens do Pedido ({items.length})</h4>
              </div>

              {/* Current Items Table Compacto */}
              <div className="border border-stone-200/80 rounded overflow-hidden bg-stone-50/60 max-h-36 overflow-y-auto">
                {items.length === 0 ? (
                  <div className="p-2 text-center text-xs text-stone-400">Nenhum item no pedido.</div>
                ) : (
                  <div className="divide-y divide-stone-100">
                    {items.map((item, idx) => {
                      const price = Number(item.priceCalculated || item.price || 0);
                      const qty = Number(item.quantity || 1);
                      return (
                        <div key={idx} className="px-2 py-1.5 flex items-center justify-between gap-2 bg-white hover:bg-stone-50 transition-colors">
                          <div className="flex-1 min-w-0">
                            <div className="font-bold text-xs text-stone-900 truncate">{formatItemNameForPrint(item)}</div>
                            <div className="text-[9px] text-stone-400 font-medium">
                              {item.size ? `${item.size} | ` : ''}R$ {price.toFixed(2)} un.
                            </div>
                            {/* Tags de Extras Adicionados */}
                            {item.extras && item.extras.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-0.5">
                                {item.extras.map((ex: any, exIdx: number) => (
                                  <span
                                    key={exIdx}
                                    className="text-[8.5px] font-bold bg-rose-50 text-rose-700 border border-rose-200 px-1.5 py-0.2 rounded flex items-center gap-0.5 shadow-2xs"
                                  >
                                    <span>+{ex.name}</span>
                                    <span className="font-mono text-[8px] text-rose-800">(R$ {Number(ex.price).toFixed(2)})</span>
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* Qty Controls */}
                          <div className="flex items-center gap-0.5 bg-stone-100 px-1 py-0.5 rounded border border-stone-200">
                            <button
                              type="button"
                              onClick={() => handleUpdateQty(idx, -1)}
                              className="w-4 h-4 rounded bg-white text-stone-800 font-bold text-[10px] flex items-center justify-center border border-stone-200 hover:bg-stone-50 transition-colors cursor-pointer"
                            >
                              -
                            </button>
                            <span className="w-5 text-center text-xs font-bold text-stone-900">{qty}</span>
                            <button
                              type="button"
                              onClick={() => handleUpdateQty(idx, 1)}
                              className="w-4 h-4 rounded bg-white text-stone-800 font-bold text-[10px] flex items-center justify-center border border-stone-200 hover:bg-stone-50 transition-colors cursor-pointer"
                            >
                              +
                            </button>
                          </div>

                          <div className="font-bold text-xs text-stone-900 w-14 text-right font-mono">
                            R$ {(price * qty).toFixed(2)}
                          </div>

                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleStartEditItem(idx)}
                              className={`p-1 rounded transition-colors cursor-pointer ${
                                editingItemIndex === idx
                                  ? 'bg-amber-100 text-amber-900 border border-amber-300'
                                  : 'text-stone-400 hover:text-amber-600 hover:bg-amber-50'
                              }`}
                              title="Editar este item"
                            >
                              <Edit2 size={12} />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                if (editingItemIndex === idx) handleCancelEdit();
                                handleRemoveItem(idx);
                              }}
                              className="p-1 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                              title="Remover Item"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Add/Edit Product Block CRM Style */}
              <div className="p-2 bg-stone-50 rounded-lg border border-stone-200/90 space-y-2">
                {/* Active Edit Banner */}
                {editingItemIndex !== null && (
                  <div className="flex items-center justify-between px-2 py-1 bg-amber-100 border border-amber-300 rounded text-amber-900 text-[11px] font-bold">
                    <span className="flex items-center gap-1.5">
                      <Edit2 size={12} className="text-amber-700" />
                      Editando Item #{editingItemIndex + 1}
                    </span>
                    <button
                      type="button"
                      onClick={handleCancelEdit}
                      className="text-[10px] text-amber-800 hover:text-amber-950 font-bold underline cursor-pointer"
                    >
                      Cancelar Edição
                    </button>
                  </div>
                )}

                {/* Category Filter Pills */}
                <div className="flex items-center gap-1 overflow-x-auto pb-0.5">
                  {[
                    { id: 'all', label: 'Todos' },
                    { id: 'pizzas', label: '🍕 Pizzas' },
                    { id: 'esfihas', label: '🥟 Esfihas' },
                    { id: 'bebidas', label: '🥤 Bebidas' },
                    { id: 'extras', label: '🥓 Extras' },
                    { id: 'outros', label: '🍟 Outros' }
                  ].map(cat => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setCategoryFilter(cat.id as any)}
                      className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all shrink-0 cursor-pointer border ${
                        categoryFilter === cat.id
                          ? 'bg-[#083d07] text-white border-[#083d07] shadow-xs'
                          : 'bg-white text-stone-600 border-stone-200 hover:bg-stone-100'
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>

                {/* Smart Product Search Combobox */}
                <div ref={productSearchContainerRef} className="relative">
                  <div className="relative">
                    <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-stone-400" />
                    <input
                      type="text"
                      value={selectedProductSearch}
                      onFocus={() => setIsProductSearchOpen(true)}
                      onChange={(e) => {
                        setSelectedProductSearch(e.target.value);
                        setIsProductSearchOpen(true);
                        if (!e.target.value) {
                          setSelectedProductId('');
                        }
                      }}
                      placeholder={categoryFilter === 'pizzas' ? "Buscar pizza por nome ou número..." : categoryFilter === 'extras' ? "Pesquisar adicional extra (bacon, queijo...)" : "Pesquisar sabor, produto ou adicional extra..."}
                      className="w-full pl-7 pr-7 py-1.5 bg-white rounded-lg border border-stone-200 text-xs font-bold text-stone-900 outline-none focus:border-[#083d07] focus:ring-1 focus:ring-[#083d07] transition-all"
                    />
                    {selectedProductSearch && (
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedProductSearch('');
                          setSelectedProductId('');
                          setIsProductSearchOpen(false);
                        }}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 text-xs font-bold"
                      >
                        ✕
                      </button>
                    )}
                  </div>

                  {/* Autocomplete dropdown */}
                  {isProductSearchOpen && (
                    <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-stone-300 rounded-lg shadow-xl z-40 max-h-48 overflow-y-auto divide-y divide-stone-100">
                      {filteredMenuItems.length === 0 ? (
                        <div className="p-2.5 text-center text-xs text-stone-400">
                          Nenhum produto ou adicional encontrado.
                        </div>
                      ) : (
                        filteredMenuItems.map(m => {
                          const isP = isPizzaItem(m);
                          const isEx = Boolean(m.isExtraItem);
                          const displayPrice = isP
                            ? (m.priceG || m.priceM || m.priceSingle || 0)
                            : (m.priceSingle || m.price || 0);
                          const isSelectedExtra = isEx && selectedExtras.some(e => e.id === m.id || e.name.toLowerCase() === m.name.toLowerCase());
                          return (
                            <div
                              key={m.id}
                              onClick={() => handleSelectProduct(m)}
                              className={`p-2 text-xs cursor-pointer flex items-center justify-between hover:bg-stone-50 transition-colors ${
                                selectedProductId === m.id || isSelectedExtra ? 'bg-amber-50/60 font-bold' : ''
                              }`}
                            >
                              <div className="flex-1 min-w-0 pr-2">
                                <div className="font-bold text-stone-900 truncate flex items-center gap-1.5">
                                  {isP && <span className="text-[10px]">🍕</span>}
                                  {isEx && <span className="text-[10px]">{getExtraIcon(m.name)}</span>}
                                  <span>{m.name}</span>
                                  {isEx && (
                                    <span className="text-[9px] font-bold text-rose-600 bg-rose-50 px-1 rounded border border-rose-200">
                                      Adicional Extra
                                    </span>
                                  )}
                                </div>
                                {m.ingredients && (
                                  <div className="text-[10px] text-stone-400 truncate">{m.ingredients}</div>
                                )}
                              </div>
                              <span className="text-[11px] font-mono font-bold text-stone-600 shrink-0">
                                {isP ? `a partir de R$ ${displayPrice.toFixed(2)}` : `R$ ${displayPrice.toFixed(2)}`}
                              </span>
                            </div>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>

                {/* Size Selection */}
                {isCurrentSelectionPizza ? (
                  <div className="space-y-1 pt-1 border-t border-stone-200/60">
                    <div className="flex items-center justify-between">
                      <label className="text-[9px] font-mono font-bold text-stone-400 uppercase tracking-wider">
                        Tamanho da Pizza
                      </label>
                      <span className="text-[9px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200">
                        {selectedSize === 'priceSuperBig' ? 'Até 4 Sabores' : selectedSize === 'priceBig' ? 'Até 3 Sabores' : selectedSize === 'priceG' ? 'Até 2 Sabores' : '1 Sabor'}
                      </span>
                    </div>

                    <div className="grid grid-cols-5 gap-1">
                      {[
                        { key: 'priceP', label: 'P', sub: '1 Sab' },
                        { key: 'priceM', label: 'M', sub: '1 Sab' },
                        { key: 'priceG', label: 'G', sub: '2 Sab' },
                        { key: 'priceBig', label: 'Big', sub: '3 Sab' },
                        { key: 'priceSuperBig', label: 'Super Big', sub: '4 Sab' }
                      ].map(sz => {
                        const isSelected = selectedSize === sz.key;
                        const szPrice = selectedBaseMenuItem ? getPizzaPriceForSize(selectedBaseMenuItem, sz.key) : 0;
                        return (
                          <button
                            key={sz.key}
                            type="button"
                            onClick={() => handleSelectSize(sz.key)}
                            className={`py-1.5 px-1 rounded-md flex flex-col items-center justify-center transition-all cursor-pointer border text-center ${
                              isSelected
                                ? 'bg-amber-400 text-stone-950 font-black border-amber-500 shadow-xs'
                                : 'bg-white text-stone-700 font-bold border-stone-200 hover:bg-stone-50'
                            }`}
                          >
                            <span className="text-[10px] leading-tight">{sz.label}</span>
                            <span className="text-[8px] opacity-75 leading-tight">{sz.sub}</span>
                            {szPrice > 0 && (
                              <span className="text-[8.5px] font-mono mt-0.5 leading-none">
                                R$ {szPrice.toFixed(1)}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  selectedProductId && (
                    <div className="flex items-center justify-between px-2 py-1 bg-stone-100 rounded text-xs font-bold text-stone-700 border border-stone-200">
                      <span className="text-[10px] font-mono text-stone-500 uppercase">Item Simples</span>
                      <span className="font-mono text-stone-900">
                        R$ {(selectedBaseMenuItem?.priceSingle || selectedBaseMenuItem?.price || 0).toFixed(2)}
                      </span>
                    </div>
                  )
                )}

                {/* Multi-Flavor Pizza Manager (G, Big, Super Big) */}
                {isCurrentSelectionPizza && ['priceG', 'priceBig', 'priceSuperBig'].includes(selectedSize) && selectedProductId && (
                  <div className="space-y-1.5 pt-1.5 border-t border-stone-200/60">
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] font-mono font-bold text-stone-400 uppercase tracking-wider">
                        Sabores Selecionados ({totalFlavors} de {maxAdditionalFlavors + 1})
                      </span>
                      <span className="text-[9px] text-stone-500 font-medium">
                        Cálculo pelo maior valor
                      </span>
                    </div>

                    {/* 1º Sabor (Base) */}
                    <div className="flex items-center justify-between p-1.5 bg-white rounded-md border border-stone-200 text-xs">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="font-mono text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-200 shrink-0">
                          {getFractionText(0, totalFlavors)}
                        </span>
                        <span className="font-bold text-stone-900 truncate">
                          {selectedBaseMenuItem?.name || selectedProductSearch}
                        </span>
                      </div>
                      <span className="text-[10px] font-mono font-bold text-stone-500 shrink-0">
                        R$ {getPizzaPriceForSize(selectedBaseMenuItem, selectedSize).toFixed(2)}
                      </span>
                    </div>

                    {/* Sabores Adicionais já selecionados */}
                    {customAdditionalFlavors.map((flavor, idx) => {
                      const matchingItem = menuItems.find(m => m.id === flavor.id);
                      const sPrice = matchingItem ? getPizzaPriceForSize(matchingItem, selectedSize) : 0;
                      const isSearchingThis = searchingFlavorSlot === idx;

                      if (isSearchingThis) {
                        return (
                          <div key={idx} className="p-2 bg-amber-50/70 border-2 border-amber-400 rounded-lg space-y-1.5 shadow-sm">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-black text-amber-900 flex items-center gap-1">
                                <Search size={11} className="text-amber-700" />
                                Trocar {idx + 2}º Sabor (Somente Pizzas):
                              </span>
                              <button
                                type="button"
                                onClick={() => { setSearchingFlavorSlot(null); setFlavorSearchQuery(''); }}
                                className="text-stone-400 hover:text-stone-700 text-[10px] font-bold"
                              >
                                Cancelar ✕
                              </button>
                            </div>
                            <input
                              ref={flavorSearchInputRef}
                              type="text"
                              value={flavorSearchQuery}
                              onChange={e => setFlavorSearchQuery(e.target.value)}
                              onKeyDown={e => {
                                if (e.key === 'Enter' && filteredSlotPizzas.length > 0) {
                                  e.preventDefault();
                                  const chosen = filteredSlotPizzas[0];
                                  const next = [...customAdditionalFlavors];
                                  next[idx] = { id: chosen.id, search: chosen.name };
                                  setCustomAdditionalFlavors(next);
                                  setSearchingFlavorSlot(null);
                                  setFlavorSearchQuery('');
                                } else if (e.key === 'Escape') {
                                  setSearchingFlavorSlot(null);
                                }
                              }}
                              placeholder="Nome ou número da pizza..."
                              className="w-full px-2 py-1 bg-white border border-stone-300 rounded text-xs font-bold text-stone-900 outline-none focus:border-amber-500"
                            />
                            <div className="max-h-32 overflow-y-auto divide-y divide-stone-100 bg-white rounded border border-stone-200">
                              {filteredSlotPizzas.length === 0 ? (
                                <div className="p-2 text-center text-[10px] text-stone-400">Nenhuma pizza encontrada.</div>
                              ) : (
                                filteredSlotPizzas.map(p => (
                                  <div
                                    key={p.id}
                                    onClick={() => {
                                      const next = [...customAdditionalFlavors];
                                      next[idx] = { id: p.id, search: p.name };
                                      setCustomAdditionalFlavors(next);
                                      setSearchingFlavorSlot(null);
                                      setFlavorSearchQuery('');
                                    }}
                                    className="p-1.5 text-xs font-bold text-stone-800 hover:bg-amber-50 cursor-pointer flex justify-between items-center"
                                  >
                                    <span className="truncate">{p.name}</span>
                                    <span className="text-[10px] font-mono text-stone-500 shrink-0">
                                      R$ {getPizzaPriceForSize(p, selectedSize).toFixed(2)}
                                    </span>
                                  </div>
                                ))
                              )}
                            </div>
                          </div>
                        );
                      }

                      return (
                        <div key={idx} className="flex items-center justify-between p-1.5 bg-white rounded-md border border-stone-200 text-xs">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="font-mono text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-200 shrink-0">
                              {getFractionText(idx + 1, totalFlavors)}
                            </span>
                            <span className="font-bold text-stone-900 truncate">
                              {flavor.search || flavor.id}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            {sPrice > 0 && (
                              <span className="text-[10px] font-mono font-bold text-stone-500 mr-0.5">
                                R$ {sPrice.toFixed(2)}
                              </span>
                            )}
                            <button
                              type="button"
                              onClick={() => {
                                setSearchingFlavorSlot(idx);
                                setFlavorSearchQuery('');
                              }}
                              className="px-1.5 py-0.5 bg-stone-50 hover:bg-amber-50 text-amber-900 border border-stone-200 rounded text-[9.5px] font-bold flex items-center gap-1 cursor-pointer"
                              title="Trocar este sabor"
                            >
                              <RotateCcw size={10} />
                              <span>Trocar</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setCustomAdditionalFlavors(prev => prev.filter((_, i) => i !== idx));
                              }}
                              className="w-5 h-5 flex items-center justify-center text-stone-400 hover:text-rose-600 rounded hover:bg-rose-50 cursor-pointer transition-colors text-xs font-bold"
                              title="Remover este sabor"
                            >
                              ✕
                            </button>
                          </div>
                        </div>
                      );
                    })}

                    {/* Novo slot de busca ativo para adicionar sabor */}
                    {searchingFlavorSlot === customAdditionalFlavors.length && (
                      <div className="p-2 bg-amber-50/70 border-2 border-amber-400 rounded-lg space-y-1.5 shadow-sm">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-black text-amber-900 flex items-center gap-1">
                            <Search size={11} className="text-amber-700" />
                            Adicionar {customAdditionalFlavors.length + 2}º Sabor (Somente Pizzas):
                          </span>
                          <button
                            type="button"
                            onClick={() => { setSearchingFlavorSlot(null); setFlavorSearchQuery(''); }}
                            className="text-stone-400 hover:text-stone-700 text-[10px] font-bold"
                          >
                            Cancelar ✕
                          </button>
                        </div>
                        <input
                          ref={flavorSearchInputRef}
                          type="text"
                          value={flavorSearchQuery}
                          onChange={e => setFlavorSearchQuery(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === 'Enter' && filteredSlotPizzas.length > 0) {
                              e.preventDefault();
                              const chosen = filteredSlotPizzas[0];
                              setCustomAdditionalFlavors(prev => [...prev, { id: chosen.id, search: chosen.name }]);
                              setSearchingFlavorSlot(null);
                              setFlavorSearchQuery('');
                            } else if (e.key === 'Escape') {
                              setSearchingFlavorSlot(null);
                            }
                          }}
                          placeholder="Digite o nome ou número da pizza..."
                          className="w-full px-2 py-1 bg-white border border-stone-300 rounded text-xs font-bold text-stone-900 outline-none focus:border-amber-500"
                        />
                        <div className="max-h-32 overflow-y-auto divide-y divide-stone-100 bg-white rounded border border-stone-200">
                          {filteredSlotPizzas.length === 0 ? (
                            <div className="p-2 text-center text-[10px] text-stone-400">Nenhuma pizza encontrada.</div>
                          ) : (
                            filteredSlotPizzas.map(p => (
                              <div
                                key={p.id}
                                onClick={() => {
                                  setCustomAdditionalFlavors(prev => [...prev, { id: p.id, search: p.name }]);
                                  setSearchingFlavorSlot(null);
                                  setFlavorSearchQuery('');
                                }}
                                className="p-1.5 text-xs font-bold text-stone-800 hover:bg-amber-50 cursor-pointer flex justify-between items-center"
                              >
                                <span className="truncate">{p.name}</span>
                                <span className="text-[10px] font-mono text-stone-500 shrink-0">
                                  R$ {getPizzaPriceForSize(p, selectedSize).toFixed(2)}
                                </span>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    )}

                    {/* Botão para abrir o combobox de sabor adicional */}
                    {searchingFlavorSlot === null && customAdditionalFlavors.length < maxAdditionalFlavors && (
                      <button
                        type="button"
                        onClick={() => {
                          setSearchingFlavorSlot(customAdditionalFlavors.length);
                          setFlavorSearchQuery('');
                        }}
                        className="w-full py-1.5 px-2 border border-dashed border-amber-400 hover:border-amber-500 bg-amber-50/50 hover:bg-amber-50 text-amber-950 rounded-md text-[11px] font-bold transition-all flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <Plus size={12} className="text-amber-700 stroke-[3]" />
                        <span>
                          + Adicionar {customAdditionalFlavors.length === 0 ? (selectedSize === 'priceG' ? '2º Sabor (Meio a Meio)' : '2º Sabor') : `${customAdditionalFlavors.length + 2}º Sabor`}
                        </span>
                      </button>
                    )}
                  </div>
                )}

                {/* Seletor de Adicionais Extras (Bacon, Queijo, etc.) */}
                {(isCurrentSelectionPizza || editingItemIndex !== null || selectedProductId) && (
                  <div className="space-y-1.5 pt-2 border-t border-stone-200/60 bg-white/80 p-2 rounded-lg border border-stone-200/90 shadow-2xs">
                    <div className="flex items-center justify-between">
                      <label className="text-[9px] font-mono font-bold text-stone-600 uppercase tracking-wider flex items-center gap-1.5">
                        <span>🥓 Adicionais Extras</span>
                        {selectedExtras.length > 0 && (
                          <span className="text-rose-600 font-bold bg-rose-50 px-1.5 py-0.2 rounded border border-rose-200 text-[8.5px]">
                            + R$ {selectedExtras.reduce((s, e) => s + (Number(e.price) || 0), 0).toFixed(2)}
                          </span>
                        )}
                      </label>
                      <span className="text-[8.5px] text-stone-400 font-medium">
                        {selectedExtras.length === 0 ? 'Toque no adicional para incluir' : `${selectedExtras.length} selecionado(s)`}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-1">
                      {availableExtras.map((extra) => {
                        const isSelected = selectedExtras.some(e => e.id === extra.id || e.name.toLowerCase() === extra.name.toLowerCase());
                        return (
                          <button
                            key={extra.id}
                            type="button"
                            onClick={() => handleToggleExtra(extra)}
                            className={`py-1.5 px-2 rounded-md flex items-center justify-between transition-all cursor-pointer border text-left ${
                              isSelected
                                ? 'bg-rose-50 text-rose-900 border-rose-300 font-black shadow-2xs ring-1 ring-rose-400'
                                : 'bg-white text-stone-700 font-bold border-stone-200 hover:bg-stone-50 hover:border-stone-300'
                            }`}
                          >
                            <div className="flex items-center gap-1 min-w-0">
                              <span className="text-xs">{getExtraIcon(extra.name)}</span>
                              <span className="text-[10px] truncate leading-tight">{extra.name}</span>
                            </div>
                            <span className={`text-[9px] font-mono shrink-0 ml-1 leading-none ${isSelected ? 'text-rose-700 font-black' : 'text-stone-500'}`}>
                              +R$ {extra.price.toFixed(2)}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Button to Include or Update Item */}
                <button
                  type="button"
                  onClick={handleAddItem}
                  disabled={!selectedProductId && !selectedProductSearch.trim() && editingItemIndex === null}
                  className={`w-full py-2 px-3 rounded-lg text-xs font-extrabold flex items-center justify-center gap-1.5 transition-all shadow-xs cursor-pointer ${
                    editingItemIndex !== null
                      ? 'bg-amber-500 hover:bg-amber-600 text-stone-950'
                      : 'bg-[#062b06] hover:bg-[#0b520a] text-white'
                  } disabled:opacity-40 disabled:cursor-not-allowed`}
                >
                  <Check size={14} className="stroke-[2.5]" />
                  <span>
                    {editingItemIndex !== null ? 'Salvar Alteração no Pedido' : 'Incluir no Pedido'}
                    {currentItemFinalPrice > 0 && ` (R$ ${currentItemFinalPrice.toFixed(2)} un.)`}
                  </span>
                </button>
              </div>
            </div>

            {/* Section 3: Financial Adjustments Compacto */}
            <div className="bg-white p-2 rounded-lg border border-stone-200/90 shadow-2xs space-y-1.5">
              <h4 className="text-[9px] font-mono font-bold text-stone-400 uppercase tracking-wider">Ajustes Financeiros</h4>
              
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-0.5">
                  <label className="block text-[8px] font-mono font-bold text-emerald-700 uppercase tracking-wider">
                    Desconto (- R$)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={discountAmount || ''}
                    onChange={(e) => setDiscountAmount(parseFloat(e.target.value) || 0)}
                    placeholder="0.00"
                    className="w-full px-2 py-1 bg-emerald-50/20 rounded border border-emerald-200 text-xs font-bold text-emerald-900 outline-none focus:border-emerald-500 transition-colors"
                  />
                </div>
                <div className="space-y-0.5">
                  <label className="block text-[8px] font-mono font-bold text-amber-700 uppercase tracking-wider">
                    Taxa Extra (+ R$)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={additionalAmount || ''}
                    onChange={(e) => setAdditionalAmount(parseFloat(e.target.value) || 0)}
                    placeholder="0.00"
                    className="w-full px-2 py-1 bg-amber-50/20 rounded border border-amber-200 text-xs font-bold text-amber-900 outline-none focus:border-amber-500 transition-colors"
                  />
                </div>
              </div>

              <div className="space-y-0.5">
                <label className="block text-[8px] font-mono font-bold text-stone-500 uppercase tracking-wider">
                  Obs. Taxa Adicional (Sai no Talão)
                </label>
                <input
                  type="text"
                  value={editReason}
                  onChange={(e) => setEditReason(e.target.value)}
                  placeholder="Ex: Embalagem extra, taxa atendimento..."
                  className="w-full px-2 py-1 bg-amber-50/20 rounded border border-amber-300 text-[11px] font-medium text-stone-900 outline-none focus:border-amber-600 transition-colors"
                />
              </div>
            </div>
          </div>

          {/* Section 4: Live Total Calculation & Actions Bar Integrada */}
          <div className="mt-1 pt-1.5 border-t border-stone-200/80 flex items-center justify-between gap-2 bg-[#e5ddd4] text-[#44210f] p-2 rounded-lg shadow-sm shrink-0">
            <div>
              <span className="block text-[8px] font-mono text-[#745240] uppercase">Total Recalculado</span>
              <div className="flex items-baseline gap-2">
                <span className="text-xl font-black text-rose-500 leading-none font-mono">R$ {finalTotal.toFixed(2)}</span>
                {orderType === 'entrega' && activeDeliveryFee > 0 && (
                  <span className="text-[10px] text-sky-400 font-mono font-medium">(inclui R$ {activeDeliveryFee.toFixed(2)} entrega)</span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-1.5 rounded font-bold text-xs bg-[#0b520a] hover:bg-stone-700 text-stone-300 transition-colors cursor-pointer border border-stone-700"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-1.5 rounded font-bold text-xs bg-rose-600 hover:bg-rose-700 text-white shadow-sm transition-all active:translate-y-px cursor-pointer flex items-center gap-1 border border-rose-500"
              >
                {saving ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>

        </form>
      </div>
    </div>
  );
}

interface SparklineData {
  data: number[];
  color: string;
}

function Sparkline({ data, color }: SparklineData) {
  if (!data.length) return null;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const width = 100;
  const height = 36;
  const points = data.map((value, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((value - min) / range) * height;
    return `${x},${y}`;
  }).join(' ');
  const path = `M${points}`;
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="w-[100px] h-[36px]">
      <defs>
        <linearGradient id="sparkline-gradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.3} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      <path
        d={path}
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        className="transition-all duration-300"
      />
      <path
        d={path}
        stroke="url(#sparkline-gradient)"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        opacity={0.5}
      />
    </svg>
  );
}

function KpiCard({ 
  title, 
  value, 
  icon, 
  trend, 
  trendUp, 
  description,
  sparklineData,
  sparklineColor = "#18181B"
}: { 
  title: string; 
  value: string; 
  icon: React.ReactNode; 
  trend: string; 
  trendUp: boolean; 
  description: string;
  sparklineData?: number[];
  sparklineColor?: string;
}) {
  return (
    <div className="bg-white p-4 rounded-xl border border-stone-200 hover:border-stone-300 hover:shadow-md transition-all duration-200 group">
      <div className="flex justify-between items-start mb-2">
        <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-stone-400">{title}</span>
        <div className="p-1.5 bg-stone-50 rounded-lg border border-stone-200 text-stone-500 group-hover:border-stone-300 transition-colors">
          {icon}
        </div>
      </div>
      <p className="text-2xl sm:text-[1.6rem] font-black font-mono tabular-nums text-stone-900 tracking-tight leading-none mb-2">{value}</p>
      <div className="flex items-center gap-1.5">
        <span className={`text-[10px] font-mono font-bold flex items-center gap-0.5 ${
          trendUp ? 'text-emerald-600' : 'text-rose-500'
        }`}>
          {trendUp ? <ArrowUpRight size={11} strokeWidth={2.5} /> : <ArrowDownRight size={11} strokeWidth={2.5} />}
          {trend}
        </span>
        <span className="text-[10px] font-mono text-stone-400">{description}</span>
      </div>
    </div>
  );
}

function ReportCard({ 
  title, 
  value, 
  icon, 
  iconBg = 'bg-stone-100 text-stone-700 border-stone-200/80',
  onClick,
  subtitle,
  customDelay = 0
}: { 
  title: string; 
  value: string; 
  icon: React.ReactNode; 
  iconBg?: string;
  onClick: () => void;
  subtitle?: string;
  customDelay?: number;
}) {
  return (
    <motion.button
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ 
        duration: 0.3, 
        delay: customDelay, 
        ease: [0.2, 0, 0, 1] 
      }}
      whileHover={{ y: -1.5, transition: { duration: 0.15, ease: [0.2, 0, 0, 1] } }}
      whileTap={{ scale: 0.98, transition: { duration: 0.08 } }}
      onClick={onClick}
      className="bg-white px-3 py-2 rounded-xl border border-stone-200/90 hover:border-amber-400/80 hover:bg-amber-50/15 transition-all cursor-pointer flex items-center justify-between text-left w-full group shadow-2xs hover:shadow-xs relative h-[52px]"
    >
      <div className="flex items-center gap-2.5 min-w-0 pr-2">
        <div className={`w-8 h-8 rounded-lg ${iconBg} border flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform`}>
          {icon}
        </div>
        <div className="min-w-0">
          <p className="text-[10px] font-mono font-bold uppercase tracking-wider text-stone-500 truncate leading-tight">{title}</p>
          {value ? (
            <p className="text-sm font-black font-mono tabular-nums text-stone-900 tracking-tight leading-tight mt-0.5 truncate">{value}</p>
          ) : (
            <p className="text-[10.5px] font-medium text-stone-600 truncate leading-tight mt-0.5">{subtitle || 'Ver detalhes'}</p>
          )}
        </div>
      </div>
      <ArrowDownRight className="w-3.5 h-3.5 text-stone-400 group-hover:text-stone-900 group-hover:translate-x-0.5 group-hover:translate-y-0.5 transition-all shrink-0" />
    </motion.button>
  );
}
