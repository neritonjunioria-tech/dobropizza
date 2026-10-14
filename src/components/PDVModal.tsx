import React, { useState, useEffect, useMemo, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useMenu } from '../hooks/useMenu';
import { useExtras } from '../hooks/useExtras';
import { MenuItem, ExtraIngredient } from '../data/menu';
import { findImageForProduct } from '../utils/imageResolver';
import { categoriesUI } from '../App';
import { Motoboy } from '../utils/motoboys';
import { 
  X, ArrowLeft, Search, Plus, Minus, Trash2, ShoppingBag, 
  DollarSign, CreditCard, Smartphone, Check, 
  Percent, ArrowRight, User, Phone, MapPin, 
  Tag, Utensils, Bike, Store, AlertCircle, 
  RotateCcw, Sparkles, ChevronRight, Hash, Edit2, ChevronDown, FileText
} from 'lucide-react';

interface PDVModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeSessionId?: string | null;
  onOrderCreated: (order: any) => void;
}

export interface PDVCartItem {
  id: string;
  menuItem: MenuItem;
  size?: 'P' | 'M' | 'G' | 'Big' | 'Super Big';
  isHalf?: boolean;
  secondFlavor?: MenuItem;
  additionalFlavors?: MenuItem[];
  selectedBorda?: MenuItem | null;
  selectedExtras?: ExtraIngredient[];
  quantity: number;
  notes?: string;
  unitPrice: number;
  totalPrice: number;
}

// Helpers to identify promotions with pizza and customization capabilities
export const isPromoWithPizza = (item: MenuItem | null | undefined): boolean => {
  if (!item) return false;
  const nameLower = (item.name || '').toLowerCase();
  const idLower = (item.id || '').toLowerCase();
  const catLower = (item.category || '').toLowerCase();
  const ingLower = (item.ingredients || '').toLowerCase();

  const isPromo = catLower.includes('promo') || idLower.startsWith('md-') || idLower.startsWith('promo-') || nameLower.includes('promo') || nameLower.includes('combo') || nameLower.includes('menu ');
  const hasPizza = nameLower.includes('pizza') || idLower.includes('pizza') || ingLower.includes('pizza');

  return Boolean(isPromo && hasPizza);
};

export const isItemCustomizable = (item: MenuItem | null | undefined): boolean => {
  if (!item) return false;
  return Boolean(
    item.priceP || 
    item.priceM || 
    item.priceG || 
    item.priceBig || 
    item.priceSuperBig || 
    isPromoWithPizza(item)
  );
};

export const getPromoFlavors = (item: MenuItem | null | undefined): string[] => {
  if (!item) return [];
  if (item.id === 'md-1-pizza') {
    return ['Calabresa', 'Calabresa acebolada', 'Da Casa', 'Calapiry', 'Crocante', 'Frampalha', 'Marguerita'];
  }
  if (item.id === 'item-1788199746629' || item.id === 'md-2-pizza') {
    return ['Da Casa', 'Frango c/ catupiry', 'Carijó', 'Fiambre c/ queijo', 'Milho', 'Tradicional'];
  }
  if (item.id === 'item-1786481022634') {
    return ['Alho e Óleo', 'Frampalha', 'Calabresa Acebolada', 'Carijó', 'Da Casa', 'Crocante', 'Baiana'];
  }
  if (item.ingredients) {
    const match = item.ingredients.match(/sabores\s*(?:da\s*promo[çc][ãa]o)?\s*:\s*([^.\n]+)/i);
    if (match && match[1]) {
      return match[1].split(/,| e /i).map(s => s.trim().replace(/^ou\s+/i, '')).filter(Boolean);
    }
  }
  return [];
};

export const isTwoPizzaPromo = (item: MenuItem | null | undefined): boolean => {
  if (!item) return false;
  const n = (item.name || '').toLowerCase();
  const id = (item.id || '').toLowerCase();
  return id === 'item-1788199746629' || id === 'md-2-pizza' || n.includes('2 pizza') || n.includes('2 pizzas');
};

// DOBRO: pizzas de sabor único (sem meio a meio / 2º sabor)
const MULTI_FLAVOR_ENABLED = false;

const getPizzaPriceForSize = (item: MenuItem, size: 'P' | 'M' | 'G' | 'Big' | 'Super Big') => {
  if (size === 'P') return item.priceP || (item.priceM ? item.priceM - 2 : item.priceSingle || 0);
  if (size === 'M') return item.priceM || item.priceSingle || 0;
  if (size === 'G') return item.priceG || item.priceSingle || 0;
  if (size === 'Big') return item.priceBig || item.priceSingle || 0;
  if (size === 'Super Big') return item.priceSuperBig || item.priceSingle || 0;
  return item.priceSingle || 0;
};

