import React, { useState, useEffect } from "react";
import confetti from "canvas-confetti";
import { supabase } from '../lib/supabase';
import { CartItem } from "../types";
import { hapticLight, hapticMedium, hapticSuccess } from "../utils/haptics";
import {
  RESTAURANT_WHATSAPP_PHONE,
  ALL_MENU_ITEMS,
} from "../data/menu";
import { useBusinessHours } from '../hooks/useBusinessHours';
import { 
  ShoppingBag, 
  Plus, 
  Minus, 
  X, 
  Check, 
  MapPin, 
  ArrowLeft, 
  ArrowRight, 
  Trash2, 
  Clock, 
  AlertCircle,
  Phone,
  User,
  FileText
} from "lucide-react";
import { useAnalytics } from '../hooks/useAnalytics';

interface CartProps {
  items: CartItem[];
  onUpdateQuantity: (id: string, delta: number) => void;
  onRemoveItem: (id: string) => void;
  onClearCart: () => void;
  onAddToCart: (item: CartItem) => void;
  isOpen: boolean; // Used for mobile modal
  onClose: () => void; // Used for mobile modal
}

export default function Cart({
  items,
  onUpdateQuantity,
  onRemoveItem,
  onClearCart,
  onAddToCart,
  isOpen,
  onClose,
}: CartProps) {
  const { trackEvent } = useAnalytics();

  // Navigation Steps: 'items' (Meu Pedido) | 'checkout' (Dados de Entrega & Pagamento)
  const [currentStep, setCurrentStep] = useState<'items' | 'checkout'>('items');
  const [showNifInput, setShowNifInput] = useState(false);

  // Dismiss on ESC when mobile cart drawer is open
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Form State
  const [name, setName] = useState("");
  const [telefone, setTelefone] = useState("");
  const [morada, setMorada] = useState("");
  const [zona, setZona] = useState("");
  const [nif, setNif] = useState("");
  const [orderType, setOrderType] = useState<"Delivery" | "Takeaway">("Delivery");
  const [pagamento, setPagamento] = useState("MB Way");
  const [trocoPara, setTrocoPara] = useState("");

  const [hasShownParty, setHasShownParty] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [whatsappUrl, setWhatsappUrl] = useState("");
  const [savedOrderId, setSavedOrderId] = useState<number | null>(null);
  const [savedTrackingCode, setSavedTrackingCode] = useState<string | null>(null);

  const [zonesFees, setZonesFees] = useState<Record<string, number>>({});
  const [freeDeliveryThreshold, setFreeDeliveryThreshold] = useState(35);
  const [minDeliveryOrder, setMinDeliveryOrder] = useState(10);
  const [deliveryTimeEstimate, setDeliveryTimeEstimate] = useState('70 a 80 min');
  const [pickupTimeEstimate, setPickupTimeEstimate] = useState('35 a 40 min');

  // Load saved customer checkout details from localStorage (Memory for fast re-orders)
  useEffect(() => {
    try {
      const saved = localStorage.getItem('customer_checkout_data');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.name) setName(parsed.name);
        if (parsed.telefone) setTelefone(parsed.telefone);
        if (parsed.morada) setMorada(parsed.morada);
        if (parsed.zona) setZona(parsed.zona);
        if (parsed.nif) {
          setNif(parsed.nif);
          setShowNifInput(true);
        }
        if (parsed.orderType) setOrderType(parsed.orderType);
        if (parsed.pagamento) setPagamento(parsed.pagamento);
      }
    } catch (e) {
      console.warn('[Cart] Error reading localStorage customer data', e);
    }
  }, []);

  // Save changes to localStorage
  const saveCustomerData = (updates: Partial<{
    name: string;
    telefone: string;
    morada: string;
    zona: string;
    nif: string;
    orderType: "Delivery" | "Takeaway";
    pagamento: string;
  }>) => {
    try {
      const current = {
        name,
        telefone,
        morada,
        zona,
        nif,
        orderType,
        pagamento,
        ...updates
      };
      localStorage.setItem('customer_checkout_data', JSON.stringify(current));
    } catch (e) {
      // ignore
    }
  };

  // Reset to step 1 if cart becomes empty
  useEffect(() => {
    if (items.length === 0 && currentStep === 'checkout') {
      setCurrentStep('items');
    }
  }, [items.length, currentStep]);

  useEffect(() => {
    const loadDeliverySettings = async () => {
      try {
        const { data: zones, error: zonesError } = await supabase
          .from('delivery_zones')
          .select('name, fee')
          .eq('is_active', true)
          .order('sort_order');
        if (zonesError) throw zonesError;
        if (zones && zones.length > 0) {
          const map: Record<string, number> = {};
          zones.forEach((z: any) => { map[z.name] = Number(z.fee); });
          setZonesFees(map);
        }

        const { data: settingsRows, error: settingsError } = await supabase
          .from('settings')
          .select('key, value')
          .in('key', ['free_delivery_threshold', 'delivery_min_order', 'delivery_time_estimate', 'pickup_time_estimate']);
        if (settingsError) throw settingsError;
        settingsRows?.forEach((row: any) => {
          if (row.key === 'free_delivery_threshold') setFreeDeliveryThreshold(Number(row.value));
          if (row.key === 'delivery_min_order') setMinDeliveryOrder(Number(row.value));
          if (row.key === 'delivery_time_estimate') setDeliveryTimeEstimate(row.value);
          if (row.key === 'pickup_time_estimate') setPickupTimeEstimate(row.value);
        });
      } catch (err) {
        console.warn('[Cart] Não foi possível carregar zonas/configurações do Supabase, usando valores padrão.', err);
      }
    };
    loadDeliverySettings();
  }, []);

  const subtotal = items.reduce(
    (acc, item) => acc + item.priceCalculated * item.quantity,
    0,
  );
  const totalItemCount = items.reduce((acc, item) => acc + item.quantity, 0);

  useEffect(() => {
    if (subtotal >= freeDeliveryThreshold && !hasShownParty) {
      setHasShownParty(true);
      hapticSuccess();
      try {
        const fireConfetti = typeof confetti === 'function' ? confetti : (confetti ? (confetti as any).default : null);
        if (typeof fireConfetti === 'function') {
          fireConfetti({
            particleCount: 100,
            spread: 50,
            origin: { y: 0.6 },
            colors: ['#8b0000', '#ffffff', '#ffd700', '#4CAF50']
          });
        }
      } catch (e) {
        console.warn('Confetti error:', e);
      }
    } else if (subtotal < freeDeliveryThreshold && hasShownParty) {
      setHasShownParty(false);
    }
  }, [subtotal, hasShownParty, freeDeliveryThreshold]);

  let deliveryFee = 0;
  if (orderType === "Delivery") {
    if (subtotal >= freeDeliveryThreshold) {
      deliveryFee = 0;
    } else {
      deliveryFee = zonesFees[zona] || 0;
    }
  }

  const total = subtotal + deliveryFee;
  const businessStatus = useBusinessHours();

  const handleCheckout = async () => {
    trackEvent('initiate_checkout', { total_value: total, item_count: items.length });
    setFormError(null);
    const errors: string[] = [];

    if (!businessStatus.isOpen) {
      errors.push("Estamos fechados no momento. Poderá finalizar o pedido durante o nosso horário de funcionamento.");
    }

    if (orderType === "Delivery" && subtotal < minDeliveryOrder) {
      errors.push(`O valor mínimo para entrega é de €${minDeliveryOrder.toFixed(2)}.`);
    }
    if (!name.trim()) {
      errors.push("Por favor, preencha o seu nome.");
    }
    if (orderType === "Delivery") {
      if (!morada.trim()) {
        errors.push("Por favor, preencha a morada de entrega.");
      }
      if (!zona.trim()) {
        errors.push("Por favor, selecione a zona/freguesia de entrega.");
      }
    }

    if (errors.length > 0) {
      setFormError(errors.join("\n"));
      return;
    }

    setIsSubmitting(true);
    const orderNumber = Math.floor(1000 + Math.random() * 9000);

    let newOrderId = null;
    let orderSavedSuccessfully = false;
    try {
      const { data: activeSession } = await supabase
        .from('cash_sessions')
        .select('id')
        .eq('status', 'aberto')
        .maybeSingle();

      const { data, error } = await supabase.from('orders').insert([{
        cash_session_id: activeSession ? activeSession.id : null,
        customer_name: name,
        customer_phone: telefone,
        order_type: orderType,
        payment_method: pagamento,
        status: 'Pendente',
        total_amount: total,
        delivery_address: orderType === 'Delivery' ? morada : null,
        delivery_zone: orderType === 'Delivery' ? zona : null,
        change_for: pagamento === 'Numerário' ? trocoPara : null,
        nif: nif.trim() ? nif : null,
        items: items.map(item => {
          let itemName = item.menuItem.name;
          if (item.isHalfAndHalf && item.halfAndHalfFlavor) {
            itemName = `1/2 ${item.menuItem.name} e 1/2 ${item.halfAndHalfFlavor.name}`;
          }
          if (item.size) {
            itemName += ` (${item.size === "G" ? "Gr" : item.size === "M" ? "Md" : "Pq"})`;
          }
          const extrasTotalPrice = (item.extras || []).reduce((sum, e) => sum + e.price, 0);
          return {
            name: itemName,
            category: item.menuItem.category,
            quantity: item.quantity,
            priceCalculated: item.priceCalculated,
            basePrice: item.priceCalculated - extrasTotalPrice,
            extras: item.extras || [],
            notes: item.notes || ""
          };
        })
      }]).select();

      if (error) throw error;
      if (data && data.length > 0) {
        newOrderId = data[0].id;
        setSavedOrderId(newOrderId);
        setSavedTrackingCode(data[0].tracking_code);
        orderSavedSuccessfully = true;

        try {
          if (telefone) {
            const { data: existingCustomer } = await supabase
              .from('customers')
              .select('id, total_orders, total_spent')
              .eq('phone', telefone)
              .maybeSingle();

            if (existingCustomer) {
              await supabase.from('customers').update({
                name,
                total_orders: (existingCustomer.total_orders || 0) + 1,
                total_spent: (Number(existingCustomer.total_spent) || 0) + total,
                last_order_at: new Date().toISOString(),
              }).eq('id', existingCustomer.id);
            } else {
              await supabase.from('customers').insert([{
                phone: telefone,
                name,
                total_orders: 1,
                total_spent: total,
                last_order_at: new Date().toISOString(),
              }]);
            }
          }
        } catch (custErr) {
          console.warn('[Cart] Não foi possível atualizar o cadastro do cliente (CRM):', custErr);
        }
      }
    } catch (err) {
      console.error("Error saving order:", err);
    } finally {
      setIsSubmitting(false);
    }

    if (!orderSavedSuccessfully) {
      setFormError("Não foi possível registar o seu pedido agora. Verifique a ligação e tente novamente.");
      return;
    }

    let text = `-----------------------------------\n`;
    text += `           41 MENU'S\n`;
    text += `-----------------------------------\n`;
    text += `Pedido Nº: ${newOrderId || orderNumber}\n`;
    text += `Tipo: ${orderType === "Delivery" ? "Entrega" : "Takeaway"}\n\n`;

    text += `[CLIENTE]\n`;
    text += `Nome: ${name}\n`;
    text += `Telefone: ${telefone}\n`;
    if (nif.trim()) {
      text += `NIF: ${nif}\n`;
    }
    text += `\n`;

    if (orderType === "Delivery") {
      text += `[ENDEREÇO DE ENTREGA]\n`;
      text += `Morada: ${morada}\n`;
      text += `Complemento: ${zona}\n`;
      text += `-----------------------------------\n`;
      text += `🛵 Tempo est. de entrega:\n   ${deliveryTimeEstimate}\n`;
    } else {
      text += `-----------------------------------\n`;
      text += `⏰ Tempo est. de prep:\n   ${pickupTimeEstimate}\n`;
    }

    const orderDateObj = new Date();
    const dateStr = orderDateObj.toLocaleDateString('pt-PT', { timeZone: 'Europe/Lisbon' });
    const timeStr = orderDateObj.toLocaleTimeString('pt-PT', { timeZone: 'Europe/Lisbon', hour: '2-digit', minute: '2-digit' });

    text += `-----------------------------------\n`;
    text += `[ITENS DO PEDIDO]\n`;
    text += `Data: ${dateStr} Hora: ${timeStr}\n\n`;

    const sortedItems = [...items].sort((a, b) => {
      const catA = (a.menuItem.category || "").toLowerCase();
      const catB = (b.menuItem.category || "").toLowerCase();
      const getWeight = (cat: string) => {
        if (cat.includes('esfiha')) return 2;
        if (cat.includes('bebida')) return 3;
        if (cat.includes('borda')) return 4;
        return 1;
      };
      return getWeight(catA) - getWeight(catB);
    });

    sortedItems.forEach((item) => {
      let desc = item.menuItem.name;
      if (item.isHalfAndHalf && item.halfAndHalfFlavor) {
        desc = `1/2 ${item.menuItem.name} e 1/2 ${item.halfAndHalfFlavor.name}`;
      }
      if (item.size)
        desc += ` (${item.size === "G" ? "Gr" : item.size === "M" ? "Md" : "Pq"})`;
      
      const extrasTotalPrice = (item.extras || []).reduce((sum, e) => sum + e.price, 0);
      const basePrice = item.priceCalculated - extrasTotalPrice;
      const priceStr = `€ ${(basePrice * item.quantity).toFixed(2)}`;
      text += `*${item.quantity}x* ${desc} (${priceStr})\n`;
      
      if (item.extras && item.extras.length > 0) {
        item.extras.forEach((extra) => {
          text += `   + ${extra.name} (+ € ${(extra.price * item.quantity).toFixed(2)})\n`;
        });
        text += `   *Subtotal item: € ${(item.priceCalculated * item.quantity).toFixed(2)}*\n`;
      }
      if (item.notes) {
        text += `   📝 Obs: ${item.notes}\n`;
      }
      text += `\n`;
    });

    text += `-----------------------------------\n`;
    text += `*Subtotal: € ${subtotal.toFixed(2)}*\n`;
    if (orderType === "Delivery") {
      if (subtotal >= freeDeliveryThreshold) {
        text += `Taxa Entrega: € 0.00\n`;
      } else {
        text += `Taxa Entrega: € ${deliveryFee.toFixed(2)}\n`;
      }
    }
    text += `*TOTAL: € ${total.toFixed(2)}*\n`;
    text += `-----------------------------------\n`;
    text += `[PAGAMENTO]\n`;
    text += `Forma: ${pagamento}\n`;
    if (pagamento === "Numerário" && trocoPara) {
      text += `Troco para: € ${trocoPara}\n`;
    }
    text += `-----------------------------------`;

    // Envio automático oficial do resumo para a pizzaria e cliente (impossibilita alteração pelo cliente)
    fetch('/.netlify/functions/send-order-whatsapp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        orderId: newOrderId || orderNumber,
        customerPhone: telefone,
        message: text
      })
    }).catch(err => console.warn('[Cart] Aviso no envio automático WhatsApp:', err));

    const contactText = `Olá! Gostaria de falar sobre o meu pedido #${newOrderId || orderNumber}.`;
    const contactWappUrl = `https://api.whatsapp.com/send?phone=351938360931&text=${encodeURIComponent(contactText)}`;

    trackEvent('purchase', { total_value: total, order_id: newOrderId || orderNumber });

    setWhatsappUrl(contactWappUrl);
    setIsSuccess(true);
    onClearCart();
  };

  // SUCCESS SCREEN
  if (isSuccess) {
    const successActionButtons = (
      <div className="w-full max-w-xs mx-auto flex flex-col gap-2.5 mt-3">
        {savedOrderId && (
          <a
            href={`/track/${savedTrackingCode}`}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full bg-[#8b0000] hover:bg-[#6b0000] text-white font-bold py-2.5 px-4 rounded-xl flex items-center justify-center gap-1.5 text-xs shadow-sm transition-all cursor-pointer"
          >
            🔍 Acompanhar Pedido
          </a>
        )}
        <a
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => {
            onClearCart();
            setIsSuccess(false);
            onClose();
          }}
          className="w-full bg-[#25D366] hover:bg-[#1EBE5D] text-white font-bold py-2.5 px-4 rounded-xl flex items-center justify-center gap-1.5 text-xs shadow-sm transition-all cursor-pointer"
        >
          💬 Falar com a Pizzaria no WhatsApp
        </a>
        <button
          onClick={() => {
            setIsSuccess(false);
            setCurrentStep('items');
            onClose();
          }}
          className="text-[11px] text-gray-500 hover:text-gray-800 font-medium text-center py-1 cursor-pointer"
        >
          Voltar ao Cardápio
        </button>
      </div>
    );

    return (
      <>
        {/* Desktop Inline Cart */}
        <div className="hidden lg:block sticky top-28 w-full z-10">
          <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-xs flex flex-col items-center justify-center text-center">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-2.5">
              <Check className="w-6 h-6 text-green-600" />
            </div>
            <h2 className="text-base font-black text-gray-800 mb-0.5">Pedido {savedOrderId ? `#${savedOrderId}` : ''} Confirmado!</h2>
            <p className="text-gray-500 text-xs mb-1">O resumo do seu pedido foi enviado automaticamente para a nossa equipa.</p>
            {successActionButtons}
          </div>
        </div>

        {/* Mobile Modal Cart */}
        {isOpen && (
          <div className="lg:hidden fixed inset-0 z-50 flex flex-col justify-end">
            <div
              className="absolute inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
              onClick={onClose}
            />
            <div className="relative bg-white w-full rounded-t-3xl overflow-hidden shadow-2xl flex flex-col items-center justify-center p-6 text-center">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-2.5">
                <Check className="w-6 h-6 text-green-600" />
              </div>
              <h2 className="text-base font-black text-gray-800 mb-0.5">Pedido {savedOrderId ? `#${savedOrderId}` : ''} Confirmado!</h2>
              <p className="text-gray-500 text-xs mb-1">O resumo do seu pedido foi enviado automaticamente para a nossa equipa.</p>
              {successActionButtons}
            </div>
          </div>
        )}
      </>
    );
  }

  // MAIN CART CONTENT (ULTRA-COMPACT, ELEGANT, HIGH-CONVERSION)
  const CartContent = (
    <div className="bg-white lg:border border-gray-200 lg:rounded-2xl shadow-xs flex flex-col w-full relative">
      
      {/* HEADER WITH DISCREET STEP TABS */}
      <div className="bg-white border-b border-gray-100 p-3 shrink-0">
        <div className="flex justify-between items-center mb-2">
          <div className="flex items-center gap-1.5">
            <ShoppingBag className="w-4 h-4 text-[#8b0000]" />
            <h2 className="text-[13px] font-black uppercase tracking-wide text-gray-800">
              {currentStep === 'items' ? 'Meu Pedido' : 'Entrega & Pagamento'}
            </h2>
            <span className="bg-gray-100 text-gray-600 text-[10px] font-bold px-1.5 py-0.2 rounded-full">
              {totalItemCount}
            </span>
          </div>

          <div className="flex items-center gap-1">
            {items.length > 0 && currentStep === 'items' && (
              <button
                onClick={onClearCart}
                className="text-[10px] text-gray-400 hover:text-red-600 font-semibold px-1.5 py-0.5 rounded transition-colors flex items-center gap-1 cursor-pointer"
                title="Limpar carrinho"
              >
                <Trash2 className="w-3 h-3" />
                <span>Limpar</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="lg:hidden p-1 text-gray-400 hover:text-gray-700 rounded-full hover:bg-gray-100 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* COMPACT STEP SWITCHER */}
        {items.length > 0 && (
          <div className="grid grid-cols-2 gap-1 bg-gray-100 p-0.5 rounded-lg text-[11px] font-bold">
            <button
              type="button"
              onClick={() => setCurrentStep('items')}
              className={`py-1 px-2 rounded-md transition-all flex items-center justify-center gap-1 cursor-pointer ${
                currentStep === 'items'
                  ? 'bg-white text-[#8b0000] shadow-xs'
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              <span>1. Itens ({totalItemCount})</span>
            </button>

            <button
              type="button"
              onClick={() => {
                if (items.length > 0) setCurrentStep('checkout');
              }}
              className={`py-1 px-2 rounded-md transition-all flex items-center justify-center gap-1 cursor-pointer ${
                currentStep === 'checkout'
                  ? 'bg-[#8b0000] text-white shadow-xs'
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              <span>2. Entrega ➔</span>
            </button>
          </div>
        )}

        {/* FREE DELIVERY PROGRESS BAR IN CART */}
        {items.length > 0 && (
          <div className="mt-2.5 pt-2 border-t border-gray-100">
            <div className="flex justify-between items-center text-[11px] font-bold mb-1">
              {subtotal >= freeDeliveryThreshold ? (
                <span className="text-emerald-700 flex items-center gap-1">
                  🎉 <strong>Entrega Grátis garantida!</strong>
                </span>
              ) : (
                <span className="text-stone-600">
                  Falta <strong className="text-[#8b0000]">€{(freeDeliveryThreshold - subtotal).toFixed(2)}</strong> para <strong>Entrega Grátis</strong> 🛵
                </span>
              )}
              <span className="text-stone-400 font-medium text-[10px]">Meta: €{freeDeliveryThreshold.toFixed(2)}</span>
            </div>
            <div className="w-full h-1.5 bg-stone-100 rounded-full overflow-hidden border border-stone-200/60">
              <div
                className={`h-full transition-all duration-500 rounded-full ${
                  subtotal >= freeDeliveryThreshold
                    ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"
                    : "bg-gradient-to-r from-amber-400 to-[#d4af37]"
                }`}
                style={{ width: `${Math.min(100, Math.round((subtotal / freeDeliveryThreshold) * 100))}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* EMPTY CART STATE */}
      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
          <div className="w-10 h-10 rounded-full bg-gray-50 border border-dashed border-gray-200 flex items-center justify-center mb-2">
            <ShoppingBag className="w-5 h-5 text-gray-300" />
          </div>
          <h3 className="font-bold text-gray-700 text-xs mb-0.5">Seu carrinho está vazio</h3>
          <p className="text-gray-400 text-[11px] max-w-[220px] mb-3">
            Adicione itens do cardápio para fazer o seu pedido!
          </p>
          <button
            onClick={onClose}
            className="lg:hidden bg-[#8b0000] text-white text-[11px] font-bold py-1.5 px-4 rounded-lg hover:bg-[#6b0000] transition-colors cursor-pointer"
          >
            Ver Cardápio
          </button>
        </div>
      ) : (
        <>
          {/* BODY AREA - COMPACT & NATURAL */}
          <div className="p-3 space-y-2.5">
            
            {/* ======================================================== */}
            {/* STEP 1: COMPACT ITEMS REVIEW */}
            {/* ======================================================== */}
            {currentStep === 'items' && (
              <div className="space-y-2.5 animate-in fade-in duration-150">
                {/* ITEMS LIST (MAX 380px, scrollable only if many items) */}
                <div className="max-h-[300px] overflow-y-auto overscroll-contain pr-1 custom-scrollbar space-y-1.5 divide-y divide-gray-100">
                  {items.map((item) => (
                    <div
                      key={item.id}
                      className="pt-1.5 first:pt-0"
                    >
                      <div className="flex justify-between items-start gap-1.5 text-xs">
                        <div className="flex-1 min-w-0">
                          <span className="font-extrabold text-gray-800">
                            {item.quantity}x{" "}
                            {item.isHalfAndHalf && item.halfAndHalfFlavor
                              ? `1/2 ${item.menuItem.name} + 1/2 ${item.halfAndHalfFlavor.name}`
                              : item.menuItem.name}
                          </span>
                          {item.size && (
                            <span className="ml-1 text-[10px] font-semibold text-gray-500 bg-gray-100 px-1 py-0.2 rounded">
                              {item.size}
                            </span>
                          )}

                          {/* Extras */}
                          {item.extras && item.extras.length > 0 && (
                            <div className="text-[10px] text-gray-500 mt-0.5">
                              {item.extras.map((ex) => `+ ${ex.name} (€${ex.price.toFixed(2)})`).join(', ')}
                            </div>
                          )}

                          {/* Notes */}
                          {item.notes && (
                            <div className="text-[10px] text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded mt-0.5 truncate max-w-[240px]">
                              Obs: {item.notes}
                            </div>
                          )}
                        </div>

                        {/* Price */}
                        <span className="font-black text-[#8b0000] shrink-0 text-xs">
                          € {(item.priceCalculated * item.quantity).toFixed(2)}
                        </span>
                      </div>

                      {/* Stepper + Remover in one compact row */}
                      <div className="flex justify-between items-center mt-1">
                        <div className="flex items-center border border-gray-200 rounded-md bg-white overflow-hidden">
                          <button
                            onClick={() => onUpdateQuantity(item.id, -1)}
                            className="px-1.5 py-0.5 text-gray-500 hover:text-[#8b0000] hover:bg-gray-50 transition-colors cursor-pointer"
                          >
                            <Minus className="w-2.5 h-2.5" />
                          </button>
                          <span className="text-[11px] font-bold px-1.5 text-gray-800 min-w-4 text-center">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => onUpdateQuantity(item.id, 1)}
                            className="px-1.5 py-0.5 text-gray-500 hover:text-[#8b0000] hover:bg-gray-50 transition-colors cursor-pointer"
                          >
                            <Plus className="w-2.5 h-2.5" />
                          </button>
                        </div>

                        <button
                          onClick={() => onRemoveItem(item.id)}
                          className="text-[10px] text-gray-400 hover:text-red-600 transition-colors cursor-pointer"
                        >
                          Remover
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* SLIM FREE DELIVERY PROGRESS BAR */}
                <div className="pt-1">
                  {subtotal >= freeDeliveryThreshold ? (
                    <div className="bg-emerald-50 text-emerald-800 text-[11px] font-bold py-1.5 px-2.5 rounded-lg border border-emerald-200 flex items-center justify-center gap-1.5">
                      <span>🎉</span>
                      <span>Parabéns! <strong>Entrega Grátis Ganha!</strong></span>
                    </div>
                  ) : (
                    <div className="bg-amber-50/60 border border-amber-200/70 p-2 rounded-lg space-y-1">
                      <div className="flex justify-between text-[11px] font-semibold text-gray-700">
                        <span>🛵 Entrega Grátis</span>
                        <span className="text-[#8b0000] font-black">Meta: €{freeDeliveryThreshold.toFixed(2)}</span>
                      </div>
                      <div className="w-full bg-gray-200 h-1.5 rounded-full overflow-hidden">
                        <div
                          className="bg-[#8b0000] h-1.5 rounded-full transition-all duration-300"
                          style={{ width: `${Math.min(100, (subtotal / freeDeliveryThreshold) * 100)}%` }}
                        />
                      </div>
                      <div className="text-[10px] text-gray-500 text-center font-medium">
                        Adicione <strong className="text-[#8b0000]">€{(freeDeliveryThreshold - subtotal).toFixed(2)}</strong> e ganhe a entrega!
                      </div>
                    </div>
                  )}
                </div>

                {/* DISCREET UPSELL CHIP */}
                {(() => {
                  const hasBebida = items.some((i) => i.menuItem.category === "bebidas");
                  if (!hasBebida) {
                    const sug = ALL_MENU_ITEMS.find((m) => m.id === "b-1");
                    if (sug) {
                      return (
                        <div className="bg-gray-50 border border-gray-200/80 rounded-lg px-2 py-1.5 flex items-center justify-between text-[11px]">
                          <span className="text-gray-600 truncate">
                            🥤 Coca-Cola por <strong>€{(sug.priceSingle || 0).toFixed(2)}</strong>?
                          </span>
                          <button
                            onClick={() =>
                              onAddToCart({
                                id: Date.now().toString(),
                                menuItem: sug,
                                quantity: 1,
                                priceCalculated: sug.priceSingle || 0,
                              })
                            }
                            className="text-[10px] bg-white border border-emerald-500 text-emerald-700 font-bold px-2 py-0.5 rounded hover:bg-emerald-50 transition-colors shrink-0 ml-1.5 cursor-pointer"
                          >
                            + Adicionar
                          </button>
                        </div>
                      );
                    }
                  }
                  return null;
                })()}

                {/* STEP 1 FOOTER & CTA */}
                <div className="pt-2 border-t border-gray-100 space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-gray-500 font-medium">Subtotal dos itens:</span>
                    <span className="font-black text-[#8b0000] text-sm">€ {subtotal.toFixed(2)}</span>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setFormError(null);
                      setCurrentStep('checkout');
                    }}
                    disabled={!businessStatus.isOpen}
                    className={`w-full font-bold py-2.5 px-3 rounded-xl transition-all flex justify-center items-center gap-1.5 text-xs shadow-xs cursor-pointer ${
                      !businessStatus.isOpen
                        ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                        : 'bg-[#8b0000] hover:bg-[#6b0000] active:scale-[0.99] text-white'
                    }`}
                  >
                    {!businessStatus.isOpen ? (
                      <>
                        <Clock className="w-3.5 h-3.5" />
                        <span>Loja Fechada no Momento</span>
                      </>
                    ) : (
                      <>
                        <span>Avançar para Entrega</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* ======================================================== */}
            {/* STEP 2: ULTRA-COMPACT CHECKOUT FORM */}
            {/* ======================================================== */}
            {currentStep === 'checkout' && (
              <div className="space-y-2.5 animate-in fade-in duration-150">
                
                {/* BACK LINK + RESUMO EM 1 LINHA */}
                <div className="flex items-center justify-between text-[11px] pb-1 border-b border-gray-100">
                  <button
                    type="button"
                    onClick={() => setCurrentStep('items')}
                    className="font-bold text-[#8b0000] hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <ArrowLeft className="w-3 h-3" />
                    <span>Editar itens</span>
                  </button>
                  <span className="text-gray-500 font-medium">
                    {totalItemCount} {totalItemCount === 1 ? 'item' : 'itens'} • Subtotal: €{subtotal.toFixed(2)}
                  </span>
                </div>

                {/* ENTREGA VS RETIRADA (COMPACT 28px ROW) */}
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setOrderType("Delivery");
                      saveCustomerData({ orderType: "Delivery" });
                    }}
                    className={`py-1.5 px-2 rounded-lg font-bold text-[11px] transition-all flex items-center justify-center gap-1 border cursor-pointer ${
                      orderType === "Delivery"
                        ? "bg-[#8b0000] text-white border-[#8b0000] shadow-xs"
                        : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
                    }`}
                  >
                    <span>🛵 Entrega ({deliveryTimeEstimate})</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setOrderType("Takeaway");
                      saveCustomerData({ orderType: "Takeaway" });
                    }}
                    className={`py-1.5 px-2 rounded-lg font-bold text-[11px] transition-all flex items-center justify-center gap-1 border cursor-pointer ${
                      orderType === "Takeaway"
                        ? "bg-[#8b0000] text-white border-[#8b0000] shadow-xs"
                        : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
                    }`}
                  >
                    <span>🛍️ Retirada ({pickupTimeEstimate})</span>
                  </button>
                </div>

                {/* FORM FIELDS */}
                <div className="space-y-2">
                  {/* Nome & Telemóvel em 2 colunas compactas */}
                  <div className="grid grid-cols-2 gap-1.5">
                    <div>
                      <label className="block text-[10px] font-bold text-gray-600 mb-0.5 flex items-center gap-0.5 uppercase">
                        <User className="w-2.5 h-2.5 text-[#8b0000]" />
                        <span>Nome *</span>
                      </label>
                      <input
                        type="text"
                        placeholder="Seu nome"
                        value={name}
                        onChange={(e) => {
                          setName(e.target.value);
                          saveCustomerData({ name: e.target.value });
                        }}
                        className="w-full h-8 bg-gray-50/50 focus:bg-white border border-gray-200 focus:border-[#8b0000] rounded-lg px-2 text-xs outline-none transition-colors"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-gray-600 mb-0.5 flex items-center gap-0.5 uppercase">
                        <Phone className="w-2.5 h-2.5 text-[#8b0000]" />
                        <span>Telemóvel *</span>
                      </label>
                      <input
                        type="tel"
                        placeholder="9xx xxx xxx"
                        value={telefone}
                        onChange={(e) => {
                          setTelefone(e.target.value);
                          saveCustomerData({ telefone: e.target.value });
                        }}
                        className="w-full h-8 bg-gray-50/50 focus:bg-white border border-gray-200 focus:border-[#8b0000] rounded-lg px-2 text-xs outline-none transition-colors"
                      />
                    </div>
                  </div>

                  {/* Se Entrega: Morada & Zona */}
                  {orderType === "Delivery" && (
                    <div className="space-y-1.5 bg-red-50/30 p-2 rounded-lg border border-red-100">
                      <div>
                        <label className="block text-[10px] font-bold text-gray-600 mb-0.5 flex items-center gap-0.5 uppercase">
                          <MapPin className="w-2.5 h-2.5 text-[#8b0000]" />
                          <span>Morada Completa *</span>
                        </label>
                        <input
                          type="text"
                          placeholder="Rua, número, andar / apto"
                          value={morada}
                          onChange={(e) => {
                            setMorada(e.target.value);
                            saveCustomerData({ morada: e.target.value });
                          }}
                          className="w-full h-8 bg-white border border-gray-200 focus:border-[#8b0000] rounded-lg px-2 text-xs outline-none transition-colors"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-gray-600 mb-0.5 uppercase">
                          Zona / Freguesia *
                        </label>
                        <select
                          value={zona}
                          onChange={(e) => {
                            setZona(e.target.value);
                            saveCustomerData({ zona: e.target.value });
                          }}
                          className="w-full h-8 bg-white border border-gray-200 focus:border-[#8b0000] rounded-lg px-2 text-xs outline-none font-medium transition-colors"
                        >
                          <option value="">Selecione a freguesia...</option>
                          {Object.keys(zonesFees).map((z) => (
                            <option key={z} value={z}>
                              {z} ({zonesFees[z] === 0 || subtotal >= freeDeliveryThreshold ? "Grátis" : `+€${zonesFees[z].toFixed(2)}`})
                            </option>
                          ))}
                          <option value="disabled" disabled>Brejos de Azeitão (Fora da área)</option>
                          <option value="disabled-vendas" disabled>Vendas de Azeitão (Fora da área)</option>
                        </select>
                      </div>
                    </div>
                  )}

                  {/* Pagamento em botões diretos de 26px */}
                  <div>
                    <label className="block text-[10px] font-bold text-gray-600 mb-1 uppercase">
                      Pagamento
                    </label>
                    <div className="grid grid-cols-2 gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          setPagamento("MB Way");
                          saveCustomerData({ pagamento: "MB Way" });
                        }}
                        className={`h-7 px-2 rounded-lg font-bold text-[11px] transition-all flex items-center justify-center gap-1 border cursor-pointer ${
                          pagamento === "MB Way"
                            ? "bg-gray-900 text-white border-gray-900 shadow-2xs"
                            : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
                        }`}
                      >
                        <span>📱 MB Way</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setPagamento("Numerário");
                          saveCustomerData({ pagamento: "Numerário" });
                        }}
                        className={`h-7 px-2 rounded-lg font-bold text-[11px] transition-all flex items-center justify-center gap-1 border cursor-pointer ${
                          pagamento === "Numerário"
                            ? "bg-gray-900 text-white border-gray-900 shadow-2xs"
                            : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
                        }`}
                      >
                        <span>💵 Dinheiro</span>
                      </button>
                    </div>

                    {pagamento === "Numerário" && (
                      <div className="mt-1.5 flex items-center gap-1.5">
                        <span className="text-[10px] font-semibold text-gray-600">Troco para quanto?</span>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="Ex: 50"
                          value={trocoPara}
                          onChange={(e) => setTrocoPara(e.target.value)}
                          className="h-7 w-24 bg-white border border-gray-200 focus:border-[#8b0000] rounded-lg px-2 text-xs outline-none"
                        />
                      </div>
                    )}
                  </div>

                  {/* NIF opcional (expansível para economizar espaço) */}
                  <div className="pt-0.5">
                    {!showNifInput && !nif ? (
                      <button
                        type="button"
                        onClick={() => setShowNifInput(true)}
                        className="text-[10px] text-gray-400 hover:text-gray-700 flex items-center gap-0.5 cursor-pointer"
                      >
                        <FileText className="w-2.5 h-2.5" />
                        <span>+ Adicionar NIF no recibo (opcional)</span>
                      </button>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        <input
                          type="text"
                          placeholder="NIF no recibo (opcional)"
                          value={nif}
                          onChange={(e) => {
                            setNif(e.target.value);
                            saveCustomerData({ nif: e.target.value });
                          }}
                          className="h-7 w-full bg-white border border-gray-200 focus:border-[#8b0000] rounded-lg px-2 text-xs outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setNif("");
                            setShowNifInput(false);
                            saveCustomerData({ nif: "" });
                          }}
                          className="text-gray-400 hover:text-gray-600 text-xs p-1"
                        >
                          ✕
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* STEP 2 FOOTER & FINAL CTA */}
                <div className="pt-2 border-t border-gray-100 space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-gray-500">
                      {orderType === "Delivery" ? (
                        <>Taxa entrega: <strong className="text-emerald-600">{deliveryFee === 0 ? 'GRÁTIS' : `€${deliveryFee.toFixed(2)}`}</strong></>
                      ) : (
                        'Retirada no balcão'
                      )}
                    </span>
                    <div className="flex items-center gap-1">
                      <span className="text-gray-500 font-medium">Total:</span>
                      <span className="font-black text-[#083d07] text-base">€ {total.toFixed(2)}</span>
                    </div>
                  </div>

                  {formError && (
                    <div className="bg-red-50 border border-red-200 text-red-700 p-2 rounded-lg text-[11px] font-semibold whitespace-pre-line flex items-center gap-1.5">
                      <AlertCircle className="w-3.5 h-3.5 text-red-600 shrink-0" />
                      <div>{formError}</div>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={handleCheckout}
                    disabled={isSubmitting || !businessStatus.isOpen}
                    className={`w-full font-black py-2.5 px-3 rounded-xl transition-all flex justify-center items-center gap-1.5 text-xs shadow-xs cursor-pointer ${
                      isSubmitting || !businessStatus.isOpen
                        ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                        : 'bg-[#25D366] hover:bg-[#1EBE5D] active:scale-[0.99] text-white shadow-emerald-700/20'
                    }`}
                  >
                    {isSubmitting ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Enviando pedido...</span>
                      </>
                    ) : !businessStatus.isOpen ? (
                      <>
                        <Clock className="w-3.5 h-3.5" />
                        <span>Loja Fechada no Momento</span>
                      </>
                    ) : (
                      <>
                        <span>Confirmar e Enviar Pedido</span>
                        <span>📱</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );

  return (
    <>
      {/* Desktop Inline Cart */}
      <div className="hidden lg:block sticky top-28 w-full z-10">
        {CartContent}
      </div>

      {/* Mobile Modal Cart */}
      {isOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex flex-col justify-end">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
            onClick={onClose}
          />
          <div className="relative bg-white w-full max-h-[85vh] rounded-t-3xl overflow-y-auto shadow-2xl flex flex-col p-2">
            {CartContent}
          </div>
        </div>
      )}
    </>
  );
}
