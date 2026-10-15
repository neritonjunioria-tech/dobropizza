

// Commit trigger - updated
import { supabase } from "./lib/supabase";
import React, { useState, useEffect, useMemo } from "react";
import { useMenu } from "./hooks/useMenu";
import { useBusinessHours } from "./hooks/useBusinessHours";
import {
  MenuItem,
  menuPizzas,
  menuEsfihas,
  menuBordas,
  menuBebidas,
  menuDoDia,
  RESTAURANT_WHATSAPP_PHONE,
  FREE_DELIVERY_THRESHOLD,
} from "./data/menu";
import { CartItem } from "./types";
import { playVictorySound } from "./utils/sound";
import { getLisbonDate } from "./utils/date";
import { hapticLight, hapticMedium, hapticSuccess } from "./utils/haptics";
import { Search, Plus, ShoppingBag, X, Instagram, MapPin, ChevronDown, ArrowUp, Flame, Star, Sandwich, CupSoda, Pizza, Leaf, Cake, Tag, CalendarDays, Clock, type LucideIcon } from "lucide-react";
import Cart from "./components/Cart";
import MenuItemCard from "./components/MenuItemCard";
import PizzaModal from "./components/PizzaModal";
import Footer from "./components/Footer";
import PromoModal from "./components/PromoModal";
import PizzaDayModal from "./components/PizzaDayModal";
import MenuDoDiaModal from "./components/MenuDoDiaModal";


export const categoriesUI = [
    {
      id: "mais-pedidos",
      label: "MAIS VENDIDAS",
      sub: "Os sabores favoritos da Dobro",
      group: ["mais-pedidos"],
    },
    {
      id: "premium",
      label: "PREMIUM",
      sub: "Massa artesanal 28cm e receitas autorais exclusivas",
      group: ["premium", "tradicionais"],
    },
    {
      id: "sandubas",
      label: "SANDUBAS",
      sub: "Sanduíches artesanais na massa da casa",
      group: ["sandubas"],
    },
    {
      id: "bebidas",
      label: "BEBIDAS",
      sub: "Refrigerantes e águas geladas",
      group: ["bebidas"],
    },
  ];

// Line icons shown next to each category title (emojis typed in the admin are stripped from the label)
const CATEGORY_ICONS: Record<string, LucideIcon> = {
  "mais-pedidos": Flame,
  premium: Star,
  especiais: Star,
  gourmet: Star,
  tradicionais: Pizza,
  sandubas: Sandwich,
  bebidas: CupSoda,
  vegetarianas: Leaf,
  doces: Cake,
  promocoes: Tag,
  "menu-do-dia": CalendarDays,
};

const stripEmoji = (s: string) => s.replace(/[\p{Extended_Pictographic}\u{FE0F}\u{200D}]/gu, "").replace(/\s{2,}/g, " ").trim();

import { useAnalytics } from './hooks/useAnalytics';

function groupSchedule(schedule: any[]) {
  if (!schedule || schedule.length === 0) return [];
  const groups: { days: string; label: string; isClosed: boolean; isCurrentGroup: boolean }[] = [];
  
  let current: { startDay: string; endDay: string; label: string; isClosed: boolean; hasToday: boolean } | null = null;
  const shortNames: Record<number, string> = { 1: 'Seg', 2: 'Ter', 3: 'Qua', 4: 'Qui', 5: 'Sex', 6: 'Sáb', 0: 'Dom' };

  for (const item of schedule) {
    const sName = shortNames[item.dayOfWeek] || (item.dayName ? item.dayName.slice(0, 3) : '');
    if (!current) {
      current = { startDay: sName, endDay: sName, label: item.label, isClosed: item.isClosed, hasToday: item.isToday };
    } else if (current.label === item.label) {
      current.endDay = sName;
      if (item.isToday) current.hasToday = true;
    } else {
      const daysStr = current.startDay === current.endDay ? current.startDay : `${current.startDay} a ${current.endDay}`;
      groups.push({ days: daysStr, label: current.label, isClosed: current.isClosed, isCurrentGroup: current.hasToday });
      current = { startDay: sName, endDay: sName, label: item.label, isClosed: item.isClosed, hasToday: item.isToday };
    }
  }
  if (current) {
    const daysStr = current.startDay === current.endDay ? current.startDay : `${current.startDay} a ${current.endDay}`;
    groups.push({ days: daysStr, label: current.label, isClosed: current.isClosed, isCurrentGroup: current.hasToday });
  }
  return groups;
}