// Componente para resolver imagens do PDV com tentativa de extensões
const PDVProductImage = ({ product, className }: { product: MenuItem, className?: string }) => {
  const [imgAttempt, setImgAttempt] = useState(0);
  const [failed, setFailed] = useState(false);
  const exts = ['.png', '.jpg', '.jpeg', '.webp'];

  let photoSrc = product.imageUrl ? product.imageUrl.replace(/^\//, '') : "";
  if (photoSrc === 'none') {
    photoSrc = "";
  } else if (!photoSrc) {
    const autoImage = findImageForProduct(product);
    if (autoImage) photoSrc = autoImage.replace(/^\//, '');
  }

  const getDisplaySrc = () => {
    if (!photoSrc) return "";
    if (photoSrc.startsWith('http') || photoSrc.startsWith('data:')) return imgAttempt > 0 ? '' : photoSrc;
    let base = photoSrc;
    if (imgAttempt > 0) {
      base = base.replace(/\.(png|jpe?g|webp)$/i, '');
      return `/${base}${exts[imgAttempt - 1]}`;
    }
    return `/${base}`;
  };

  const currentSrc = getDisplaySrc();

  if (!currentSrc || failed) {
    return <Utensils size={22} className="text-gray-300 drop-shadow-2xs" />;
  }

  return (
    <img
      src={currentSrc}
      alt={product.name}
      className={className}
      onError={() => {
        if (imgAttempt < exts.length) {
          setImgAttempt(prev => prev + 1);
        } else {
          setFailed(true);
        }
      }}
    />
  );
};

export default function PDVModal({
  isOpen,
  onClose,
  activeSessionId,
  onOrderCreated
}: PDVModalProps) {
  const { menuItems, categories, loading: menuLoading, usingFallback, refresh: refreshMenu } = useMenu();
  const availableExtras = useExtras();

  // Sempre sincroniza o cardápio ao abrir o PDV para refletir alterações recentes
  useEffect(() => {
    if (isOpen) {
      refreshMenu?.();
    }
  }, [isOpen]);

  // Order Details States
  const [orderType, setOrderType] = useState<'retirada' | 'mesa' | 'entrega'>('retirada');
  const [customerName, setCustomerName] = useState('');
  const [customerNif, setCustomerNif] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [tableNumber, setTableNumber] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [deliveryReference, setDeliveryReference] = useState('');
  const [deliveryZone, setDeliveryZone] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'Pix' | 'Numerário' | 'Cartão de Crédito' | 'Cartão de Débito'>('Pix');
  const [cashAmountGiven, setCashAmountGiven] = useState<string>('');

  // Search & Navigation
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Cart & Pricing
  const [cart, setCart] = useState<PDVCartItem[]>([]);
  const [adjustmentType, setAdjustmentType] = useState<'none' | 'discount' | 'surcharge'>('none');
  const [adjustmentMode, setAdjustmentMode] = useState<'fixed' | 'percent'>('fixed');
  const [adjustmentValue, setAdjustmentValue] = useState<string>('');

  // Zones & Settings
  const [zones, setZones] = useState<{ name: string; fee: number }[]>([]);
  const [freeDeliveryThreshold, setFreeDeliveryThreshold] = useState(20);
  const [adminLogoUrl, setAdminLogoUrl] = useState('');

  // Submissions
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Customizer / Size Modal State
  const [customizingItem, setCustomizingItem] = useState<MenuItem | null>(null);
  const [customSize, setCustomSize] = useState<'P' | 'M' | 'G' | 'Big' | 'Super Big'>('G');
  const [customAdditionalFlavors, setCustomAdditionalFlavors] = useState<MenuItem[]>([]);
  const [customBorda, setCustomBorda] = useState<MenuItem | null>(null);
  const [customExtras, setCustomExtras] = useState<ExtraIngredient[]>([]);
  const [customNotes, setCustomNotes] = useState('');

  // Order-level observations (Observações Gerais do Pedido no PDV)
  const [orderNotes, setOrderNotes] = useState('');
  const [motoboys, setMotoboys] = useState<Motoboy[]>([]);
  const [deliveryProvider, setDeliveryProvider] = useState<'proprio' | 'ifood' | 'uber'>('proprio');
  const [selectedMotoboyId, setSelectedMotoboyId] = useState<string>('');
  const [motoboyFee, setMotoboyFee] = useState<string>('');
  const [motoboyFeeTouched, setMotoboyFeeTouched] = useState(false);

  // Promo Pizza Customization specific states
  const [customPromoFlavor, setCustomPromoFlavor] = useState('');
  const [customPromoFlavor2, setCustomPromoFlavor2] = useState('');
  const [customDrinkVariant, setCustomDrinkVariant] = useState<'Normal' | 'Zero'>('Normal');

  // Editing existing item in cart
  const [editingCartIndex, setEditingCartIndex] = useState<number | null>(null);

  // Slot-based interactive flavor search (like modern CRM combobox)
  const [searchingFlavorSlot, setSearchingFlavorSlot] = useState<number | null>(null);
  const [flavorSearchQuery, setFlavorSearchQuery] = useState('');
  const flavorSearchInputRef = useRef<HTMLInputElement>(null);

  // Delivery Zone custom dropdown state
  const [isZoneDropdownOpen, setIsZoneDropdownOpen] = useState(false);
  const zoneDropdownRef = useRef<HTMLDivElement>(null);

  const handleToggleExtra = (extra: ExtraIngredient) => {
    setCustomExtras(prev => {
      const exists = prev.some(e => e.id === extra.id);
      if (exists) {
        return prev.filter(e => e.id !== extra.id);
      } else {
        return [...prev, extra];
      }
    });
  };

  const searchInputRef = useRef<HTMLInputElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const cardsRef = useRef<(HTMLButtonElement | null)[]>([]);

  // Focus flavor search input when opening slot
  useEffect(() => {
    if (searchingFlavorSlot !== null) {
      const timer = setTimeout(() => {
        flavorSearchInputRef.current?.focus();
      }, 60);
      return () => clearTimeout(timer);
    }
  }, [searchingFlavorSlot]);

  // Click outside to close delivery zone dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (zoneDropdownRef.current && !zoneDropdownRef.current.contains(e.target as Node)) {
        setIsZoneDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Global Keyboard Shortcuts (F2 or '/' to search, ESC to dismiss)
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement as HTMLElement;
      const isInputActive = activeEl && ['INPUT', 'TEXTAREA', 'SELECT'].includes(activeEl.tagName);

      if (e.key === 'F2' || (e.key === '/' && !isInputActive)) {
        e.preventDefault();
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
        return;
      }

      if (e.key === 'Escape') {
        if (searchingFlavorSlot !== null) {
          e.preventDefault();
          setSearchingFlavorSlot(null);
          setFlavorSearchQuery('');
          return;
        }
        if (isZoneDropdownOpen) {
          e.preventDefault();
          setIsZoneDropdownOpen(false);
          return;
        }
        if (customizingItem) {
          e.preventDefault();
          setCustomizingItem(null);
          setEditingCartIndex(null);
          return;
        }
        if (searchQuery) {
          e.preventDefault();
          setSearchQuery('');
          return;
        }
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, searchingFlavorSlot, isZoneDropdownOpen, customizingItem, searchQuery, onClose]);


  // History interception for mobile back button removed to prevent modal crashing/blinking and closing unintentionally

  // Load delivery zones and settings
  useEffect(() => {
    if (!isOpen) return;
    const loadDeliverySettings = async () => {
      // carregar motoboys no pdv
      supabase.from('motoboys').select('*').eq('is_active', true).order('name').then(({ data }) => {
        if (data) setMotoboys(data.map((m: any) => ({ ...m, default_fee: Number(m.default_fee) || 0 })));
      });
      try {
        const { data: zonesData } = await supabase
          .from('delivery_zones')
          .select('name, fee')
          .eq('is_active', true)
          .order('sort_order');
        if (zonesData && zonesData.length > 0) {
          setZones(zonesData.map((z: any) => ({ name: z.name, fee: Number(z.fee) })));
          setDeliveryZone(prev => prev || zonesData[0].name);
        }

        const { data: settingsData } = await supabase
          .from('settings')
          .select('key, value')
          .in('key', ['free_delivery_threshold', 'delivery_min_order', 'admin_logo_url']);
        settingsData?.forEach((row: any) => {
          if (row.key === 'free_delivery_threshold') setFreeDeliveryThreshold(Number(row.value) || 0);
          if (row.key === 'admin_logo_url' && row.value) setAdminLogoUrl(row.value);
        });
      } catch (e) {
        console.warn('Erro ao carregar configurações de entrega no PDV:', e);
      }
    };
    loadDeliverySettings();
  }, [isOpen]);

  // Reset on open
  useEffect(() => {
    if (isOpen) {
      setCart([]);
      setCustomerName('');
      setCustomerNif('');
      setCustomerPhone('');
      setTableNumber('');
      setDeliveryAddress('');
      setDeliveryReference('');
      setAdjustmentType('none');
      setAdjustmentValue('');
      setCashAmountGiven('');
      setErrorMessage(null);
      setSearchQuery('');
      setSelectedCategory('all');
      setPaymentMethod('Pix');
      setOrderNotes('');
      setCustomPromoFlavor('');
      setCustomPromoFlavor2('');
      setCustomDrinkVariant('Normal');
    }
  }, [isOpen]);

  // Bordas available
  const bordas = useMemo(() => {
    return menuItems.filter(i => i.category === 'bordas' || i.id.startsWith('bd-'));
  }, [menuItems]);

  // Pizzas for half-and-half
  const pizzasList = useMemo(() => {
    return menuItems.filter(i => i.id.startsWith('p-') || i.category?.includes('pizza') || i.category === 'tradicionais' || i.category === 'especiais');
  }, [menuItems]);

  // Categoria exclusiva do PDV: ADICIONAIS EXTRAS como itens de cardápio selecionáveis
  const extraProductsAsMenuItems: MenuItem[] = useMemo(() => {
    return availableExtras.map(extra => ({
      id: `extra-item-${extra.id}`,
      name: extra.name,
      ingredients: 'Adicional extra para acrescentar na pizza ou pedido',
      priceSingle: extra.price,
      category: 'adicionais-extras',
      imageUrl: ''
    }));
  }, [availableExtras]);

  // Filtered menu items
  const filteredProducts = useMemo(() => {
    // Se a categoria selecionada for a exclusiva do PDV "ADICIONAIS EXTRAS"
    if (selectedCategory === 'adicionais-extras') {
      const q = searchQuery.toLowerCase().trim();
      return extraProductsAsMenuItems.filter(item => {
        return !q || 
          item.name.toLowerCase().includes(q) || 
          (item.ingredients && item.ingredients.toLowerCase().includes(q));
      });
    }

    const regularFiltered = menuItems.filter(item => {
      if (item.category === 'bordas' || item.id.startsWith('bd-')) return false;

      const matchesCat = selectedCategory === 'all' || item.category === selectedCategory;
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = !q || 
        item.name.toLowerCase().includes(q) || 
        (item.ingredients && item.ingredients.toLowerCase().includes(q));

      return matchesCat && matchesSearch;
    });

    // Se estiver na busca global e digitou algo, também busca nos adicionais extras
    if (searchQuery.trim() && selectedCategory === 'all') {
      const q = searchQuery.toLowerCase().trim();
      const matchingExtras = extraProductsAsMenuItems.filter(item => 
        item.name.toLowerCase().includes(q) || (item.ingredients && item.ingredients.toLowerCase().includes(q))
      );
      return [...regularFiltered, ...matchingExtras];
    }

    return regularFiltered;
  }, [menuItems, selectedCategory, searchQuery, extraProductsAsMenuItems]);

  // Categories list (inclui categoria ADICIONAIS EXTRAS somente no PDV)
  const displayCategories = useMemo(() => {
    const counts: Record<string, number> = {};
    (menuItems || []).forEach(i => {
      if (i.category && !i.category.includes('borda') && !i.id.startsWith('bd-')) {
        counts[i.category] = (counts[i.category] || 0) + 1;
      }
    });

    const activeCats = (categories || []).filter(c => c && c.id && (counts[c.id] > 0 || c.id === 'all'));
    return [
      { id: 'all', name: 'Todos os Itens', count: (menuItems || []).filter(i => !i.id.startsWith('bd-')).length },
      ...activeCats.map(c => ({ id: c.id, name: c.name, count: counts[c.id] || 0 })),
      { id: 'adicionais-extras', name: 'ADICIONAIS EXTRAS', count: availableExtras.length }
    ];
  }, [categories, menuItems, availableExtras]);

  // Calculations
  const subtotal = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.totalPrice, 0);
  }, [cart]);

  const isFreeDelivery = useMemo(() => {
    return false; // Dobro não tem entrega grátis
  }, []);

  const deliveryFee = useMemo(() => {
    if (orderType !== 'entrega') return 0;
    if (isFreeDelivery) return 0;
    const found = zones.find(z => z.name === deliveryZone);
    return found ? found.fee : 0;
  }, [orderType, deliveryZone, zones, isFreeDelivery]);

  const adjustmentAmount = useMemo(() => {
    if (adjustmentType === 'none') return 0;
    const val = parseFloat(adjustmentValue) || 0;
    if (val <= 0) return 0;

    let calculated = 0;
    if (adjustmentMode === 'percent') {
      calculated = (subtotal * val) / 100;
    } else {
      calculated = val;
    }

    return adjustmentType === 'discount' ? -calculated : calculated;
  }, [adjustmentType, adjustmentMode, adjustmentValue, subtotal]);

  const totalAmount = useMemo(() => {
    const finalVal = subtotal + deliveryFee + adjustmentAmount;
    return Math.max(0, finalVal);
  }, [subtotal, deliveryFee, adjustmentAmount]);

  const calculatedChange = useMemo(() => {
    if (paymentMethod !== 'Numerário') return 0;
    const given = parseFloat(cashAmountGiven) || 0;
    if (given <= totalAmount) return 0;
    return given - totalAmount;
  }, [paymentMethod, cashAmountGiven, totalAmount]);

  // Preço dinâmico em tempo real dentro do modal de customização
  const currentPreviewPrice = useMemo(() => {
    if (!customizingItem) return 0;
    const isPromoPizza = isPromoWithPizza(customizingItem);

    let basePrice = 0;
    if (isPromoPizza) {
      basePrice = customizingItem.priceSingle || getPizzaPriceForSize(customizingItem, customSize) || 0;
    } else {
      basePrice = getPizzaPriceForSize(customizingItem, customSize);
      if (customAdditionalFlavors.length > 0) {
        for (const flavor of customAdditionalFlavors) {
          const p = getPizzaPriceForSize(flavor, customSize);
          if (p > basePrice) {
            basePrice = p;
          }
        }
      }
    }

    const bordaPrice = customBorda?.priceSingle || 0;
    const extrasPrice = customExtras.reduce((sum, e) => sum + (e.price || 0), 0);
    return basePrice + bordaPrice + extrasPrice;
  }, [customizingItem, customSize, customAdditionalFlavors, customBorda, customExtras]);

  // Select flavor for slot
  const handleSelectFlavor = (slotIndex: number, flavor: MenuItem) => {
    setCustomAdditionalFlavors(prev => {
      const updated = [...prev];
      if (slotIndex < updated.length) {
        updated[slotIndex] = flavor;
      } else {
        updated.push(flavor);
      }
      return updated;
    });
    setSearchingFlavorSlot(null);
    setFlavorSearchQuery('');
  };

  // Edit an item already in the cart
  const handleEditCartItem = (idx: number) => {
    const item = cart[idx];
    if (!item) return;

    setEditingCartIndex(idx);
    setCustomizingItem(item.menuItem);
    setCustomSize(item.size || 'G');
    const flavors = item.additionalFlavors || (item.secondFlavor ? [item.secondFlavor] : []);
    setCustomAdditionalFlavors(flavors);
    setCustomBorda(item.selectedBorda || null);
    setCustomExtras(item.selectedExtras || []);

    // Parse promo details if it's a promo with pizza
    const isPromoPizza = isPromoWithPizza(item.menuItem);
    if (isPromoPizza && item.notes) {
      const parts = item.notes.split(' | ');
      const restNotes: string[] = [];
      let flavor1 = '';
      let flavor2 = '';
      let drink: 'Normal' | 'Zero' = 'Normal';

      parts.forEach(p => {
        if (p.startsWith('Sabor: ')) {
          flavor1 = p.replace('Sabor: ', '').trim();
        } else if (p.startsWith('Sabor 2: ')) {
          flavor2 = p.replace('Sabor 2: ', '').trim();
        } else if (p.startsWith('Bebida: Coca-Cola ')) {
          const v = p.replace('Bebida: Coca-Cola ', '').trim();
          if (v === 'Zero' || v === 'Normal') drink = v;
        } else {
          restNotes.push(p);
        }
      });

      setCustomPromoFlavor(flavor1);
      setCustomPromoFlavor2(flavor2);
      setCustomDrinkVariant(drink);
      setCustomNotes(restNotes.join(' | '));
    } else {
      setCustomPromoFlavor('');
      setCustomPromoFlavor2('');
      setCustomDrinkVariant('Normal');
      setCustomNotes(item.notes || '');
    }

    setSearchingFlavorSlot(null);
    setFlavorSearchQuery('');
  };

  // Handle direct item click
  const handleProductClick = (item: MenuItem) => {
    setEditingCartIndex(null);
    setSearchingFlavorSlot(null);
    setFlavorSearchQuery('');

    // Se for um item avulso da categoria ADICIONAIS EXTRAS, adiciona diretamente ao carrinho
    if (item.category === 'adicionais-extras' || item.id.startsWith('extra-item-')) {
      const unitPrice = item.priceSingle || 0;
      addToCart({
        id: `${item.id}-${Date.now()}`,
        menuItem: item,
        quantity: 1,
        unitPrice,
        totalPrice: unitPrice
      });
      return;
    }

    const hasMultipleSizes = Boolean(item.priceP || item.priceM || item.priceG || item.priceBig || item.priceSuperBig);
    const isPromoPizza = isPromoWithPizza(item);

    // Pizzas and sandubas open the customization window (extras, notes) even with a single size
    const isCustomizable = ['mais-pedidos', 'premium', 'sandubas'].includes(item.category) || item.id.startsWith('p-') || item.id.startsWith('s-');

    if (hasMultipleSizes || isPromoPizza || isCustomizable) {
      setCustomizingItem(item);
      setCustomSize((item.priceG ? 'G' : item.priceM ? 'M' : item.priceP ? 'P' : '') as any);
      setCustomAdditionalFlavors([]);
      setCustomBorda(null);
      setCustomExtras([]);
      setCustomNotes('');
      setCustomPromoFlavor('');
      setCustomPromoFlavor2('');
      setCustomDrinkVariant('Normal');
    } else {
      const unitPrice = item.priceSingle || item.priceP || item.priceM || item.priceG || 0;
      addToCart({
        id: `${item.id}-${Date.now()}`,
        menuItem: item,
        quantity: 1,
        unitPrice,
        totalPrice: unitPrice
      });
    }
  };

  // Add or update customized item from modal
  const handleConfirmCustomization = () => {
    if (!customizingItem) return;

    const isPromoPizza = isPromoWithPizza(customizingItem);
    const hasMultipleSizes = Boolean(customizingItem.priceP || customizingItem.priceM || customizingItem.priceG || customizingItem.priceBig || customizingItem.priceSuperBig);

    let basePrice = 0;
    if (isPromoPizza) {
      basePrice = customizingItem.priceSingle || getPizzaPriceForSize(customizingItem, customSize) || 0;
    } else {
      basePrice = getPizzaPriceForSize(customizingItem, customSize);
      if (customAdditionalFlavors.length > 0) {
        for (const flavor of customAdditionalFlavors) {
          const p = getPizzaPriceForSize(flavor, customSize);
          if (p > basePrice) {
            basePrice = p;
          }
        }
      }
    }

    const bordaPrice = customBorda?.priceSingle || 0;
    const extrasPrice = customExtras.reduce((sum, e) => sum + (e.price || 0), 0);
    const unitPrice = basePrice + bordaPrice + extrasPrice;

    // Constrói as observações finais (com sabor e bebida se for promoção)
    let finalNotes = customNotes.trim();
    if (isPromoPizza) {
      const parts: string[] = [];
      if (customPromoFlavor) {
        parts.push(`Sabor: ${customPromoFlavor}`);
      }
      if (customPromoFlavor2) {
        parts.push(`Sabor 2: ${customPromoFlavor2}`);
      }
      const hasDrink = (customizingItem.name || '').toLowerCase().includes('coca') || 
                       (customizingItem.ingredients || '').toLowerCase().includes('coca') ||
                       (customizingItem.ingredients || '').toLowerCase().includes('bebida');
      if (hasDrink && customDrinkVariant) {
        parts.push(`Bebida: Coca-Cola ${customDrinkVariant}`);
      }
      if (finalNotes) {
        parts.push(finalNotes);
      }
      finalNotes = parts.join(' | ');
    }

    if (editingCartIndex !== null && editingCartIndex >= 0 && editingCartIndex < cart.length) {
      setCart(prev => {
        const updated = [...prev];
        const existing = updated[editingCartIndex];
        const qty = existing.quantity;
        updated[editingCartIndex] = {
          ...existing,
          menuItem: customizingItem,
          size: hasMultipleSizes ? customSize : undefined,
          isHalf: !isPromoPizza && customAdditionalFlavors.length === 1,
          secondFlavor: !isPromoPizza && customAdditionalFlavors.length === 1 ? customAdditionalFlavors[0] : undefined,
          additionalFlavors: !isPromoPizza && customAdditionalFlavors.length > 0 ? customAdditionalFlavors : undefined,
          selectedBorda: customBorda,
          selectedExtras: customExtras.length > 0 ? customExtras : undefined,
          notes: finalNotes || undefined,
          unitPrice,
          totalPrice: unitPrice * qty
        };
        return updated;
      });
      setEditingCartIndex(null);
    } else {
      addToCart({
        id: `${customizingItem.id}-${Date.now()}`,
        menuItem: customizingItem,
        size: hasMultipleSizes ? customSize : undefined,
        isHalf: !isPromoPizza && customAdditionalFlavors.length === 1,
        secondFlavor: !isPromoPizza && customAdditionalFlavors.length === 1 ? customAdditionalFlavors[0] : undefined,
        additionalFlavors: !isPromoPizza && customAdditionalFlavors.length > 0 ? customAdditionalFlavors : undefined,
        selectedBorda: customBorda,
        selectedExtras: customExtras.length > 0 ? customExtras : undefined,
        notes: finalNotes || undefined,
        quantity: 1,
        unitPrice,
        totalPrice: unitPrice
      });
    }

    setCustomizingItem(null);
    setSearchingFlavorSlot(null);
    setFlavorSearchQuery('');
  };

  // Cart operations
  const addToCart = (newItem: PDVCartItem) => {
    setCart(prev => {
      // Find if identical item exists
      const existingIdx = prev.findIndex(item => {
        const itemExtrasIds = (item.selectedExtras || []).map(e => e.id).sort().join(',');
        const newItemExtrasIds = (newItem.selectedExtras || []).map(e => e.id).sort().join(',');

        const itemFlavorsIds = (item.additionalFlavors || []).map(f => f.id).sort().join(',');
        const newItemFlavorsIds = (newItem.additionalFlavors || []).map(f => f.id).sort().join(',');

        return (
          item.menuItem.id === newItem.menuItem.id &&
          item.size === newItem.size &&
          itemFlavorsIds === newItemFlavorsIds &&
          item.selectedBorda?.id === newItem.selectedBorda?.id &&
          itemExtrasIds === newItemExtrasIds &&
          (item.notes || '') === (newItem.notes || '')
        );
      });

      if (existingIdx >= 0) {
        const updated = [...prev];
        const exist = updated[existingIdx];
        const newQty = exist.quantity + newItem.quantity;
        updated[existingIdx] = {
          ...exist,
          quantity: newQty,
          totalPrice: exist.unitPrice * newQty
        };
        return updated;
      }

      return [...prev, newItem];
    });
  };

  const updateCartQuantity = (index: number, delta: number) => {
    setCart(prev => {
      const updated = [...prev];
      const item = updated[index];
      const newQty = item.quantity + delta;
      if (newQty <= 0) {
        return updated.filter((_, i) => i !== index);
      }
      updated[index] = {
        ...item,
        quantity: newQty,
        totalPrice: item.unitPrice * newQty
      };
      return updated;
    });
  };

  const removeCartItem = (index: number) => {
    setCart(prev => prev.filter((_, i) => i !== index));
  };

  // Finalize order
  const handleFinalizeOrder = async () => {
    if (cart.length === 0) {
      setErrorMessage('O carrinho está vazio. Adicione itens antes de finalizar.');
      return;
    }

    if (!customerName.trim()) {
      setErrorMessage('Por favor, informe o nome do cliente.');
      return;
    }

    if (orderType === 'entrega') {
      if (!deliveryAddress.trim()) {
        setErrorMessage('Por favor, informe o endereço de entrega (rua, número etc.).');
        return;
      }
      if (!deliveryZone.trim()) {
        setErrorMessage('Por favor, selecione a zona de entrega.');
        return;
      }
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const formattedItems = cart.map(item => {
        let name = item.menuItem.name;
        if (item.additionalFlavors && item.additionalFlavors.length > 0) {
          const totalFlavors = 1 + item.additionalFlavors.length;
          const fraction = `1/${totalFlavors}`;
          name = `${fraction} ${item.menuItem.name} + ` + item.additionalFlavors.map(f => `${fraction} ${f.name}`).join(' + ');
        } else if (item.isHalf && item.secondFlavor) {
          name = `1/2 ${item.menuItem.name} + 1/2 ${item.secondFlavor.name}`;
        }
        if (item.size) {
          name += ` (${item.size})`;
        }
        if (item.selectedBorda) {
          name += ` [Borda: ${item.selectedBorda.name}]`;
        }
        if (item.selectedExtras && item.selectedExtras.length > 0) {
          name += ` [Extras: ${item.selectedExtras.map(e => e.name).join(', ')}]`;
        }

        const extrasTotalPrice = (item.selectedExtras || []).reduce((sum, e) => sum + (e.price || 0), 0);

        return {
          name,
          category: item.menuItem.category === 'adicionais-extras' ? 'Adicionais' : (item.menuItem.category || 'Geral'),
          quantity: item.quantity,
          priceCalculated: item.unitPrice,
          basePrice: item.unitPrice - extrasTotalPrice,
          notes: item.notes || '',
          extras: (item.selectedExtras || []).map(e => ({ name: e.name, price: e.price }))
        };
      });

      let dbOrderType = 'balcao';
      if (orderType === 'entrega') dbOrderType = 'entrega';
      else if (orderType === 'mesa') dbOrderType = 'mesa';
      else if (orderType === 'retirada') dbOrderType = 'retirada';

      const changeForNum = parseFloat(cashAmountGiven);

      const fullDeliveryAddress = orderType === 'entrega'
        ? `${deliveryAddress.trim()}${deliveryReference.trim() ? ` (Ref: ${deliveryReference.trim()})` : ''}`
        : (orderType === 'mesa' && tableNumber ? `Mesa ${tableNumber}` : null);

      const payload: any = {
        cash_session_id: activeSessionId || null,
        customer_name: customerNif.trim() ? `${customerName.trim()} (CPF: ${customerNif.trim()})` : customerName.trim(),
        nif: customerNif.trim() || null,
        customer_phone: customerPhone.trim() || null,
        order_type: dbOrderType,
        payment_method: paymentMethod,
        status: 'Em Preparo',
        total_amount: Number(totalAmount.toFixed(2)),
        items: formattedItems,
        notes: orderNotes.trim() || null,
        delivery_address: fullDeliveryAddress,
        delivery_zone: orderType === 'entrega' ? deliveryZone : null,
        delivery_provider: orderType === 'entrega' ? deliveryProvider : null,
        motoboy_id: orderType === 'entrega' && deliveryProvider === 'proprio' ? (selectedMotoboyId || null) : null,
        delivery_cost: orderType === 'entrega' ? (parseFloat(motoboyFee.replace(',', '.')) || 0) : null,
        change_for: paymentMethod === 'Numerário' && !isNaN(changeForNum) && changeForNum > totalAmount ? changeForNum : null
      };

      const { data, error } = await supabase
        .from('orders')
        .insert([payload])
        .select()
        .single();

      if (error) throw error;

      // Sincronização automática com tabela de Clientes (CRM)
      if (customerPhone.trim()) {
        try {
          const cleanPhone = customerPhone.trim();
          const cleanName = customerName.trim() || 'Cliente Balcão';
          const { data: existingCustomer } = await supabase
            .from('customers')
            .select('id, total_orders, total_spent')
            .eq('phone', cleanPhone)
            .maybeSingle();

          if (existingCustomer) {
            await supabase.from('customers').update({
              name: cleanName,
              total_orders: (existingCustomer.total_orders || 0) + 1,
              total_spent: (Number(existingCustomer.total_spent) || 0) + Number(totalAmount.toFixed(2)),
              last_order_at: new Date().toISOString(),
            }).eq('id', existingCustomer.id);
          } else {
            await supabase.from('customers').insert([{
              phone: cleanPhone,
              name: cleanName,
              address: fullDeliveryAddress,
              total_orders: 1,
              total_spent: Number(totalAmount.toFixed(2)),
              last_order_at: new Date().toISOString(),
            }]);
          }
        } catch (custErr) {
          console.warn('[PDV] Não foi possível atualizar o cadastro do cliente (CRM):', custErr);
        }
      }

      if (data) {
        onOrderCreated(data);
      }

      onClose();
    } catch (err: any) {
      console.error('Erro ao finalizar pedido no PDV:', err);
      setErrorMessage(err.message || 'Erro ao registrar o pedido no banco de dados.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

    return (
    <div ref={modalRef} className="fixed inset-0 z-50 flex flex-col bg-gray-100 text-gray-900 select-none overflow-hidden animate-in fade-in duration-200 font-sans">
      
      {/* ────────────────── TOP BAR ────────────────── */}
      <header className="h-14 px-4 bg-white border-b border-gray-200 flex items-center justify-between gap-3 shrink-0 shadow-2xs z-10">
        
        {/* Left: Branding & Order Type Selector */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2.5 pr-3 border-r border-gray-200">
            <div className="w-10 h-10 rounded-xl overflow-hidden bg-black border border-[#0b520a] shrink-0 flex items-center justify-center p-0.5 shadow-sm">
              <img 
                src={adminLogoUrl || "/dobro/logo-dobro.png"} 
                alt="DOBRO Pizzas" 
                className="w-full h-full object-contain rounded-lg"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = "/dobro/logo-dobro.png";
                }}
              />
            </div>
            <div>
              <h1 className="text-sm font-black text-gray-900 tracking-tight leading-none">Terminal PDV</h1>
              <span className="text-[10px] font-bold text-gray-500 uppercase flex items-center gap-1.5 mt-0.5 tracking-wider">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                CAIXA RÁPIDO
              </span>
            </div>
          </div>

          {/* Type Pills */}
          <div className="flex items-center bg-gray-100 p-0.5 rounded-lg">
            <button
              onClick={() => setOrderType('retirada')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer ${
                orderType === 'retirada'
                  ? 'bg-white text-red-600 shadow-2xs ring-1 ring-gray-200'
                  : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              <Store size={13} />
              <span>Balcão</span>
            </button>
            <button
              onClick={() => setOrderType('mesa')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer ${
                orderType === 'mesa'
                  ? 'bg-white text-yellow-600 shadow-2xs ring-1 ring-gray-200'
                  : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              <Utensils size={13} />
              <span>Mesa</span>
            </button>
            <button
              onClick={() => setOrderType('entrega')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer ${
                orderType === 'entrega'
                  ? 'bg-white text-blue-600 shadow-2xs ring-1 ring-gray-200'
                  : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              <Bike size={13} />
              <span>Entrega</span>
            </button>
          </div>
        </div>

        {/* Center: Live Product Search */}
        <div className="flex-1 max-w-md relative mx-2">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Buscar produto..."
            className="w-full h-9 pl-9 pr-8 bg-white text-gray-800 text-xs rounded-full border border-gray-200 focus:border-red-500 focus:ring-2 focus:ring-red-50 focus:outline-none transition-all font-medium placeholder-gray-400 shadow-2xs"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 bg-gray-100 rounded-full p-0.5 cursor-pointer"
            >
              <X size={12} />
            </button>
          )}
        </div>

        {/* Right: Cash Session badge & Close */}
        <div className="flex items-center gap-3">
          {activeSessionId ? (
            <span className="text-[10px] font-bold text-green-700 bg-green-100 px-2.5 py-1 rounded-full uppercase tracking-wider">
              Caixa Aberto
            </span>
          ) : (
            <span className="text-[10px] font-bold text-yellow-700 bg-yellow-100 px-2.5 py-1 rounded-full uppercase tracking-wider flex items-center gap-1">
              <AlertCircle size={12} /> Fechado
            </span>
          )}

          <button
            onClick={() => {
              if (cart.length > 0 && !window.confirm('Deseja cancelar o pedido atual e voltar ao Gestor?')) {
                return;
              }
              onClose();
            }}
            className="h-8 px-3 bg-[#083d07] hover:bg-[#0b520a] text-white rounded-lg text-[11px] font-bold flex items-center gap-1.5 transition-all shadow-2xs active:translate-y-px cursor-pointer"
            title="Voltar ao Gestor de Pedidos"
          >
            <ArrowLeft size={14} className="stroke-[2.5]" />
            <span className="hidden sm:inline font-mono uppercase tracking-wider">Voltar</span>
          </button>
        </div>
      </header>

      {/* ────────────────── MAIN 2-COLUMN WORKSPACE ────────────────── */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden relative">
        
        {/* COLUMN 1: LEFT AREA (CATEGORIES + GRID) */}
        <div className="flex-1 flex flex-col min-w-0 bg-white lg:bg-[var(--pdv-bg)]">
          
          {/* COMPACT CATEGORIES BAR (No cutoff, no scrollbar needed) */}
          <nav className="w-full bg-[var(--pdv-surface)] border-b border-[var(--pdv-border)] flex flex-wrap items-center shrink-0 px-3 py-2 gap-1.5 shadow-[var(--pdv-shadow-sm)] z-10">
            {displayCategories.map(cat => {
              const isActive = selectedCategory === cat.id;
              const isExtrasCat = cat.id === 'adicionais-extras';

              let buttonStyle = '';
              if (isExtrasCat) {
                buttonStyle = isActive
                  ? 'bg-[#D5AF7A] text-[#44210F] border-[#D5AF7A] shadow-xs font-black'
                  : 'bg-[#F6E3DF] text-[#44210F] border-[#E4C5B9] hover:bg-[#E8D8D1] hover:text-[#44210F] font-extrabold';
              } else if (isActive) {
                buttonStyle = 'bg-[#E8D8D1] text-[#083D07] border-[#D5AF7A] shadow-xs font-bold';
              } else {
                buttonStyle = 'bg-[var(--pdv-surface)] text-[var(--pdv-text-secondary)] border-[var(--pdv-border)] hover:bg-[var(--pdv-surface-hover)] hover:text-[var(--pdv-text-primary)]';
              }

              return (
                <button
                  key={cat.id}
                  onClick={() => {
                    setSelectedCategory(cat.id);
                    setSearchQuery('');
                  }}
                  className={`flex items-center justify-center px-2.5 py-1 rounded-[var(--pdv-radius-full)] text-[11px] font-bold transition-all cursor-pointer active:scale-95 border ${buttonStyle}`}
                >
                  {isExtrasCat && <Sparkles size={11} className="mr-1" />}
                  <span className="whitespace-nowrap">{cat.name}</span>
                </button>
              );
            })}
          </nav>

          {/* PRODUCT CATALOG GRID */}
          <main className="flex-1 p-2.5 sm:p-3.5 lg:p-4 overflow-y-auto custom-scrollbar">
          {menuLoading ? (
            <div className="h-full flex flex-col items-center justify-center text-gray-400">
              <div className="w-8 h-8 border-3 border-red-500 border-t-transparent rounded-full animate-spin mb-3" />
              <p className="text-xs font-bold uppercase tracking-wide">Carregando Cardápio...</p>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-gray-400">
              <Search size={36} className="mb-3 opacity-20" />
              <p className="text-base font-bold text-gray-500">Nenhum produto encontrado</p>
              <p className="text-xs mt-0.5">Navegue pelas categorias na lateral.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-2 2xl:grid-cols-3 gap-3.5 sm:gap-4">
              {filteredProducts.map(product => {
                const hasSizes = Boolean(product.priceP || product.priceM || product.priceG);
                const displayPrice = product.priceG || product.priceM || product.priceSingle || product.priceP || 0;
                const isPromoItem = 
                  product.category === 'promocoes' || 
                  product.category?.toLowerCase().includes('promo') || 
                  product.id?.startsWith('md-') ||
                  selectedCategory === 'promocoes' ||
                  selectedCategory?.toLowerCase().includes('promo');
                const isExtraItem = product.category === 'adicionais-extras' || product.id?.startsWith('extra-item-');
                const isPizza = product.category === 'tradicionais' || product.category === 'premium' || product.category === 'mais-pedidos' || product.id?.startsWith('p-');

                return (
                  <button
                    key={product.id}
                    ref={(el) => {
                      if (el) cardsRef.current.push(el);
                    }}
                    onClick={() => handleProductClick(product)}
                    className="group bg-white rounded-2xl p-3.5 sm:p-4 flex items-start justify-between gap-3 sm:gap-4 text-left transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:border-[#D5AF7A] shadow-xs cursor-pointer active:scale-[0.99] relative border border-[#E8D8D1] touch-manipulation select-none"
                  >
                    {/* Informações Textuais (Estilo Cardápio) */}
                    <div className="flex-1 flex flex-col justify-between h-full min-h-[92px] sm:min-h-[104px]">
                      <div>
                        <div className="flex items-center gap-1.5 mb-1">
                          <h3 className="font-bold text-sm sm:text-[15px] text-[#44210F] leading-snug group-hover:text-[#083D07] transition-colors">
                            {product.name}
                          </h3>
                        </div>
                        <p className="text-xs sm:text-[13px] text-[#745240] line-clamp-2 leading-relaxed pr-1.5 mt-0.5">
                          {product.ingredients || ''}
                        </p>
                      </div>

                      <div className="mt-3 flex items-center justify-between pr-1">
                        <div className="flex items-center gap-1.5">
                          <span className="font-extrabold text-[#083D07] text-[15px] sm:text-base">
                            R$ {displayPrice.toFixed(2).replace('.', ',')}
                          </span>
                          {isPizza && (
                            <span className="text-[10px] font-bold text-[#745240] bg-[#e8d8d1]/70 px-1.5 py-0.5 rounded tracking-tight">
                              28cm
                            </span>
                          )}
                          {hasSizes && (
                            <span className="text-[9px] font-bold text-[#745240] uppercase tracking-tight">
                              A partir
                            </span>
                          )}
                        </div>

                        <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[#E8D8D1] text-[#083D07] border border-[#d5af7a]/60 flex items-center justify-center font-black shadow-2xs group-hover:bg-[#d5af7a] group-hover:text-[#083d07] transition-all shrink-0">
                          <Plus size={15} className="stroke-[2.5]" />
                        </div>
                      </div>
                    </div>

                    {/* Foto Lateral Estilo Cardápio Digital Oficial */}
                    <div className="w-[88px] h-[88px] sm:w-[104px] sm:h-[104px] shrink-0 rounded-xl overflow-hidden bg-stone-100 border border-[#E8D8D1] shadow-2xs relative flex items-center justify-center">
                      {isExtraItem ? (
                        <div className="w-full h-full bg-gradient-to-br from-[#F6E3DF] to-[#E8D8D1] flex flex-col items-center justify-center text-[#44210F] p-2">
                          <Sparkles size={24} className="text-[#D5AF7A] mb-1" />
                          <span className="text-[8.5px] font-black uppercase tracking-wider text-[#44210F] text-center">Adicional</span>
                        </div>
                      ) : (
                        <PDVProductImage 
                          product={product} 
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      )}
                      {hasSizes && (
                        <span className="absolute top-1.5 right-1.5 bg-white/95 text-[#083D07] text-[7.5px] font-black uppercase px-1.5 py-0.5 rounded-full shadow-2xs backdrop-blur-2xs border border-[#E8D8D1]">
                          P · M · G · B · GG
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}            </div>
          )}
        </main>
        </div>

        {/* COLUMN 3: CART & CHECKOUT (Compact ergonomics & expansive catalog) */}
        <aside className="w-full h-[60vh] lg:h-full lg:w-[390px] xl:w-[430px] 2xl:w-[460px] bg-white border-t lg:border-t-0 lg:border-l border-gray-200 flex flex-col shrink-0 shadow-2xl z-20 overflow-hidden">
          
          {/* Section 1: Order Type Selector & Customer / Delivery Details (Ultra-Compact) */}
          <div className="p-2 bg-stone-50 border-b border-stone-200 space-y-1.5 shrink-0">
            {/* Direct Order Type Tabs */}
            <div className="grid grid-cols-3 gap-1 bg-stone-200/80 p-0.5 rounded-lg">
              <button
                onClick={() => setOrderType('retirada')}
                className={`flex items-center justify-center gap-1 py-1 rounded-md text-[11px] font-mono font-bold transition-all cursor-pointer ${
                  orderType === 'retirada'
                    ? 'bg-white text-stone-900 shadow-2xs'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                <Store size={11} />
                <span>Balcão</span>
              </button>
              <button
                onClick={() => setOrderType('mesa')}
                className={`flex items-center justify-center gap-1 py-1 rounded-md text-[11px] font-mono font-bold transition-all cursor-pointer ${
                  orderType === 'mesa'
                    ? 'bg-amber-500 text-white shadow-2xs'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                <Utensils size={11} />
                <span>Mesa</span>
              </button>
              <button
                onClick={() => setOrderType('entrega')}
                className={`flex items-center justify-center gap-1 py-1 rounded-md text-[11px] font-mono font-bold transition-all cursor-pointer ${
                  orderType === 'entrega'
                    ? 'bg-blue-600 text-white shadow-2xs'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                <Bike size={11} />
                <span>Entrega</span>
              </button>
            </div>

            {/* Inputs based on Order Type */}
            {orderType === 'retirada' && (
              <div className="space-y-2 pt-1">
                <input
                  type="text"
                  value={customerName}
                  onChange={e => setCustomerName(e.target.value)}
                  placeholder="Nome do Cliente *"
                  className="w-full h-9 px-3 bg-white border border-stone-300 rounded-lg text-xs sm:text-[13px] font-bold text-stone-900 focus:border-[#083D07] focus:ring-1 focus:ring-[#083D07]/20 focus:outline-none transition-all placeholder:text-stone-400 placeholder:font-normal shadow-2xs"
                />
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="tel"
                    value={customerPhone}
                    onChange={e => setCustomerPhone(e.target.value)}
                    placeholder="Telefone (opcional)"
                    className="w-full h-9 px-3 bg-white border border-stone-300 rounded-lg text-xs sm:text-[13px] font-mono font-medium text-stone-900 focus:border-[#083D07] focus:ring-1 focus:ring-[#083D07]/20 focus:outline-none transition-all placeholder:text-stone-400 placeholder:font-normal shadow-2xs"
                  />
                  <input
                    type="text"
                    value={customerNif}
                    onChange={e => setCustomerNif(e.target.value)}
                    placeholder="CPF na nota (opcional)"
                    className="w-full h-9 px-3 bg-white border border-stone-300 rounded-lg text-xs sm:text-[13px] font-medium text-stone-900 focus:border-[#083D07] focus:ring-1 focus:ring-[#083D07]/20 focus:outline-none transition-all placeholder:text-stone-400 placeholder:font-normal shadow-2xs"
                  />
                </div>
              </div>
            )}

            {orderType === 'mesa' && (
              <div className="space-y-2 pt-1">
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={tableNumber}
                    onChange={e => setTableNumber(e.target.value)}
                    placeholder="Nº Mesa / Comanda *"
                    className="w-full h-9 px-3 bg-white border border-stone-300 rounded-lg text-xs sm:text-[13px] font-mono font-bold text-stone-900 focus:border-amber-500 focus:ring-1 focus:ring-amber-100 focus:outline-none transition-all placeholder:text-stone-400 placeholder:font-normal shadow-2xs"
                  />
                  <input
                    type="text"
                    value={customerName}
                    onChange={e => setCustomerName(e.target.value)}
                    placeholder="Nome do Cliente *"
                    className="w-full h-9 px-3 bg-white border border-stone-300 rounded-lg text-xs sm:text-[13px] font-bold text-stone-900 focus:border-amber-500 focus:ring-1 focus:ring-amber-100 focus:outline-none transition-all placeholder:text-stone-400 placeholder:font-normal shadow-2xs"
                  />
                </div>
                <input
                  type="text"
                  value={customerNif}
                  onChange={e => setCustomerNif(e.target.value)}
                  placeholder="CPF na nota (opcional)"
                  className="w-full h-9 px-3 bg-white border border-stone-300 rounded-lg text-xs sm:text-[13px] font-medium text-stone-900 focus:border-amber-500 focus:ring-1 focus:ring-amber-100 focus:outline-none transition-all placeholder:text-stone-400 placeholder:font-normal shadow-2xs"
                />
              </div>
            )}

            {orderType === 'entrega' && (
              <div className="space-y-2 pt-1">
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={customerName}
                    onChange={e => setCustomerName(e.target.value)}
                    placeholder="Nome do Cliente *"
                    className="w-full h-9 px-3 bg-white border border-stone-300 rounded-lg text-xs sm:text-[13px] font-bold text-stone-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-100 focus:outline-none transition-all placeholder:text-stone-400 placeholder:font-normal shadow-2xs"
                  />
                  <input
                    type="tel"
                    value={customerPhone}
                    onChange={e => setCustomerPhone(e.target.value)}
                    placeholder="Telefone (opcional)"
                    className="w-full h-9 px-3 bg-white border border-stone-300 rounded-lg text-xs sm:text-[13px] font-mono font-medium text-stone-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-100 focus:outline-none transition-all placeholder:text-stone-400 placeholder:font-normal shadow-2xs"
                  />
                </div>

                <input
                  type="text"
                  value={customerNif}
                  onChange={e => setCustomerNif(e.target.value)}
                  placeholder="CPF na nota (opcional)"
                  className="w-full h-9 px-3 bg-white border border-stone-300 rounded-lg text-xs sm:text-[13px] font-medium text-stone-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-100 focus:outline-none transition-all placeholder:text-stone-400 placeholder:font-normal shadow-2xs"
                />

                <div>
                  <input
                    type="text"
                    value={deliveryAddress}
                    onChange={e => setDeliveryAddress(e.target.value)}
                    placeholder="Endereço / Rua, Nº, Bairro, CEP *"
                    className="w-full h-9 px-3 bg-white border border-stone-300 rounded-lg text-xs sm:text-[13px] font-medium text-stone-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-100 focus:outline-none transition-all placeholder:text-stone-400 placeholder:font-normal shadow-2xs"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {zones.length > 0 && (
                    <div ref={zoneDropdownRef} className="relative">
                      <button
                        type="button"
                        onClick={() => setIsZoneDropdownOpen(!isZoneDropdownOpen)}
                        className="w-full h-9 px-3 bg-white border border-stone-300 rounded-lg text-xs sm:text-[13px] font-bold text-stone-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-100 focus:outline-none cursor-pointer shadow-2xs flex items-center justify-between text-left"
                      >
                        <span className="truncate flex-1">
                          {deliveryZone || 'Selecione a Zona'}
                        </span>
                        <ChevronDown size={11} className={`text-stone-400 shrink-0 ml-1 transition-transform ${isZoneDropdownOpen ? 'rotate-180' : ''}`} />
                      </button>

                      {isZoneDropdownOpen && (
                        <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-stone-200 rounded-lg shadow-xl z-50 py-1 max-h-48 overflow-y-auto animate-in fade-in zoom-in-95 duration-100">
                          {zones.map(z => {
                            const isSelected = deliveryZone === z.name;
                            const feeDisplay = isFreeDelivery ? 'Grátis!' : `+R$ ${z.fee.toFixed(2).replace('.', ',')}`;
                            return (
                              <button
                                key={z.name}
                                type="button"
                                onClick={() => {
                                  setDeliveryZone(z.name);
                                  setIsZoneDropdownOpen(false);
                                }}
                                className={`w-full px-2 py-1.5 text-left text-xs flex items-center justify-between transition-colors cursor-pointer ${
                                  isSelected ? 'bg-blue-50 text-blue-900 font-bold' : 'text-stone-800 hover:bg-stone-50'
                                }`}
                              >
                                <span className="truncate">{z.name}</span>
                                <span className={`text-[10px] font-mono shrink-0 ml-2 ${isFreeDelivery ? 'text-emerald-600 font-bold' : 'text-stone-500'}`}>
                                  {feeDisplay}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                  <input
                    type="text"
                    value={deliveryReference}
                    onChange={e => setDeliveryReference(e.target.value)}
                    placeholder="Ref. / Complemento"
                    className="w-full h-9 px-3 bg-white border border-stone-300 rounded-lg text-xs sm:text-[13px] font-medium text-stone-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-100 focus:outline-none transition-all placeholder:text-stone-400 placeholder:font-normal shadow-2xs"
                  />
                </div>

                {/* Responsável pela Entrega / Motoboy */}
                <div className="p-2.5 bg-blue-50/60 rounded-xl border border-blue-200/80 space-y-2 mt-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-mono font-bold text-blue-950 uppercase flex items-center gap-1.5">
                      <Bike size={13} className="text-blue-700" />
                      Responsável pela Entrega
                    </span>
                    <span className="text-[10px] font-bold text-blue-700">
                      {deliveryProvider === 'proprio' ? 'Próprio' : deliveryProvider === 'ifood' ? 'iFood' : 'Uber'}
                    </span>
                  </div>

                  {/* Provider Pills */}
                  <div className="grid grid-cols-3 gap-1.5">
                    <button
                      type="button"
                      onClick={() => setDeliveryProvider('proprio')}
                      className={`py-1.5 px-2 rounded-lg text-xs font-bold transition-all border cursor-pointer ${
                        deliveryProvider === 'proprio'
                          ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                          : 'bg-white text-stone-700 border-stone-200 hover:bg-stone-50'
                      }`}
                    >
                      Próprio
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setDeliveryProvider('ifood');
                        setSelectedMotoboyId('');
                        setMotoboyFee('0');
                      }}
                      className={`py-1.5 px-2 rounded-lg text-xs font-bold transition-all border cursor-pointer ${
                        deliveryProvider === 'ifood'
                          ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                          : 'bg-white text-stone-700 border-stone-200 hover:bg-stone-50'
                      }`}
                    >
                      iFood
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setDeliveryProvider('uber');
                        setSelectedMotoboyId('');
                        setMotoboyFee('0');
                      }}
                      className={`py-1.5 px-2 rounded-lg text-xs font-bold transition-all border cursor-pointer ${
                        deliveryProvider === 'uber'
                          ? 'bg-stone-900 text-white border-stone-900 shadow-xs'
                          : 'bg-white text-stone-700 border-stone-200 hover:bg-stone-50'
                      }`}
                    >
                      Uber
                    </button>
                  </div>

                  {/* Se Próprio: Selecionar Motoboy Cadastrado e Taxa */}
                  {deliveryProvider === 'proprio' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                      <div>
                        <label className="block text-[10px] font-bold text-stone-600 uppercase mb-1">
                          Motoboy Cadastrado
                        </label>
                        <select
                          value={selectedMotoboyId}
                          onChange={e => {
                            const mId = e.target.value;
                            setSelectedMotoboyId(mId);
                            const m = motoboys.find(item => item.id === mId);
                            if (m && m.default_fee) {
                              setMotoboyFee(m.default_fee.toString());
                            }
                          }}
                          className="w-full h-8.5 px-2 bg-white border border-blue-300 rounded-lg text-xs font-bold text-stone-900 focus:outline-none focus:ring-2 focus:ring-blue-200"
                        >
                          <option value="">Selecione o Motoboy...</option>
                          {motoboys.map(m => (
                            <option key={m.id} value={m.id}>
                              {m.name} {m.default_fee ? `(R$ ${m.default_fee.toFixed(2)})` : ''}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-stone-600 uppercase mb-1">
                          Taxa do Motoboy (R$)
                        </label>
                        <div className="relative">
                          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-stone-400">R$</span>
                          <input
                            type="number"
                            step="0.5"
                            value={motoboyFee}
                            onChange={e => {
                              setMotoboyFee(e.target.value);
                              setMotoboyFeeTouched(true);
                            }}
                            placeholder="0,00"
                            className="w-full h-8.5 pl-8 pr-2 bg-white border border-blue-300 rounded-lg text-xs font-mono font-bold text-stone-900 focus:outline-none focus:ring-2 focus:ring-blue-200"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {isFreeDelivery && (
                  <div className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-200 text-[9px] font-mono font-bold flex items-center justify-between">
                    <span>🎉 Entrega Grátis!</span>
                    <span>R$ 0,00</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Section 2: Items in Cart (Ultra-Compact Item Cards) */}
          <div className="flex-1 min-h-0 overflow-y-auto px-2.5 py-1.5 bg-white space-y-1 custom-scrollbar">
            <div className="flex items-center justify-between pb-1 border-b border-stone-100">
              <div className="flex items-center gap-1">
                <ShoppingBag size={12} className="text-stone-700" />
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-stone-900">
                  Meu Pedido
                </span>
                <span className="bg-[#083d07] text-white min-w-4 h-4 px-1 flex items-center justify-center rounded-full text-[9px] font-mono font-bold">
                  {cart.reduce((s, i) => s + i.quantity, 0)}
                </span>
              </div>

              {cart.length > 0 && (
                <button
                  onClick={() => setCart([])}
                  className="text-[9px] text-rose-600 hover:text-rose-700 font-bold uppercase flex items-center gap-0.5 cursor-pointer bg-rose-50 hover:bg-rose-100 px-1.5 py-0.2 rounded transition-colors"
                >
                  <Trash2 size={9} /> Limpar
                </button>
              )}
            </div>

            {cart.length === 0 ? (
              <div className="h-28 flex flex-col items-center justify-center text-stone-400">
                <div className="w-8 h-8 bg-stone-50 rounded-lg flex items-center justify-center mb-1 border border-dashed border-stone-200 text-stone-300">
                  <ShoppingBag size={14} />
                </div>
                <p className="text-[11px] font-bold text-stone-600">Carrinho Vazio</p>
                <p className="text-[9px] text-stone-400 text-center max-w-[160px] mt-0.5">
                  Toque nos produtos ao lado para incluir.
                </p>
              </div>
            ) : (
              <div className="space-y-1">
                {cart.map((item, idx) => {
                  const isCustomizable = isItemCustomizable(item.menuItem);
                  const isBeingEdited = editingCartIndex === idx;

                  return (
                  <div 
                    key={item.id} 
                    className={`rounded-lg p-1.5 shadow-2xs transition-all flex flex-col gap-0.5 border ${
                      isBeingEdited 
                        ? 'bg-amber-50/60 border-amber-400 ring-2 ring-amber-300/50' 
                        : 'bg-stone-50/90 hover:bg-stone-50 border-stone-200/80'
                    }`}
                  >
                    {/* Top Row: Qty Badge, Product Name, and Item Total */}
                    <div className="flex items-start justify-between gap-1">
                      <div className="flex items-center gap-1.5 flex-1 min-w-0">
                        <span className="w-4.5 h-4.5 rounded bg-stone-200 text-stone-800 font-mono font-bold text-[10px] flex items-center justify-center shrink-0">
                          {item.quantity}x
                        </span>
                        <h4 
                          onClick={() => {
                            if (isCustomizable) handleEditCartItem(idx);
                          }}
                          className={`font-bold text-[11px] text-stone-900 truncate leading-tight ${isCustomizable ? 'hover:text-amber-800 cursor-pointer' : ''}`} 
                          title={isCustomizable ? "Clique para editar esta pizza" : item.menuItem.name}
                        >
                          {item.menuItem.name}
                        </h4>
                      </div>
                      <span className="font-black font-mono text-[11px] text-stone-900 shrink-0">
                        R$ {item.totalPrice.toFixed(2).replace('.', ',')}
                      </span>
                    </div>

                    {/* Customizations / Badges */}
                    {(item.size || (item.additionalFlavors && item.additionalFlavors.length > 0) || (item.isHalf && item.secondFlavor) || item.selectedBorda || (item.selectedExtras && item.selectedExtras.length > 0) || item.notes) && (
                      <div className="flex flex-wrap items-center gap-0.5 pl-6">
                        {item.size && (
                          <span className="px-1 py-0.2 rounded bg-amber-100/90 text-amber-900 border border-amber-200/80 text-[8.5px] font-mono font-bold">
                            Tam {item.size}
                          </span>
                        )}
                        {item.additionalFlavors && item.additionalFlavors.length > 0 ? (
                          <span className="px-1 py-0.2 rounded bg-orange-100/90 text-orange-900 border border-orange-200/80 text-[8.5px] font-mono font-bold">
                            {item.additionalFlavors.length + 1} Sabores (+ {item.additionalFlavors.map(f => f.name).join(', ')})
                          </span>
                        ) : item.isHalf && item.secondFlavor ? (
                          <span className="px-1 py-0.2 rounded bg-orange-100/90 text-orange-900 border border-orange-200/80 text-[8.5px] font-mono font-bold">
                            ½ {item.secondFlavor.name}
                          </span>
                        ) : null}
                        {item.selectedBorda && (
                          <span className="px-1 py-0.2 rounded bg-emerald-100/90 text-emerald-900 border border-emerald-200/80 text-[8.5px] font-mono font-bold">
                            + {item.selectedBorda.name}
                          </span>
                        )}
                        {item.selectedExtras && item.selectedExtras.map(extra => (
                          <span key={extra.id} className="px-1 py-0.2 rounded bg-[#F6E3DF] text-[#44210F] border border-[#E4C5B9] text-[8.5px] font-mono font-bold">
                            + {extra.name} (R$ {extra.price.toFixed(2).replace('.', ',')})
                          </span>
                        ))}
                        {item.notes && (
                          <span className="px-1 py-0.2 rounded bg-stone-200/90 text-stone-700 text-[8.5px] font-medium italic truncate max-w-[150px]">
                            Obs: {item.notes}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Bottom Controls Row: Horizontal Stepper + Unit Price + Delete Button */}
                    <div className="flex items-center justify-between pt-0.5 border-t border-stone-200/60 pl-6">
                      <div className="flex items-center gap-1">
                        <div className="flex items-center bg-white border border-stone-300 rounded overflow-hidden shadow-2xs h-5">
                          <button
                            onClick={() => updateCartQuantity(idx, -1)}
                            className="w-4.5 h-full flex items-center justify-center text-stone-600 hover:bg-stone-100 hover:text-stone-900 active:scale-95 transition-colors cursor-pointer"
                            title="Diminuir"
                          >
                            <Minus size={9} className="stroke-[3]" />
                          </button>
                          <span className="w-5 text-center font-mono font-bold text-[10px] text-stone-900">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => updateCartQuantity(idx, 1)}
                            className="w-4.5 h-full flex items-center justify-center text-stone-600 hover:bg-stone-100 hover:text-stone-900 active:scale-95 transition-colors cursor-pointer"
                            title="Aumentar"
                          >
                            <Plus size={9} className="stroke-[3]" />
                          </button>
                        </div>
                        <span className="text-[9px] font-mono text-stone-400">
                          (R$ {item.unitPrice.toFixed(2).replace('.', ',')} un)
                        </span>
                      </div>

                      <div className="flex items-center gap-1">
                        {isCustomizable && (
                          <button
                            type="button"
                            onClick={() => handleEditCartItem(idx)}
                            className={`p-1 rounded transition-colors cursor-pointer ${
                              isBeingEdited 
                                ? 'text-amber-800 bg-amber-100' 
                                : 'text-stone-400 hover:text-amber-700 hover:bg-amber-50'
                            }`}
                            title="Editar este item"
                          >
                            <Edit2 size={10} />
                          </button>
                        )}
                        <button
                          onClick={() => removeCartItem(idx)}
                          className="p-0.5 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                          title="Remover item"
                        >
                          <Trash2 size={11} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
              </div>
            )}
          </div>

          {/* Section: Observações do Pedido */}
          <div className="px-2.5 py-1.5 bg-stone-50 border-t border-stone-200 shrink-0">
            <div className="flex items-center justify-between mb-1">
              <label htmlFor="pdv-order-notes" className="text-[9.5px] font-mono font-bold uppercase tracking-wider text-stone-600 flex items-center gap-1 cursor-pointer">
                <FileText size={11} className="text-stone-500" />
                <span>Observações do Pedido</span>
              </label>
              {orderNotes.trim() && (
                <button
                  type="button"
                  onClick={() => setOrderNotes('')}
                  className="text-[9px] text-rose-500 hover:text-rose-700 font-bold transition-colors cursor-pointer"
                >
                  Limpar
                </button>
              )}
            </div>
            <textarea
              id="pdv-order-notes"
              value={orderNotes}
              onChange={e => setOrderNotes(e.target.value)}
              placeholder="Ex: sem cebola, massa crocante, enviar talheres, entregar após 20h..."
              rows={2}
              className="w-full px-2 py-1 bg-white border border-stone-300 rounded text-[11px] text-stone-900 placeholder:text-stone-400 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-200 resize-none transition-all leading-snug"
            />
          </div>

          {/* Section 3: Adjustments (Desconto / Acréscimo) - Ultra Compact */}
          <div className="px-2.5 py-1 bg-stone-50 border-t border-stone-200 flex items-center justify-between gap-1 shrink-0">
            <div className="flex items-center gap-0.5 bg-stone-200/80 p-0.5 rounded text-[9px] font-mono font-bold">
              <button
                onClick={() => setAdjustmentType(adjustmentType === 'discount' ? 'none' : 'discount')}
                className={`px-1.5 py-0.2 rounded transition-all cursor-pointer ${
                  adjustmentType === 'discount' ? 'bg-white text-rose-700 shadow-2xs border border-stone-200' : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                Desconto
              </button>
              <button
                onClick={() => setAdjustmentType(adjustmentType === 'surcharge' ? 'none' : 'surcharge')}
                className={`px-1.5 py-0.2 rounded transition-all cursor-pointer ${
                  adjustmentType === 'surcharge' ? 'bg-white text-blue-700 shadow-2xs border border-stone-200' : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                Acréscimo
              </button>
            </div>

            {adjustmentType !== 'none' && (
              <div className="flex items-center gap-0.5 bg-white border border-stone-300 rounded p-0.5 shadow-2xs h-5.5">
                <button 
                  onClick={() => setAdjustmentMode('fixed')} 
                  className={`px-1 py-0.2 text-[8.5px] font-mono font-bold rounded cursor-pointer ${adjustmentMode === 'fixed' ? 'bg-[#083d07] text-white' : 'text-stone-500'}`}
                >R$</button>
                <button 
                  onClick={() => setAdjustmentMode('percent')} 
                  className={`px-1 py-0.2 text-[8.5px] font-mono font-bold rounded cursor-pointer ${adjustmentMode === 'percent' ? 'bg-[#083d07] text-white' : 'text-stone-500'}`}
                >
                  %
                </button>
                <input
                  type="number" step="0.1" min="0"
                  value={adjustmentValue}
                  onChange={e => setAdjustmentValue(e.target.value)}
                  placeholder="0.00"
                  className="w-10 text-right bg-transparent text-[11px] font-mono font-bold text-stone-900 focus:outline-none pr-0.5"
                />
              </div>
            )}
          </div>

          {/* Section 4: Payment Method & Change - Ultra Compact */}
          <div className="px-2.5 py-1.5 bg-white border-t border-stone-200 space-y-1 shrink-0">
            <div className="flex items-center justify-between">
              <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-stone-500">
                Pagamento
              </span>
              {paymentMethod === 'Numerário' && calculatedChange > 0 && (
                <span className="text-[10px] font-mono font-bold text-emerald-700 bg-emerald-50 px-1 py-0.2 rounded border border-emerald-200">
                  Troco: R$ {calculatedChange.toFixed(2).replace('.', ',')}
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 pt-1">
              <button
                type="button"
                onClick={() => setPaymentMethod('Pix')}
                className={`py-2 px-2 rounded-xl text-xs font-mono font-bold flex flex-col items-center justify-center gap-1 transition-all cursor-pointer border ${
                  paymentMethod === 'Pix'
                    ? 'border-[#D5AF7A] bg-[#F6E3DF] text-[#44210F] shadow-sm ring-1 ring-[#D5AF7A]'
                    : 'border-stone-200 bg-white text-stone-700 hover:bg-stone-50'
                }`}
              >
                <Smartphone size={14} className={paymentMethod === 'Pix' ? 'text-[#44210F]' : 'text-stone-400'} />
                <span>Pix</span>
              </button>
              <button
                type="button"
                onClick={() => setPaymentMethod('Numerário')}
                className={`py-2 px-2 rounded-xl text-xs font-mono font-bold flex flex-col items-center justify-center gap-1 transition-all cursor-pointer border ${
                  paymentMethod === 'Numerário'
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-800 shadow-sm ring-1 ring-emerald-500'
                    : 'border-stone-200 bg-white text-stone-700 hover:bg-stone-50'
                }`}
              >
                <DollarSign size={14} className={paymentMethod === 'Numerário' ? 'text-emerald-600' : 'text-stone-400'} />
                <span>Dinheiro</span>
              </button>
              <button
                type="button"
                onClick={() => setPaymentMethod('Cartão de Crédito')}
                className={`py-2 px-2 rounded-xl text-xs font-mono font-bold flex flex-col items-center justify-center gap-1 transition-all cursor-pointer border ${
                  paymentMethod === 'Cartão de Crédito'
                    ? 'border-amber-500 bg-amber-50 text-amber-900 shadow-sm ring-1 ring-amber-500'
                    : 'border-stone-200 bg-white text-stone-700 hover:bg-stone-50'
                }`}
              >
                <CreditCard size={14} className={paymentMethod === 'Cartão de Crédito' ? 'text-amber-600' : 'text-stone-400'} />
                <span>Crédito</span>
              </button>
              <button
                type="button"
                onClick={() => setPaymentMethod('Cartão de Débito')}
                className={`py-2 px-2 rounded-xl text-xs font-mono font-bold flex flex-col items-center justify-center gap-1 transition-all cursor-pointer border ${
                  paymentMethod === 'Cartão de Débito'
                    ? 'border-blue-500 bg-blue-50 text-blue-900 shadow-sm ring-1 ring-blue-500'
                    : 'border-stone-200 bg-white text-stone-700 hover:bg-stone-50'
                }`}
              >
                <CreditCard size={14} className={paymentMethod === 'Cartão de Débito' ? 'text-blue-600' : 'text-stone-400'} />
                <span>Débito</span>
              </button>
            </div>

            {/* Dinheiro Drawer if Numerário is active */}
            {paymentMethod === 'Numerário' && (
              <div className="bg-emerald-50/70 p-1.5 rounded border border-emerald-200/80 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-mono font-bold text-emerald-900 uppercase">
                    Recebido (R$):
                  </span>
                  <div className="relative">
                    <span className="absolute left-1.5 top-1/2 -translate-y-1/2 text-emerald-600 font-bold text-[10px]">R$</span>
                    <input
                      type="number" step="0.5"
                      value={cashAmountGiven}
                      onChange={e => setCashAmountGiven(e.target.value)}
                      placeholder={totalAmount.toFixed(2)}
                      className="w-18 h-5.5 pl-4 pr-1 bg-white border border-emerald-300 rounded text-[11px] text-stone-900 text-right font-mono font-bold focus:outline-none focus:ring-1 focus:ring-emerald-400"
                    />
                  </div>
                </div>
                <div className="flex gap-1 overflow-x-auto hide-scrollbar justify-end">
                  {[10, 20, 50, 100].map(val => (
                    <button 
                      key={val} 
                      onClick={() => setCashAmountGiven(val.toString())} 
                      className="px-1.5 py-0.2 bg-white text-emerald-800 text-[9px] font-mono font-bold rounded border border-emerald-200 shadow-2xs cursor-pointer hover:bg-emerald-100 shrink-0"
                    >
                      R${val}
                    </button>
                  ))}
                  <button 
                    onClick={() => setCashAmountGiven(totalAmount.toFixed(2))} 
                    className="px-1.5 py-0.2 bg-emerald-600 text-white text-[9px] font-mono font-bold rounded shadow-2xs cursor-pointer hover:bg-emerald-700 shrink-0"
                  >
                    Exato
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Section 5: Financial Summary & Finalize */}
          <div className="mt-auto sticky bottom-0 p-3 lg:p-4 bg-[var(--pdv-surface)] border-t border-[var(--pdv-border)] shrink-0 space-y-2 shadow-[var(--pdv-shadow-lg)]">
            <div className="flex items-baseline justify-between">
              <div className="flex flex-col">
                <span className="text-[10px] font-mono text-stone-500 font-bold uppercase tracking-wider">
                  Total
                </span>
                {(subtotal !== totalAmount || deliveryFee > 0 || adjustmentAmount !== 0) && (
                  <span className="text-[9px] font-mono text-stone-400">
                    Sub: R$ {subtotal.toFixed(2).replace('.', ',')}
                    {deliveryFee > 0 && ` + Ent: R$ ${deliveryFee.toFixed(2).replace('.', ',')}`}
                    {isFreeDelivery && ` + Ent: Grátis`}
                    {adjustmentAmount !== 0 && ` ${adjustmentAmount < 0 ? '-' : '+'} R$ ${Math.abs(adjustmentAmount).toFixed(2).replace('.', ',')}`}
                  </span>
                )}
              </div>
              <span className="text-lg font-black font-mono text-stone-900 tabular-nums">
                R$ {totalAmount.toFixed(2).replace('.', ',')}
              </span>
            </div>

            {errorMessage && (
              <div className="p-1.5 rounded bg-red-50 border border-red-200 text-red-700 text-[11px] font-bold flex items-start gap-1 animate-in fade-in">
                <AlertCircle size={12} className="shrink-0 mt-0.5 text-red-500" />
                <span>{errorMessage}</span>
              </div>
            )}

            <button
              onClick={handleFinalizeOrder}
              disabled={isSubmitting || cart.length === 0}
              className="w-full h-11 bg-[#083d07] hover:bg-[#0b520a] active:scale-[0.98] disabled:opacity-40 disabled:bg-gray-300 disabled:text-gray-500 text-[#fdfbf7] font-black text-sm uppercase tracking-wider rounded-[var(--pdv-radius-lg)] shadow-[var(--pdv-shadow-md)] transition-all flex items-center justify-center gap-2 cursor-pointer border border-[#d5af7a]/60"
            >
              {isSubmitting ? (
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Processando...</span>
                </div>
              ) : (
                <>
                  <Check size={14} className="stroke-[3]" />
                  <span>Finalizar Pedido</span>
                </>
              )}
            </button>
          </div>
        </aside>
      </div>

      {/* ────────────────── PIZZA CUSTOMIZATION MODAL ────────────────── */}
      {customizingItem && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-xl rounded-3xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
            
            <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-black text-base text-gray-900">{customizingItem.name}</h3>
                  {editingCartIndex !== null && (
                    <span className="text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300 px-2 py-0.5 rounded-full">
                      Editando Item do Carrinho
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">
                  {editingCartIndex !== null ? 'Modifique os sabores, bordas ou observações deste item' : 'Personalize seu pedido'}
                </p>
              </div>
              <button 
                onClick={() => { setCustomizingItem(null); setEditingCartIndex(null); setSearchingFlavorSlot(null); }} 
                className="p-1.5 rounded-full bg-gray-200 text-gray-600 hover:bg-gray-300 hover:text-gray-900 cursor-pointer transition-colors"
              >
                <X size={16} className="stroke-[2.5]" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto space-y-4">
              
              {/* Tamanho da Pizza / Banner de Promoção */}
              {isPromoWithPizza(customizingItem) && !Boolean(customizingItem.priceP || customizingItem.priceM || customizingItem.priceG) ? (
                <div className="p-3 bg-amber-50 rounded-2xl border border-amber-200 flex items-center justify-between shadow-2xs">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-1 rounded-full bg-amber-200 text-amber-900 text-[10px] font-black uppercase tracking-wide flex items-center gap-1">
                      <Sparkles size={11} className="text-amber-700" />
                      Promoção com Pizza
                    </span>
                    <span className="text-xs font-bold text-amber-950">
                      Preço Especial do Combo / Promoção
                    </span>
                  </div>
                  <span className="text-sm font-black font-mono text-amber-900">
                    R$ {(customizingItem.priceSingle || 0).toFixed(2).replace('.', ',')}
                  </span>
                </div>
              ) : (
                !(customizingItem.priceP || customizingItem.priceM || customizingItem.priceG || customizingItem.priceBig || customizingItem.priceSuperBig) ? (
                <div className="p-3 bg-[#FAF7F2] rounded-2xl border border-[#E8D8D1] flex items-center justify-between">
                  <span className="text-xs font-black text-[#083D07]">Tamanho único 28cm</span>
                  <span className="text-sm font-black font-mono text-[#44210F]">R$ {(customizingItem.priceSingle || 0).toFixed(2).replace('.', ',')}</span>
                </div>
                ) : (
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">
                    Tamanho
                  </label>
                  <div className="grid grid-cols-5 gap-2">
                    {(['P', 'M', 'G', 'Big', 'Super Big'] as const).map(size => {
                      let p = 0;
                      if (size === 'P') p = customizingItem.priceP || (customizingItem.priceM ? customizingItem.priceM - 2 : 0);
                      if (size === 'M') p = customizingItem.priceM || 0;
                      if (size === 'G') p = customizingItem.priceG || 0;
                      if (size === 'Big') p = customizingItem.priceBig || 0;
                      if (size === 'Super Big') p = customizingItem.priceSuperBig || 0;
                      if (p <= 0) return null;

                      const isSelected = customSize === size;
                      return (
                        <button
                          key={size}
                          onClick={() => {
                            setCustomSize(size);
                            const maxAdditional = size === 'Super Big' ? 3 : size === 'Big' ? 2 : size === 'G' ? 1 : 0;
                            if (customAdditionalFlavors.length > maxAdditional) {
                              setCustomAdditionalFlavors(prev => prev.slice(0, maxAdditional));
                            }
                          }}
                          className={`py-2.5 px-2 rounded-xl flex flex-col items-center gap-0.5 border-2 transition-all cursor-pointer shadow-2xs ${
                            isSelected
                              ? 'bg-yellow-50 border-yellow-400 text-yellow-900 ring-1 ring-yellow-400 ring-offset-1'
                              : 'bg-white border-gray-200 text-gray-600 hover:border-yellow-200 hover:bg-yellow-50/50'
                          }`}
                        >
                          <span className="text-xs font-black">{size === 'P' ? 'Pequena' : size === 'M' ? 'Média' : size === 'G' ? 'Grande' : size}</span>
                          <span className="text-[10px] font-bold text-gray-500">+ R$ {p.toFixed(2).replace('.', ',')}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
                )
              )}

              {/* Se for Promoção com Pizza: Seleção de Sabor e Bebida da Promoção */}
              {isPromoWithPizza(customizingItem) && (() => {
                const promoFlavors = getPromoFlavors(customizingItem);
                const isTwoPizza = isTwoPizzaPromo(customizingItem);
                const hasDrinkOption = (customizingItem.name || '').toLowerCase().includes('coca') || 
                                      (customizingItem.ingredients || '').toLowerCase().includes('coca') ||
                                      (customizingItem.ingredients || '').toLowerCase().includes('bebida');

                return (
                  <div className="space-y-3 pt-4 border-t border-gray-100">
                    {/* Versão da Coca-Cola */}
                    {hasDrinkOption && (
                      <div className="space-y-1.5 bg-red-50/70 p-3 rounded-2xl border border-red-200">
                        <label className="block text-[10px] font-black uppercase tracking-widest text-red-800">
                          Versão da Bebida / Coca-Cola:
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => setCustomDrinkVariant('Normal')}
                            className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-between cursor-pointer ${
                              customDrinkVariant === 'Normal'
                                ? 'bg-red-600 text-white border-red-700 shadow-xs'
                                : 'bg-white border-red-200 text-red-900 hover:bg-red-100/50'
                            }`}
                          >
                            <span>Coca-Cola Normal</span>
                            {customDrinkVariant === 'Normal' && <Check size={12} className="stroke-[3]" />}
                          </button>
                          <button
                            type="button"
                            onClick={() => setCustomDrinkVariant('Zero')}
                            className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-between cursor-pointer ${
                              customDrinkVariant === 'Zero'
                                ? 'bg-[#083d07] text-white border-black shadow-xs'
                                : 'bg-white border-stone-300 text-stone-900 hover:bg-stone-100'
                            }`}
                          >
                            <span>Coca-Cola Zero</span>
                            {customDrinkVariant === 'Zero' && <Check size={12} className="stroke-[3]" />}
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Sabor 1 da Promoção */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-black text-gray-900">
                          {isTwoPizza ? 'Sabor da Pizza 1 (Promoção):' : 'Sabor da Pizza (Promoção):'}
                        </label>
                        {customPromoFlavor && (
                          <span className="text-[10px] font-bold bg-amber-100 text-amber-900 px-2 py-0.5 rounded-full">
                            {customPromoFlavor}
                          </span>
                        )}
                      </div>

                      {promoFlavors.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {promoFlavors.map(f => {
                            const isSel = customPromoFlavor === f;
                            return (
                              <button
                                key={f}
                                type="button"
                                onClick={() => setCustomPromoFlavor(f)}
                                className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                                  isSel
                                    ? 'bg-amber-500 text-white border-amber-600 shadow-xs ring-1 ring-amber-400'
                                    : 'bg-white text-gray-700 border-gray-200 hover:bg-amber-50 hover:border-amber-300'
                                }`}
                              >
                                {f}
                              </button>
                            );
                          })}
                        </div>
                      )}

                      <select
                        value={customPromoFlavor}
                        onChange={e => setCustomPromoFlavor(e.target.value)}
                        className="w-full h-8 px-2 bg-gray-50 border border-gray-200 rounded-lg text-xs font-bold text-gray-900 focus:bg-white focus:border-amber-500 focus:outline-none"
                      >
                        <option value="">Ou selecione qualquer outro sabor do cardápio...</option>
                        {pizzasList.map(p => (
                          <option key={p.id} value={p.name}>{p.name}</option>
                        ))}
                      </select>
                    </div>

                    {/* Sabor 2 se for promoção de 2 pizzas */}
                    {isTwoPizza && (
                      <div className="space-y-2 pt-2 border-t border-gray-100">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-black text-gray-900">
                            Sabor da Pizza 2 (Promoção):
                          </label>
                          {customPromoFlavor2 && (
                            <span className="text-[10px] font-bold bg-amber-100 text-amber-900 px-2 py-0.5 rounded-full">
                              {customPromoFlavor2}
                            </span>
                          )}
                        </div>

                        {promoFlavors.length > 0 && (
                          <div className="flex flex-wrap gap-1.5">
                            {promoFlavors.map(f => {
                              const isSel = customPromoFlavor2 === f;
                              return (
                                <button
                                  key={`p2-${f}`}
                                  type="button"
                                  onClick={() => setCustomPromoFlavor2(f)}
                                  className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                                    isSel
                                      ? 'bg-amber-500 text-white border-amber-600 shadow-xs ring-1 ring-amber-400'
                                      : 'bg-white text-gray-700 border-gray-200 hover:bg-amber-50 hover:border-amber-300'
                                  }`}
                                >
                                  {f}
                                </button>
                              );
                            })}
                          </div>
                        )}

                        <select
                          value={customPromoFlavor2}
                          onChange={e => setCustomPromoFlavor2(e.target.value)}
                          className="w-full h-8 px-2 bg-gray-50 border border-gray-200 rounded-lg text-xs font-bold text-gray-900 focus:bg-white focus:border-amber-500 focus:outline-none"
                        >
                          <option value="">Ou selecione o 2º sabor do cardápio...</option>
                          {pizzasList.map(p => (
                            <option key={`p2-opt-${p.id}`} value={p.name}>{p.name}</option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                );
              })()}

              {MULTI_FLAVOR_ENABLED && !isPromoWithPizza(customizingItem) && (customSize === 'G' || customSize === 'Big' || customSize === 'Super Big') && (() => {
                const maxAdditional = customSize === 'Super Big' ? 3 : customSize === 'Big' ? 2 : 1;
                const totalFlavors = 1 + customAdditionalFlavors.length;
                const maxAllowedTotal = maxAdditional + 1;

                const getFractionText = (slotIndex: number, total: number) => {
                  if (total === 1) return '1/1 Único';
                  if (total === 2) return `${slotIndex + 1}/2 Metade`;
                  if (total === 3) return `${slotIndex + 1}/3 Terço`;
                  if (total === 4) return `${slotIndex + 1}/4 Quarto`;
                  return `${slotIndex + 1}º Sabor`;
                };

                // Filter available pizzas for search
                const getFilteredPizzas = (currentSlot: number) => {
                  const q = flavorSearchQuery.toLowerCase().trim();
                  return pizzasList.filter(p => {
                    // Exclude base pizza
                    if (p.id === customizingItem.id) return false;
                    // Exclude other chosen flavors, except the one in currentSlot if replacing
                    const isAlreadyChosen = customAdditionalFlavors.some((f, i) => i !== currentSlot && f.id === p.id);
                    if (isAlreadyChosen) return false;
                    if (!q) return true;
                    return p.name.toLowerCase().includes(q) || (p.ingredients && p.ingredients.toLowerCase().includes(q));
                  });
                };

                return (
                  <div className="space-y-2.5 pt-4 border-t border-gray-100">
                    <div className="flex items-center justify-between">
                      <div>
                        <label className="text-xs font-black text-gray-900">Sabores da Pizza</label>
                        <p className="text-[10px] text-gray-500 font-medium">
                          {customSize === 'Super Big' 
                            ? 'Até 4 sabores (1/4 cada)' 
                            : customSize === 'Big' 
                              ? 'Até 3 sabores (1/3 cada)' 
                              : 'Até 2 sabores (Meio a Meio)'}
                        </p>
                      </div>
                      <span className="text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded-full">
                        {totalFlavors} de {maxAllowedTotal} sabores
                      </span>
                    </div>

                    {/* 1º Sabor (Base) */}
                    <div className="flex items-center justify-between p-2.5 bg-gray-50 rounded-xl border border-gray-200 text-xs">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="font-mono text-[9.5px] font-black uppercase px-2 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-200 shrink-0">
                          {getFractionText(0, totalFlavors)}
                        </span>
                        <span className="font-extrabold text-gray-900 truncate">{customizingItem.name}</span>
                      </div>
                      <span className="text-[11px] font-bold font-mono text-gray-500 shrink-0">
                        R$ {getPizzaPriceForSize(customizingItem, customSize).toFixed(2).replace('.', ',')}
                      </span>
                    </div>

                    {/* Sabores Adicionais */}
                    {customAdditionalFlavors.map((flavor, idx) => {
                      const isSearchingThisSlot = searchingFlavorSlot === idx;
                      const sPrice = getPizzaPriceForSize(flavor, customSize);

                      if (isSearchingThisSlot) {
                        const matchingPizzas = getFilteredPizzas(idx);
                        return (
                          <div key={idx} className="p-3 bg-white border-2 border-amber-400 rounded-2xl shadow-lg space-y-2 animate-in fade-in zoom-in-95 duration-150">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-black text-amber-900 flex items-center gap-1.5">
                                <Search size={13} className="text-amber-600" />
                                Escolher {idx + 2}º Sabor:
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  setSearchingFlavorSlot(null);
                                  setFlavorSearchQuery('');
                                }}
                                className="text-gray-400 hover:text-gray-700 text-xs font-bold px-1.5 py-0.5 rounded hover:bg-gray-100"
                              >
                                Cancelar ✕
                              </button>
                            </div>

                            <div className="relative">
                              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                              <input
                                ref={flavorSearchInputRef}
                                type="text"
                                value={flavorSearchQuery}
                                onChange={e => setFlavorSearchQuery(e.target.value)}
                                onKeyDown={e => {
                                  if (e.key === 'Enter' && matchingPizzas.length > 0) {
                                    e.preventDefault();
                                    handleSelectFlavor(idx, matchingPizzas[0]);
                                  } else if (e.key === 'Escape') {
                                    e.preventDefault();
                                    setSearchingFlavorSlot(null);
                                  }
                                }}
                                placeholder="Digite o nome ou número da pizza..."
                                className="w-full h-8 pl-8 pr-3 text-xs bg-gray-50 border border-gray-200 rounded-lg font-bold text-gray-900 focus:bg-white focus:border-amber-500 focus:outline-none"
                              />
                            </div>

                            <div className="max-h-44 overflow-y-auto space-y-1 custom-scrollbar pr-0.5">
                              {matchingPizzas.length === 0 ? (
                                <p className="text-center text-gray-400 text-xs py-3">Nenhuma pizza encontrada.</p>
                              ) : (
                                matchingPizzas.map(p => {
                                  const pizzaPrice = getPizzaPriceForSize(p, customSize);
                                  return (
                                    <button
                                      key={p.id}
                                      type="button"
                                      onClick={() => handleSelectFlavor(idx, p)}
                                      className="w-full text-left p-2 rounded-xl border border-gray-100 hover:border-amber-300 hover:bg-amber-50/60 transition-all flex items-center justify-between gap-2 group cursor-pointer"
                                    >
                                      <div className="flex-1 min-w-0">
                                        <div className="font-extrabold text-xs text-gray-900 group-hover:text-amber-900 truncate">
                                          {p.name}
                                        </div>
                                        <div className="text-[10px] text-gray-400 truncate">
                                          {p.ingredients || ''}
                                        </div>
                                      </div>
                                      <span className="text-[11px] font-bold font-mono text-gray-600 group-hover:text-amber-900 shrink-0">
                                        R$ {pizzaPrice.toFixed(2).replace('.', ',')}
                                      </span>
                                    </button>
                                  );
                                })
                              )}
                            </div>
                          </div>
                        );
                      }

                      return (
                        <div key={idx} className="flex items-center justify-between p-2.5 bg-gray-50 rounded-xl border border-gray-200 text-xs hover:border-gray-300 transition-colors">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="font-mono text-[9.5px] font-black uppercase px-2 py-0.5 rounded bg-orange-100 text-orange-900 border border-orange-200 shrink-0">
                              {getFractionText(idx + 1, totalFlavors)}
                            </span>
                            <span className="font-extrabold text-gray-900 truncate">{flavor.name}</span>
                          </div>
                          
                          <div className="flex items-center gap-1.5 shrink-0">
                            <span className="text-[11px] font-bold font-mono text-gray-500 mr-1">
                              R$ {sPrice.toFixed(2).replace('.', ',')}
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                setSearchingFlavorSlot(idx);
                                setFlavorSearchQuery('');
                              }}
                              className="px-2 py-1 bg-white hover:bg-amber-50 text-amber-800 border border-gray-200 hover:border-amber-300 rounded-lg text-[10.5px] font-bold transition-all flex items-center gap-1 cursor-pointer"
                              title="Trocar este sabor"
                            >
                              <RotateCcw size={11} />
                              <span>Trocar</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setCustomAdditionalFlavors(prev => prev.filter((_, i) => i !== idx));
                              }}
                              className="w-6 h-6 flex items-center justify-center bg-white text-red-500 hover:bg-red-50 border border-gray-200 hover:border-red-200 rounded-lg transition-colors font-bold text-xs cursor-pointer"
                              title="Remover este sabor"
                            >
                              ✕
                            </button>
                          </div>
                        </div>
                      );
                    })}

                    {/* New Flavor Search Combobox */}
                    {searchingFlavorSlot === customAdditionalFlavors.length && (() => {
                      const targetSlot = customAdditionalFlavors.length;
                      const matchingPizzas = getFilteredPizzas(targetSlot);
                      return (
                        <div className="p-3 bg-white border-2 border-amber-400 rounded-2xl shadow-lg space-y-2 animate-in fade-in zoom-in-95 duration-150">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-black text-amber-900 flex items-center gap-1.5">
                              <Search size={13} className="text-amber-600" />
                              Adicionar {targetSlot + 2}º Sabor:
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                setSearchingFlavorSlot(null);
                                setFlavorSearchQuery('');
                              }}
                              className="text-gray-400 hover:text-gray-700 text-xs font-bold px-1.5 py-0.5 rounded hover:bg-gray-100"
                            >
                              Cancelar ✕
                            </button>
                          </div>

                          <div className="relative">
                            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                              ref={flavorSearchInputRef}
                              type="text"
                              value={flavorSearchQuery}
                              onChange={e => setFlavorSearchQuery(e.target.value)}
                              onKeyDown={e => {
                                if (e.key === 'Enter' && matchingPizzas.length > 0) {
                                  e.preventDefault();
                                  handleSelectFlavor(targetSlot, matchingPizzas[0]);
                                } else if (e.key === 'Escape') {
                                  e.preventDefault();
                                  setSearchingFlavorSlot(null);
                                }
                              }}
                              placeholder="Digite o nome ou número da pizza..."
                              className="w-full h-8 pl-8 pr-3 text-xs bg-gray-50 border border-gray-200 rounded-lg font-bold text-gray-900 focus:bg-white focus:border-amber-500 focus:outline-none"
                            />
                          </div>

                          <div className="max-h-44 overflow-y-auto space-y-1 custom-scrollbar pr-0.5">
                            {matchingPizzas.length === 0 ? (
                              <p className="text-center text-gray-400 text-xs py-3">Nenhuma pizza encontrada com este nome.</p>
                            ) : (
                              matchingPizzas.map(p => {
                                const pizzaPrice = getPizzaPriceForSize(p, customSize);
                                return (
                                  <button
                                    key={p.id}
                                    type="button"
                                    onClick={() => handleSelectFlavor(targetSlot, p)}
                                    className="w-full text-left p-2 rounded-xl border border-gray-100 hover:border-amber-300 hover:bg-amber-50/60 transition-all flex items-center justify-between gap-2 group cursor-pointer"
                                  >
                                    <div className="flex-1 min-w-0">
                                      <div className="font-extrabold text-xs text-gray-900 group-hover:text-amber-900 truncate">
                                        {p.name}
                                      </div>
                                      <div className="text-[10px] text-gray-400 truncate">
                                        {p.ingredients || ''}
                                      </div>
                                    </div>
                                    <span className="text-[11px] font-bold font-mono text-gray-600 group-hover:text-amber-900 shrink-0">
                                      R$ {pizzaPrice.toFixed(2).replace('.', ',')}
                                    </span>
                                  </button>
                                );
                              })
                            )}
                          </div>
                        </div>
                      );
                    })()}

                    {/* Button to add new flavor */}
                    {searchingFlavorSlot === null && customAdditionalFlavors.length < maxAdditional && (
                      <button
                        type="button"
                        onClick={() => {
                          setSearchingFlavorSlot(customAdditionalFlavors.length);
                          setFlavorSearchQuery('');
                        }}
                        className="w-full py-2.5 px-3 border-2 border-dashed border-[#d5af7a] hover:border-[#083d07] bg-[#E8D8D1]/40 hover:bg-[#E8D8D1] text-[#083d07] rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
                      >
                        <Plus size={13} className="text-[#083d07] stroke-[3]" />
                        <span>
                          + Adicionar {customAdditionalFlavors.length === 0 ? (customSize === 'G' ? '2º Sabor (Meio a Meio)' : '2º Sabor') : `${customAdditionalFlavors.length + 2}º Sabor`}
                        </span>
                      </button>
                    )}

                    <p className="text-[10px] text-amber-800/80 italic font-medium">
                      * Será cobrado o valor do sabor de maior valor entre os escolhidos.
                    </p>
                  </div>
                );
              })()}

              {bordas.length > 0 && (
                <div className="space-y-2 pt-4 border-t border-gray-100">
                  <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">
                    Borda Recheada
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setCustomBorda(null)}
                      className={`py-2 px-3 rounded-xl text-left border transition-all cursor-pointer shadow-2xs flex items-center justify-between ${
                        customBorda === null
                          ? 'bg-gray-100 border-gray-900 text-gray-900'
                          : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
                      }`}
                    >
                      <span className="text-xs font-bold">Sem Borda</span>
                    </button>
                    {bordas.map(b => {
                      const isSelected = customBorda?.id === b.id;
                      return (
                        <button
                          key={b.id}
                          onClick={() => setCustomBorda(b)}
                          className={`py-2 px-3 rounded-xl text-left border transition-all cursor-pointer shadow-2xs flex flex-col justify-center ${
                            isSelected
                              ? 'bg-yellow-50 border-yellow-400 text-yellow-900'
                              : 'bg-white border-gray-200 text-gray-600 hover:border-yellow-200'
                          }`}
                        >
                          <span className="text-xs font-bold truncate">{b.name.replace('Borda de ', '')}</span>
                          <span className="text-[9px] font-bold text-gray-500">+ R$ {b.priceSingle?.toFixed(2).replace('.', ',')}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Adicionais Extras */}
              {availableExtras.length > 0 && (
                <div className="space-y-2 pt-4 border-t border-gray-100">
                  <div className="flex items-center justify-between">
                    <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400">
                      Adicionais Extras
                    </label>
                    {customExtras.length > 0 && (
                      <span className="text-[10px] font-bold text-[#44210F] bg-[#F6E3DF] border border-[#E4C5B9] px-1.5 py-0.5 rounded-md">
                        {customExtras.length} selecionado{customExtras.length > 1 ? 's' : ''} (+ R$ {customExtras.reduce((s, e) => s + e.price, 0).toFixed(2)})
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                    {availableExtras.map(extra => {
                      const isSelected = customExtras.some(e => e.id === extra.id);
                      return (
                        <button
                          type="button"
                          key={extra.id}
                          onClick={() => handleToggleExtra(extra)}
                          className={`py-2 px-3 rounded-xl text-left border transition-all cursor-pointer shadow-2xs flex items-center justify-between ${
                            isSelected
                              ? 'bg-[#F6E3DF] border-[#D5AF7A] text-[#44210F] ring-1 ring-[#D5AF7A]'
                              : 'bg-white border-gray-200 text-gray-700 hover:border-[#D5AF7A] hover:bg-[#F6E3DF]/30'
                          }`}
                        >
                          <div className="flex flex-col min-w-0 pr-1">
                            <span className="text-xs font-bold truncate">{extra.name}</span>
                            <span className="text-[10px] font-bold text-gray-500 font-mono">+ R$ {extra.price.toFixed(2).replace('.', ',')}</span>
                          </div>
                          <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${
                            isSelected ? 'bg-[#083D07] border-[#083D07] text-white' : 'border-gray-300 bg-white'
                          }`}>
                            {isSelected && <Check size={10} className="stroke-[3]" />}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="pt-4 border-t border-gray-100">
                <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1.5">
                  Observações
                </label>
                <textarea
                  value={customNotes}
                  onChange={e => setCustomNotes(e.target.value)}
                  placeholder="Ex: sem cebola, ponto da carne..."
                  rows={2}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium text-gray-900 focus:border-red-500 focus:bg-white focus:outline-none resize-none transition-colors"
                />
              </div>

            </div>

            <div className="p-3 border-t border-gray-100 bg-gray-50 flex items-center gap-2">
              <button
                onClick={() => { setCustomizingItem(null); setEditingCartIndex(null); setSearchingFlavorSlot(null); }}
                className="w-1/3 py-2.5 bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold rounded-xl text-xs cursor-pointer transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmCustomization}
                disabled={!isPromoWithPizza(customizingItem) && customAdditionalFlavors.some(f => !f || !f.id)}
                className="flex-1 py-2.5 bg-[#083d07] hover:bg-[#0b520a] disabled:opacity-50 text-[#fdfbf7] font-bold rounded-xl text-xs shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 border border-[#d5af7a]/60"
              >
                <Check size={16} className="stroke-[3]" />
                <span>
                  {editingCartIndex !== null ? 'Salvar Alterações' : 'Confirmar Inclusão'} (R$ {currentPreviewPrice.toFixed(2).replace('.', ',')})
                </span>
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );

}