function StoreStatusBadge({ businessStatus, align = 'right' }: { businessStatus: ReturnType<typeof useBusinessHours>; align?: 'left' | 'right' }) {
  const [isHovered, setIsHovered] = useState(false);

  if (businessStatus.loading) return null;

  const isClosed = !businessStatus.isOpen;
  const groupedSchedule = groupSchedule(businessStatus.schedule || []);

  return (
    <div 
      className="relative inline-block"
      onMouseEnter={() => { if (isClosed) setIsHovered(true); }}
      onMouseLeave={() => { setIsHovered(false); }}
      onClick={() => { if (isClosed) setIsHovered(prev => !prev); }}
    >
      <div 
        className={`shrink-0 whitespace-nowrap flex items-center gap-1.5 px-2.5 py-1 md:px-3 md:py-1 rounded-full text-[11px] font-semibold border transition-all select-none ${
          !isClosed
            ? "bg-emerald-50 text-emerald-800 border-emerald-200"
            : "bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100 hover:border-amber-300 cursor-pointer shadow-2xs"
        }`}
        title={isClosed ? "Passe o mouse para ver os horários" : undefined}
      >
        <span className={`w-1.5 h-1.5 rounded-full ${!isClosed ? "bg-[#083d07] animate-pulse" : "bg-amber-600"}`} />
        <span>{!isClosed ? "Aberto" : "Fechado"}</span>
      </div>

      {/* Informativo dinâmico, minimalista, compacto e discreto */}
      {isClosed && isHovered && (
        <div 
          className={`absolute top-full mt-1.5 z-[999] w-56 sm:w-60 bg-white/98 backdrop-blur-md rounded-xl shadow-lg border border-stone-200/90 p-2.5 text-stone-800 animate-in fade-in zoom-in-95 duration-100 pointer-events-auto ${
            align === 'left' ? 'left-0' : 'right-0'
          }`}
          style={{ filter: 'drop-shadow(0 8px 20px rgba(0, 0, 0, 0.08))' }}
        >
          {/* Seta discreta */}
          <div 
            className={`absolute -top-1 w-2.5 h-2.5 bg-white border-t border-l border-stone-200/90 transform rotate-45 ${
              align === 'left' ? 'left-4' : 'right-4'
            }`} 
          />

          {/* Cabeçalho sutil */}
          <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-stone-100">
            <div className="flex items-center gap-1.5">
              <Clock className="w-3 h-3 text-[#083d07]" />
              <span className="text-[10px] font-bold text-stone-800 uppercase tracking-wide">
                Atendimento
              </span>
            </div>
            {businessStatus.todayLabel && (
              <span className="text-[9px] font-mono text-amber-800 bg-amber-50 px-1 py-0.2 rounded font-semibold">
                Hoje
              </span>
            )}
          </div>

          {/* Lista agrupada (apenas 1 a 3 linhas compactas) */}
          <div className="space-y-0.5">
            {groupedSchedule.length > 0 ? (
              groupedSchedule.map((group, idx) => (
                <div 
                  key={idx}
                  className={`flex items-center justify-between py-0.5 px-1.5 rounded text-[11px] ${
                    group.isCurrentGroup 
                      ? "bg-amber-50/80 font-semibold text-stone-900" 
                      : "text-stone-600"
                  }`}
                >
                  <div className="flex items-center gap-1">
                    {group.isCurrentGroup && (
                      <span className="w-1 h-1 rounded-full bg-amber-600 shrink-0" />
                    )}
                    <span>{group.days}</span>
                  </div>
                  <span className={`font-mono text-[10px] ${group.isClosed ? "text-amber-800/80" : "text-stone-800"}`}>
                    {group.label}
                  </span>
                </div>
              ))
            ) : (
              <div className="text-[10px] text-stone-500 py-0.5">
                {businessStatus.todayLabel || 'Fechado no momento'}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default // App principal
function App() {
  const { menuItems, categories: dbCategories, loading: menuLoading, usingFallback } = useMenu();
  const businessStatus = useBusinessHours();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>("mais-pedidos");
  const [searchTerm, setSearchTerm] = useState<string>("");
  
  const { trackEvent } = useAnalytics();

  // Last order placed on this phone (saved by the cart), so the customer can reopen order tracking
  const readLastOrder = () => {
    try {
      const raw = localStorage.getItem('dobro_last_order');
      if (!raw) return null;
      const o = JSON.parse(raw);
      if (!o?.code || !o?.at || Date.now() - o.at > 12 * 60 * 60 * 1000) return null;
      return o as { id: number | string; code: string; at: number };
    } catch { return null; }
  };
  const [lastOrder, setLastOrder] = useState(readLastOrder);
  useEffect(() => {
    const refresh = () => setLastOrder(readLastOrder());
    window.addEventListener('dobro-last-order', refresh);
    window.addEventListener('storage', refresh);
    return () => { window.removeEventListener('dobro-last-order', refresh); window.removeEventListener('storage', refresh); };
  }, []);
  const dismissLastOrder = () => { try { localStorage.removeItem('dobro_last_order'); } catch { /* ignore */ } setLastOrder(null); };

  useEffect(() => {
    trackEvent('page_view');
  }, []);



  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isPromoOpen, setIsPromoOpen] = useState(false);
  const [isPizzaDayOpen, setIsPizzaDayOpen] = useState(false);
  const [isMenuDoDiaOpen, setIsMenuDoDiaOpen] = useState(false);
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);
  const [pausedItems, setPausedItems] = useState<string[]>([]);
  const [pausedItemsLoaded, setPausedItemsLoaded] = useState(false);
  const [hasOpenedPromoAutomatically, setHasOpenedPromoAutomatically] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [cartBounce, setCartBounce] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 350);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Dismiss zoomed image on ESC
  useEffect(() => {
    if (!zoomedImage) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setZoomedImage(null);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [zoomedImage]);

  useEffect(() => {
    if (!menuLoading && pausedItemsLoaded && menuItems.length > 0 && !hasOpenedPromoAutomatically) {
      const todayDayOfWeek = new Date().getDay();
      const todaysPromos = menuItems.filter(i => 
        (i.category === 'promocoes' || (i as any).groupOverride === 'promocoes') && 
        i.dayOfWeek === todayDayOfWeek &&
        !pausedItems.includes(i.id)
      );
      if (todaysPromos.length > 0) {
        setIsMenuDoDiaOpen(true);
      }
      setHasOpenedPromoAutomatically(true);
    }
  }, [menuLoading, pausedItemsLoaded, menuItems, pausedItems, hasOpenedPromoAutomatically]);

  useEffect(() => {
    const fetchPausedItems = async () => {
      try {
        const { data, error } = await supabase.from('paused_items').select('id');
        if (error) throw error;
        if (data) {
          setPausedItems(data.map(item => item.id));
        }
      } catch (err) {
        console.error("Failed to fetch paused items", err);
      } finally {
        setPausedItemsLoaded(true);
      }
    };
    fetchPausedItems();

    const channel = supabase.channel('public:paused_items')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'paused_items' }, payload => {
        fetchPausedItems();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    const savedCart = localStorage.getItem("pizzeria-cart");
    if (savedCart) {
      try {
        setCart(JSON.parse(savedCart));
      } catch (e) {}
    }
  }, []);

  const saveCart = (newCart: CartItem[]) => {
    setCart(newCart);
    localStorage.setItem("pizzeria-cart", JSON.stringify(newCart));
  };

  const handleAddToCart = (newItem: CartItem, openCart: boolean = true) => {
    trackEvent('add_to_cart', { 
      item_id: newItem.menuItem.id, 
      item_name: newItem.menuItem.name, 
      price: newItem.priceCalculated 
    });
    
    hapticMedium();

    setCartBounce(true);
    setTimeout(() => setCartBounce(false), 500);

    const existingIndex = cart.findIndex(
      (item) =>
        item.menuItem.id === newItem.menuItem.id && item.size === newItem.size,
    );
    if (existingIndex > -1) {
      const updatedCart = [...cart];
      updatedCart[existingIndex].quantity += newItem.quantity;
      saveCart(updatedCart);
    } else {
      saveCart([...cart, newItem]);
    }
    // Mobile open cart automatically after adding if requested
    if (openCart && window.innerWidth < 1024) {
      setIsCartOpen(true);
    }
  };

  // Aggregated array of all items (cada item em exatamente uma categoria)
  const allItems = useMemo(() => {
    return menuItems.filter(item => !pausedItems.includes(item.id));
  }, [menuItems, pausedItems]);

  const handleSelectItem = (item: MenuItem) => {
    setSelectedItem(item);
    setIsModalOpen(true);
    // Funnel "engaged" step: the customer opened a product
    trackEvent('view_item', { item_id: item.id, item_name: item.name });
  };

  const totalCartQty = cart.reduce((sum, item) => sum + item.quantity, 0);
  const totalCartPrice = useMemo(
    () => cart.reduce((sum, item) => sum + item.priceCalculated * item.quantity, 0),
    [cart]
  );

  // Grouping for render (Memoized for performance)
  const currentCategoriesUI = useMemo(() => {
    if (usingFallback || !dbCategories || dbCategories.length === 0) {
       return categoriesUI; // Use os hardcoded se o banco não estiver disponível
    }

    const tabsMap: Record<string, { id: string; label: string; sub: string; group: string[]; order: number }> = {};
    dbCategories.forEach((cat: any) => {
      const tabId = cat.display_group || cat.id;
      if (!tabsMap[tabId]) {
        tabsMap[tabId] = {
          id: tabId,
          label: stripEmoji(cat.display_label || cat.name.toUpperCase()),
          sub: cat.display_sub || "",
          group: [],
          order: cat.order_index ?? 999,
        };
      }
      tabsMap[tabId].group.push(cat.id);
    });

    const dbTabs = Object.values(tabsMap);
    return dbTabs.sort((a, b) => a.order - b.order);
  }, [dbCategories, usingFallback]);

  const itemsByCategory = useMemo(() => {
    const map: Record<string, MenuItem[]> = {};
    currentCategoriesUI.forEach((cat) => {
      let matchingItems = allItems.filter((item) => cat.group.includes(item.category));
      
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        matchingItems = matchingItems.filter(
          (item) =>
            item.name.toLowerCase().includes(term) ||
            (item.ingredients && item.ingredients.toLowerCase().includes(term)),
        );
      }
      map[cat.id] = matchingItems;
    });
    return map;
  }, [allItems, searchTerm, currentCategoriesUI]); // Re-calculate only when these change

  if (!businessStatus.loading && businessStatus.subscriptionStatus === 'blocked') {
    return (
      <div className="min-h-screen bg-[#f5f5f5] flex items-center justify-center p-4 font-sans">
        <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center">
          <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Search className="w-10 h-10 text-gray-400" />
          </div>
          <h1 className="text-2xl font-bold text-gray-800 mb-4">Cardápio Indisponível</h1>
          <p className="text-gray-600 mb-6 font-medium">
            Nosso cardápio digital está temporariamente fora do ar. Por favor, tente novamente mais tarde ou faça seu pedido diretamente pelo nosso WhatsApp.
          </p>
          <a
            href={`https://wa.me/${RESTAURANT_WHATSAPP_PHONE}`}
            target="_blank"
            rel="noreferrer"
            className="inline-block bg-[#25D366] text-white font-bold px-6 py-3 rounded-xl hover:bg-[#20bd5a] transition-colors shadow-lg active:scale-95"
          >
            Falar no WhatsApp
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fdfbf7] font-sans text-[#44210f] scroll-smooth pb-20 lg:pb-0">
      {/* Navbar Topo */}
      {/* DOBRO Pizzas Header */}
      <header className="bg-white sticky top-0 z-50 shadow-sm border-b border-[#e8d8d1]">
        <div className="max-w-7xl mx-auto px-4 py-3 flex flex-col gap-3 md:gap-0 md:flex-row md:items-center justify-between">
          <div className="flex justify-between items-center gap-2 w-full md:w-auto">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <img 
                src="/dobro/logo-dobro-circulo.png"
                alt="DOBRO Pizzas"
                className="h-11 w-11 shrink-0 rounded-full object-cover shadow-sm"
              />
              <div className="font-bold text-xl sm:text-2xl drop-shadow-sm text-[#083d07] tracking-tight flex items-baseline gap-1 whitespace-nowrap">
                DOBRO <span className="hidden min-[360px]:inline text-[#d5af7a] text-base sm:text-lg font-medium">Pizzas</span>
              </div>
            </div>

            {/* Status da loja: no celular fica à direita do logo; no computador, ao lado da busca */}
            <div className="md:hidden">
              <StoreStatusBadge businessStatus={businessStatus} align="right" />
            </div>
          </div>
          
          <div className="flex items-center gap-4 w-full md:w-auto">
            <div className="w-full md:w-[350px] relative">
               <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#745240]/60" />
               <input 
                 type="text" 
                 placeholder="Buscar sabor ou ingrediente"
                 className="w-full bg-[#fdfbf7] border border-[#e8d8d1] rounded-lg py-2.5 pl-10 pr-4 text-sm focus:ring-1 focus:ring-[#083d07] focus:border-[#083d07] text-[#44210f] outline-none transition-all placeholder:text-[#745240]/50"
                 value={searchTerm}
                 onChange={(e) => setSearchTerm(e.target.value)}
               />
            </div>
            <div className="hidden md:block">
              <StoreStatusBadge businessStatus={businessStatus} align="right" />
            </div>
          </div>
        </div>
      </header>

      {!businessStatus.loading && !businessStatus.isOpen && (
        <div className="bg-[#44210f] text-[#fdfbf7] text-center py-2 px-4 text-sm font-medium border-b border-[#d5af7a]/30">
          Por enquanto, o forno está desligado. Já já tem Dobro!{businessStatus.todayLabel ? ` (Horário de atendimento: ${businessStatus.todayLabel})` : ''}
        </div>
      )}

      {lastOrder && (
        <div className="bg-[#083d07] text-[#fdfbf7] px-4 py-2.5">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
            <span className="text-sm font-medium">Seu pedido {lastOrder.id ? `#${lastOrder.id}` : ''} está em andamento.</span>
            <div className="flex items-center gap-2 shrink-0">
              <a href={`/track/${lastOrder.code}`} className="bg-[#fdfbf7] text-[#083d07] font-bold text-xs rounded-full px-3.5 py-1.5 hover:bg-[#e8d8d1] transition-colors">
                Acompanhar pedido
              </a>
              <button onClick={dismissLastOrder} aria-label="Fechar aviso do pedido" className="p-1 text-[#fdfbf7]/70 hover:text-white cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Hero Banner */}
      <div className="relative h-[220px] md:h-[280px] w-full bg-[#ede3d5] max-w-7xl mx-auto md:mt-4 md:rounded-2xl overflow-hidden shadow-sm">
        <h1 className="sr-only">DOBRO Pizzas — Pizzas Artesanais, Longa Fermentação, Receitas Autorais</h1>
        {/* A arte já traz o logo no centro: versão 2:1 no celular, 4:1 a partir de md.
            Cada tela baixa só o tamanho de que precisa (WebP, com JPEG de reserva). */}
        <picture>
          <source
            media="(min-width: 768px)"
            type="image/webp"
            srcSet="/dobro/capa-linho-1280.webp 1280w, /dobro/capa-linho-1920.webp 1920w, /dobro/capa-linho-2560.webp 2560w, /dobro/capa-linho-3840.webp 3840w"
            sizes="(min-width: 1280px) 1280px, 100vw"
          />
          <source media="(min-width: 768px)" srcSet="/dobro/capa-linho-2560.jpg" />
          <source
            type="image/webp"
            srcSet="/dobro/capa-linho-celular-720.webp 720w, /dobro/capa-linho-celular-1440.webp 1440w"
            sizes="max(100vw, 440px)"
          />
          <img
            src="/dobro/capa-linho-celular-1440.jpg"
            className="w-full h-full object-cover"
            alt="DOBRO Pizzas"
            fetchPriority="high"
            decoding="async"
          />
        </picture>
      </div>
      {/* Categories Bar Sticky */}
      <div 
        id="categories-bar"
        className="bg-white border-b border-gray-200 sticky top-[108px] md:top-[64px] z-30 shadow-xs relative"
      >
        <div 
          onWheel={(e) => {
            if (e.deltaY !== 0) {
              e.currentTarget.scrollLeft += e.deltaY;
            }
          }}
          className="max-w-7xl mx-auto flex overflow-x-auto custom-scrollbar gap-1 px-2.5 py-1.5 items-center"
        >
          {currentCategoriesUI.map((cat) => {
            const shortLabel = cat.label
              .replace(/^OS\s+MAIS\s+PEDIDOS/i, 'MAIS PEDIDOS')
              .replace(/^PIZZAS\s+/i, '')
              .replace(/^ESFIHAS\s+SALGADAS\s+/i, 'ESF. ')
              .replace(/^ESFIHAS\s+/i, 'ESF. ');

            return (
            <a
              key={cat.id}
              href={`#cat-${cat.id}`}
              onClick={(e) => {
                if (cat.id === "menu-do-dia") {
                  e.preventDefault();
                  setIsMenuDoDiaOpen(true);
                  return;
                }
                hapticLight();
                setActiveCategory(cat.id);
                e.currentTarget.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
                const el = document.getElementById(`cat-${cat.id}`);
                if (el) {
                  e.preventDefault();
                  const yOffset = -140; // compensate for sticky header
                  const y =
                    el.getBoundingClientRect().top +
                    window.pageYOffset +
                    yOffset;
                  window.scrollTo({ top: y, behavior: "smooth" });
                }
              }}
              className={`py-0.5 md:py-1 px-2.5 md:px-3 rounded-full text-[11px] md:text-xs whitespace-nowrap font-medium tracking-tight transition-all duration-150 active:scale-95 cursor-pointer border ${
                activeCategory === cat.id
                  ? "bg-[#E8D8D1] text-[#083D07] border-[#D5AF7A] shadow-sm font-bold"
                  : "bg-white text-[#745240] border-[#e8d8d1] hover:bg-[#f6e3df]/40 hover:text-[#44210f]"
              } ${cat.id === "promocoes" && activeCategory !== cat.id ? "animate-pulse text-[#083d07] border-[#083d07] bg-[#f6e3df]/30 font-semibold" : ""}`}
              title={cat.label}
            >
              {shortLabel}
            </a>
            );
          })}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-4 md:py-8 flex flex-col lg:flex-row gap-8">
        {/* Left Column - Main Content */}
        <div className="w-full lg:flex-1 min-w-0">
          {/* Products Grids */}
          <div className="space-y-10 md:space-y-12 pb-12 lg:pb-24">
            {currentCategoriesUI.map((cat) => {
              if (cat.id === "menu-do-dia") return null;
              
              const items = itemsByCategory[cat.id];
              if (items.length === 0) return null;

              return (
                <div key={cat.id} id={`cat-${cat.id}`} className="scroll-mt-36">
                    <>
                      <h2 className="text-[26px] font-extrabold text-[#1a1a1a] mb-1 flex items-center gap-2.5">
                        {cat.label}
                        {(() => {
                          const Icon = CATEGORY_ICONS[cat.id] ?? CATEGORY_ICONS[cat.group[0]];
                          return Icon ? <Icon className="w-[22px] h-[22px] text-[#083D07] shrink-0" strokeWidth={1.75} aria-hidden="true" /> : null;
                        })()}
                      </h2>
                      <p className="text-gray-500 mb-6 text-[15px] font-medium">
                        {cat.sub}
                      </p>
                    </>

                  <div
                    className={
                      cat.id === "promocoes"
                        ? "flex overflow-x-auto gap-4 pb-4 snap-x snap-mandatory"
                        : "grid gap-4 grid-cols-1 sm:grid-cols-2"
                    }
                  >
                    {items.map((item) => {
                      const cacheKey = item.id + (item.isMaisPedido ? "-mp" : "");
                      const failedImage = failedImages[cacheKey] || false;
                      return (
                        <div 
                          key={cacheKey}
                          className={cat.id === "promocoes" ? "flex-none w-[280px] snap-center" : ""}
                        >
                          <MenuItemCard
                            item={item}
                            catId={cat.id}
                            failedImage={failedImage}
                            onClick={() => handleSelectItem(item)}
                            onZoom={(src) => setZoomedImage(src)}
                            onImageError={() =>
                              setFailedImages((prev) => ({ ...prev, [cacheKey]: true }))
                            }
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
            {Object.values(itemsByCategory).every(
              (arr: any) => arr.length === 0,
            ) && (
              <div className="text-center py-20 text-gray-400 bg-white border border-gray-200 rounded-xl">
                <Search className="w-8 h-8 mx-auto mb-3 opacity-50" />
                <p className="font-medium">
                  Nenhum produto encontrado na pesquisa.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Right Column - Desktop Cart integration */}
        <div className="w-full lg:w-[380px] xl:w-[400px] lg:shrink-0 relative">
          <Cart
            items={cart}
            onUpdateQuantity={(id, delta) => {
              const updatedCart = cart.map((c) =>
                c.id === id
                  ? { ...c, quantity: Math.max(1, c.quantity + delta) }
                  : c
              );
              
              saveCart(updatedCart);
            }}
            onRemoveItem={(id) => saveCart(cart.filter((c) => c.id !== id))}
            onClearCart={() => saveCart([])}
            onAddToCart={handleAddToCart}
            isOpen={isCartOpen}
            onClose={() => setIsCartOpen(false)}
          />
        </div>
      </div>

      <Footer />

      {/* Floating Action Buttons */}

      {/* Mobile view cart toggle - Only visible when items are in cart */}
      {totalCartQty > 0 && (
        <div className="fixed bottom-0 left-0 w-full p-3 bg-white/95 backdrop-blur-md border-t border-gray-200 lg:hidden z-40 pb-safe shadow-[0_-4px_25px_rgba(0,0,0,0.12)] transition-all animate-in slide-in-from-bottom duration-200">
          <button
            onClick={() => {
              hapticMedium();
              setIsCartOpen(true);
            }}
            className="w-full bg-[#E8D8D1] hover:bg-[#D5AF7A] text-[#083D07] border border-[#D5AF7A] font-bold text-[15px] py-3.5 px-4 rounded-xl flex items-center justify-between shadow-xl active:scale-[0.98] transition-all"
          >
            <div className="flex items-center gap-2">
              <div className={`relative transition-transform duration-300 ${cartBounce ? 'scale-125 rotate-6' : 'scale-100'}`}>
                <ShoppingBag className="w-5 h-5" />
                <span className="absolute -top-1.5 -right-2 bg-[#d4af37] text-[#1a1a1a] text-[10px] font-black w-4 h-4 rounded-full flex items-center justify-center shadow-xs">
                  {totalCartQty}
                </span>
              </div>
              <span className="ml-1">Ver Sacola</span>
            </div>
            <span className="bg-white/20 px-2.5 py-1 rounded-lg text-sm tracking-wide">
              R$ {totalCartPrice.toFixed(2).replace('.', ',')}
            </span>
          </button>
        </div>
      )}

      {/* Scroll to Top Floating Button */}
      {showScrollTop && (
        <button
          onClick={() => {
            // One tap goes all the way back to the start of the menu.
            // (The categories bar is sticky, so aiming at it only moved the page a little per tap.)
            hapticLight();
            setActiveCategory(currentCategoriesUI[0]?.id ?? "mais-pedidos");
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
          className="fixed bottom-24 lg:bottom-10 left-4 sm:left-6 w-11 h-11 bg-white/95 backdrop-blur-md text-[#083d07] rounded-full flex items-center justify-center shadow-lg border border-[#e8d8d1] hover:bg-[#083d07] hover:text-[#fdfbf7] transition-all active:scale-95 z-30 group"
          title="Voltar ao topo do cardápio"
          aria-label="Voltar ao topo do cardápio"
        >
          <ArrowUp className="w-4 h-4 transition-transform group-hover:-translate-y-0.5" />
        </button>
      )}

      {/* WhatsApp Floating Button */}
      <a
        href={`https://wa.me/${RESTAURANT_WHATSAPP_PHONE}`}
        target="_blank"
        rel="noreferrer"
        className="fixed bottom-24 lg:bottom-8 right-6 w-[60px] h-[60px] bg-[#25D366] rounded-full flex items-center justify-center shadow-2xl hover:scale-110 transition-transform z-30 group"
      >
        <span className="absolute inset-0 rounded-full border-[3px] border-[#25D366] animate-ping opacity-30"></span>
        <svg
          viewBox="0 0 24 24"
          fill="white"
          className="w-[34px] h-[34px] ml-0.5 mt-0.5 drop-shadow-sm"
        >
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z" />
        </svg>
      </a>

      {/* Pizza configuration modal */}
      <PizzaModal
        pausedItems={pausedItems}
        item={selectedItem}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        initialSize="G"
        onAddToCart={handleAddToCart}
        allMenuItems={menuItems}
      />
      {/* Menu do Dia Modal */}
      <MenuDoDiaModal
        isOpen={isMenuDoDiaOpen}
        onClose={() => setIsMenuDoDiaOpen(false)}
        onSelectItem={handleSelectItem}
        menuItems={menuItems}
      />
      {/* Promoções Modal */}
      <PromoModal
        isOpen={isPromoOpen}
        onClose={() => setIsPromoOpen(false)}
      />
      {/* Pizza Day Modal */}
      <PizzaDayModal
        isOpen={isPizzaDayOpen}
        onClose={() => setIsPizzaDayOpen(false)}
        onAction={() => {
          setIsPizzaDayOpen(false);
          const el = document.getElementById('cat-promocoes');
          if (el) {
            const yOffset = -140;
            const y = el.getBoundingClientRect().top + window.pageYOffset + yOffset;
            window.scrollTo({ top: y, behavior: 'smooth' });
          }
        }}
      />
      {/* Zoomed Image Modal */}
      {zoomedImage && (
        <div 
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm transition-opacity"
          onClick={() => setZoomedImage(null)}
        >
          <div className="relative max-w-4xl w-full flex justify-center items-center">
            <button
              onClick={() => setZoomedImage(null)}
              className="absolute -top-12 right-0 p-2 text-white hover:text-gray-300 transition-colors"
            >
              <X className="w-8 h-8" />
            </button>
            <img
              src={zoomedImage}
              alt="Produto em destaque"
              className="max-w-full max-h-[85vh] object-contain rounded-2xl shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}
    </div>
  );
}
