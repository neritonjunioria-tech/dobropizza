import React, { useState, useEffect } from "react";
import confetti from "canvas-confetti";
import { supabase } from '../lib/supabase';
import { CartItem } from "../types";
import { hapticLight, hapticMedium, hapticSuccess } from "../utils/haptics";
import {
  RESTAURANT_WHATSAPP_PHONE,
  ALL_MENU_ITEMS,
  NEIGHBORHOOD_DELIVERY_FEES,
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

const brl = (v: number) => (Number(v) || 0).toFixed(2).replace('.', ',');

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
  const [pagamento, setPagamento] = useState("Pix");
  const [trocoPara, setTrocoPara] = useState("");

  const [hasShownParty, setHasShownParty] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [whatsappUrl, setWhatsappUrl] = useState("");
  const [savedOrderId, setSavedOrderId] = useState<number | null>(null);
  const [savedTrackingCode, setSavedTrackingCode] = useState<string | null>(null);

  const [zonesFees, setZonesFees] = useState<Record<string, number>>(NEIGHBORHOOD_DELIVERY_FEES);
  // No free delivery unless a positive threshold is set in the admin (empty = always charge the zone fee)
  const [freeDeliveryThreshold, setFreeDeliveryThreshold] = useState(Infinity);
  const [minDeliveryOrder, setMinDeliveryOrder] = useState(10);
  const [deliveryTimeEstimate, setDeliveryTimeEstimate] = useState('40 a 50 min');
  const [pickupTimeEstimate, setPickupTimeEstimate] = useState('25 a 35 min');

  // Formas de pagamento ativas (padrão hoje: apenas Pix)
  const [paymentConfig, setPaymentConfig] = useState<{
    pix: boolean;
    dinheiro: boolean;
    credito: boolean;
    debito: boolean;
  }>({
    pix: true,
    dinheiro: false,
    credito: false,
    debito: false
  });

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
          .in('key', ['free_delivery_threshold', 'delivery_min_order', 'delivery_time_estimate', 'pickup_time_estimate', 'payment_methods_config']);
        if (settingsError) throw settingsError;
        settingsRows?.forEach((row: any) => {
          if (row.key === 'free_delivery_threshold') setFreeDeliveryThreshold(Number(row.value) > 0 ? Number(row.value) : Infinity);
          if (row.key === 'delivery_min_order') setMinDeliveryOrder(Number(row.value));
          if (row.key === 'delivery_time_estimate') setDeliveryTimeEstimate(row.value);
          if (row.key === 'pickup_time_estimate') setPickupTimeEstimate(row.value);
          if (row.key === 'payment_methods_config' && row.value) {
            try {
              const parsed = JSON.parse(row.value);
              const loadedCfg = {
                pix: parsed.pix !== false,
                dinheiro: Boolean(parsed.dinheiro),
                credito: Boolean(parsed.credito),
                debito: Boolean(parsed.debito)
              };
              setPaymentConfig(loadedCfg);

              // Se a forma atualmente selecionada estiver desativada, ajusta para a primeira ativa
              const activeCount = Object.values(loadedCfg).filter(Boolean).length;
              if (activeCount === 1 && loadedCfg.pix) {
                setPagamento('Pix');
              }
            } catch (e) {
              // fallback
            }
          }
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

  let deliveryFee = 0;
  if (orderType === "Delivery") {
    deliveryFee = zonesFees[zona] || 0;
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

    if (!name.trim()) {
      errors.push("Por favor, preencha o seu nome.");
    }
    if (orderType === "Delivery") {
      if (!morada.trim()) {
        errors.push("Por favor, preencha o endereço de entrega.");
      }
      if (!zona.trim()) {
        errors.push("Por favor, selecione o bairro de entrega.");
      }
    }

    if (errors.length > 0) {
      setFormError(errors.join("\n"));
      return;
    }

    setIsSubmitting(true);
    const orderNumber = Math.floor(1000 + Math.random() * 9000);

    let newOrderId = null;
    let newTrackingCode: string | null = null;
    let orderSavedSuccessfully = false;
    try {
      // The order goes through a database function: the public key cannot read orders or customers directly.
      // It links the open cash session and updates the customer record (CRM) on the server side.
      const { data, error } = await supabase.rpc('create_public_order', { p_order: {
        customer_name: name,
        customer_phone: telefone,
        order_type: orderType,
        payment_method: pagamento,
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
      } });

      if (error) throw error;
      if (data && data.length > 0) {
        newOrderId = data[0].id;
        setSavedOrderId(newOrderId);
        newTrackingCode = data[0].tracking_code;
        setSavedTrackingCode(data[0].tracking_code);
        orderSavedSuccessfully = true;
      }
    } catch (err) {
      console.error("Error saving order:", err);
    } finally {
      setIsSubmitting(false);
    }

    if (!orderSavedSuccessfully) {
      setFormError("Não foi possível registrar o seu pedido agora. Verifique sua conexão e tente novamente.");
      return;
    }

    let text = `-----------------------------------\n`;
    text += `           DOBRO PIZZAS\n`;
    text += `-----------------------------------\n`;
    text += `Pedido Nº: ${newOrderId || orderNumber}\n`;
    text += `Tipo: ${orderType === "Delivery" ? "Entrega" : "Retirada"}\n\n`;

    text += `[CLIENTE]\n`;
    text += `Nome: ${name}\n`;
    text += `Telefone: ${telefone}\n`;
    if (nif.trim()) {
      text += `CPF: ${nif}\n`;
    }
    text += `\n`;

    if (orderType === "Delivery") {
      text += `[ENDEREÇO DE ENTREGA]\n`;
      text += `Endereço: ${morada}\n`;
      text += `Bairro: ${zona}\n`;
      text += `-----------------------------------\n`;
      text += `🛵 Tempo est. de entrega:\n   ${deliveryTimeEstimate}\n`;
    } else {
      text += `-----------------------------------\n`;
      text += `⏰ Tempo est. de prep:\n   ${pickupTimeEstimate}\n`;
    }

    const orderDateObj = new Date();
    const dateStr = orderDateObj.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
    const timeStr = orderDateObj.toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' });

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
        desc += ` (${item.size})`;
      
      const extrasTotalPrice = (item.extras || []).reduce((sum, e) => sum + e.price, 0);
      const basePrice = item.priceCalculated - extrasTotalPrice;
      const priceStr = `R$ ${brl(basePrice * item.quantity)}`;
      text += `*${item.quantity}x* ${desc} (${priceStr})\n`;
      
      if (item.extras && item.extras.length > 0) {
        item.extras.forEach((extra) => {
          text += `   + ${extra.name} (+ R$ ${brl(extra.price * item.quantity)})\n`;
        });
        text += `   *Subtotal item: R$ ${brl(item.priceCalculated * item.quantity)}*\n`;
      }
      if (item.notes) {
        text += `   📝 Obs: ${item.notes}\n`;
      }
      text += `\n`;
    });

    text += `-----------------------------------\n`;
    text += `*Subtotal: R$ ${brl(subtotal)}*\n`;
    if (orderType === "Delivery") {
      if (subtotal >= freeDeliveryThreshold) {
        text += `Taxa Entrega: R$ 0,00 (Grátis)\n`;
      } else {
        text += `Taxa Entrega: R$ ${brl(deliveryFee)}\n`;
      }
    }
    text += `*TOTAL: R$ ${brl(total)}*\n`;
    text += `-----------------------------------\n`;
    text += `[PAGAMENTO]\n`;
    text += `Forma: ${pagamento}\n`;
    text += `-----------------------------------`;
    if (newTrackingCode) {
      text += `\n🔍 Acompanhe seu pedido:\n${window.location.origin}/track/${newTrackingCode}`;
      // Keep the order on this phone so the customer can reopen the tracking page later
      try {
        localStorage.setItem('dobro_last_order', JSON.stringify({ id: newOrderId, code: newTrackingCode, at: Date.now() }));
        window.dispatchEvent(new Event('dobro-last-order'));
      } catch { /* private mode: tracking link still goes in the WhatsApp message */ }
    }

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

    // The customer sends the full summary to the pizzeria on WhatsApp to confirm the order
    const contactWappUrl = `https://wa.me/${RESTAURANT_WHATSAPP_PHONE}?text=${encodeURIComponent(text)}`;

    trackEvent('purchase', { total_value: total, order_id: newOrderId || orderNumber });

    setWhatsappUrl(contactWappUrl);
    setIsSuccess(true);
    onClearCart();
  };

  // SUCCESS SCREEN
  if (isSuccess) {
    const successActionButtons = (
      <div className="w-full max-w-xs mx-auto flex flex-col gap-2.5 mt-3">
        <a
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full bg-[#25D366] hover:bg-[#1EBE5D] text-white font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-1.5 text-sm shadow-sm transition-all cursor-pointer"
        >
          Enviar pedido no WhatsApp
        </a>
        {savedTrackingCode && (
          <a
            href={`/track/${savedTrackingCode}`}
            className="w-full bg-white border border-[#083d07] text-[#083d07] hover:bg-[#083d07] hover:text-white font-bold py-2.5 px-4 rounded-xl flex items-center justify-center gap-1.5 text-xs shadow-sm transition-all cursor-pointer"
          >
            Acompanhar pedido
          </a>
        )}
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
            <h2 className="text-base font-black text-gray-800 mb-0.5">Pedido {savedOrderId ? `#${savedOrderId}` : ''} registrado!</h2>
            <p className="text-gray-500 text-xs mb-1">Falta só um passo: toque em <strong>Enviar pedido no WhatsApp</strong> para mandar o resumo à pizzaria e confirmar.</p>
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
              <h2 className="text-base font-black text-gray-800 mb-0.5">Pedido {savedOrderId ? `#${savedOrderId}` : ''} registrado!</h2>
              <p className="text-gray-500 text-xs mb-1">Falta só um passo: toque em <strong>Enviar pedido no WhatsApp</strong> para mandar o resumo à pizzaria e confirmar.</p>
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
        {items.length > 0 && Number.isFinite(freeDeliveryThreshold) && (
          <div className="mt-2.5 pt-2 border-t border-gray-100">
            <div className="flex justify-between items-center text-[11px] font-bold mb-1">
              {subtotal >= freeDeliveryThreshold ? (
                <span className="text-emerald-700 flex items-center gap-1">
                  <strong>Entrega Grátis garantida!</strong>
                </span>
              ) : (
                <span className="text-stone-600">
                  Falta <strong className="text-[#8b0000]">R$ {brl(freeDeliveryThreshold - subtotal)}</strong> para <strong>Entrega Grátis</strong>
                </span>
              )}
              <span className="text-stone-400 font-medium text-[10px]">Meta: R$ {brl(freeDeliveryThreshold)}</span>
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
                              {item.extras.map((ex) => `+ ${ex.name} (R$ ${brl(ex.price)})`).join(', ')}
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
                        <span className="font-black text-[#083d07] shrink-0 text-xs">
                          R$ {brl(item.priceCalculated * item.quantity)}
                        </span>
                      </div>

                      {/* Stepper + Remover in one compact row */}
                      <div className="flex justify-between items-center mt-1">
                        <div className="flex items-center border border-gray-200 rounded-md bg-white overflow-hidden">
                          <button
                            onClick={() => onUpdateQuantity(item.id, -1)}
                            className="px-1.5 py-0.5 text-gray-500 hover:text-[#083d07] hover:bg-gray-50 transition-colors cursor-pointer"
                          >
                            <Minus className="w-2.5 h-2.5" />
                          </button>
                          <span className="text-[11px] font-bold px-1.5 text-gray-800 min-w-4 text-center">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => onUpdateQuantity(item.id, 1)}
                            className="w-5 h-5 rounded bg-[#E8D8D1] text-[#083D07] border border-[#d5af7a]/40 hover:bg-[#d5af7a] hover:text-[#083d07] flex items-center justify-center transition-all cursor-pointer shadow-2xs"
                            title="Aumentar quantidade"
                          >
                            <Plus className="w-2.5 h-2.5 stroke-[2.5]" />
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

                {/* DISCREET UPSELL CHIP */}
                {(() => {
                  const hasBebida = items.some((i) => i.menuItem.category === "bebidas");
                  if (!hasBebida) {
                    const sug = ALL_MENU_ITEMS.find((m) => m.id === "b-1");
                    if (sug) {
                      return (
                        <div className="bg-gray-50 border border-gray-200/80 rounded-lg px-2 py-1.5 flex items-center justify-between text-[11px]">
                          <span className="text-gray-600 truncate">
                            Coca-Cola por <strong>R$ {brl(sug.priceSingle || 0)}</strong>?
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
                    <span className="font-black text-[#083d07] text-sm">R$ {brl(subtotal)}</span>
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
                        : 'bg-[#083d07] hover:bg-[#145a13] active:scale-[0.99] text-white'
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

                  <button
                    type="button"
                    onClick={onClose}
                    className="w-full font-semibold py-2 px-3 rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-gray-300 active:scale-[0.99] transition-all flex justify-center items-center gap-1.5 text-xs cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5 text-[#083d07]" />
                    <span>Adicionar mais itens</span>
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
                    className="font-bold text-[#083d07] hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <ArrowLeft className="w-3 h-3" />
                    <span>Editar itens</span>
                  </button>
                  <span className="text-gray-500 font-medium">
                    {totalItemCount} {totalItemCount === 1 ? 'item' : 'itens'} • Subtotal: R$ {brl(subtotal)}
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
                        ? "bg-[#083d07] text-white border-[#083d07] shadow-xs"
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
                        ? "bg-[#083d07] text-white border-[#083d07] shadow-xs"
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
                        <User className="w-2.5 h-2.5 text-[#083d07]" />
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
                        className="w-full h-8 bg-gray-50/50 focus:bg-white border border-gray-200 focus:border-[#083d07] rounded-lg px-2 text-xs outline-none transition-colors"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-gray-600 mb-0.5 flex items-center gap-0.5 uppercase">
                        <Phone className="w-2.5 h-2.5 text-[#083d07]" />
                        <span>WhatsApp *</span>
                      </label>
                      <input
                        type="tel"
                        placeholder="(41) 9xxxx-xxxx"
                        value={telefone}
                        onChange={(e) => {
                          setTelefone(e.target.value);
                          saveCustomerData({ telefone: e.target.value });
                        }}
                        className="w-full h-8 bg-gray-50/50 focus:bg-white border border-gray-200 focus:border-[#083d07] rounded-lg px-2 text-xs outline-none transition-colors"
                      />
                    </div>
                  </div>

                  {/* Se Entrega: Endereço & Bairro */}
                  {orderType === "Delivery" && (
                    <div className="space-y-1.5 bg-emerald-50/30 p-2 rounded-lg border border-emerald-100">
                      <div>
                        <label className="block text-[10px] font-bold text-gray-600 mb-0.5 flex items-center gap-0.5 uppercase">
                          <MapPin className="w-2.5 h-2.5 text-[#083d07]" />
                          <span>Endereço Completo *</span>
                        </label>
                        <input
                          type="text"
                          placeholder="Rua, número, complemento / apto"
                          value={morada}
                          onChange={(e) => {
                            setMorada(e.target.value);
                            saveCustomerData({ morada: e.target.value });
                          }}
                          className="w-full h-8 bg-white border border-gray-200 focus:border-[#083d07] rounded-lg px-2 text-xs outline-none transition-colors"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-gray-600 mb-0.5 uppercase">
                          Bairro de Entrega (São José dos Pinhais) *
                        </label>
                        <select
                          value={zona}
                          onChange={(e) => {
                            setZona(e.target.value);
                            saveCustomerData({ zona: e.target.value });
                          }}
                          className="w-full h-8 bg-white border border-gray-200 focus:border-[#083d07] rounded-lg px-2 text-xs outline-none font-medium transition-colors"
                        >
                          <option value="">Selecione o bairro...</option>
                          {Object.keys(zonesFees).map((z) => (
                            <option key={z} value={z}>
                              {z} ({zonesFees[z] === 0 || subtotal >= freeDeliveryThreshold ? "Entrega Grátis" : `+R$ ${brl(zonesFees[z])}`})
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  )}

                  {/* Formas de Pagamento Dinâmicas (Controladas no Gestor) */}
                  <div>
                    <label className="block text-[10px] font-bold text-gray-600 mb-1 uppercase">
                      Forma de Pagamento *
                    </label>

                    {/* Caso Somente Pix esteja ativo (padrão de hoje) */}
                    {paymentConfig.pix && !paymentConfig.dinheiro && !paymentConfig.credito && !paymentConfig.debito ? (
                      <div className="h-9 px-3 rounded-xl bg-[#083d07]/5 border border-[#083d07]/30 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-[#083d07]" />
                          <span className="font-bold text-xs text-[#083d07]">Pix</span>
                        </div>
                        <span className="text-[10px] text-[#745240] font-medium">Pagamento instantâneo via Pix</span>
                      </div>
                    ) : (
                      /* Caso o gestor libere mais opções */
                      <div className="space-y-1.5">
                        <div className="grid grid-cols-2 gap-1.5">
                          {paymentConfig.pix && (
                            <button
                              type="button"
                              onClick={() => {
                                setPagamento('Pix');
                                saveCustomerData({ pagamento: 'Pix' });
                              }}
                              className={`py-2 px-2.5 rounded-lg text-xs font-semibold border flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                                pagamento === 'Pix'
                                  ? 'bg-[#E5DDD4] text-[#44210F] border-[#D5AF7A] font-bold shadow-xs'
                                  : 'bg-white text-[#745240] border-[#E8D8D1] hover:bg-[#FDFBF7]'
                              }`}
                            >
                              <span>Pix</span>
                            </button>
                          )}
                          {paymentConfig.dinheiro && (
                            <button
                              type="button"
                              onClick={() => {
                                setPagamento('Dinheiro');
                                saveCustomerData({ pagamento: 'Dinheiro' });
                              }}
                              className={`py-2 px-2.5 rounded-lg text-xs font-semibold border flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                                pagamento === 'Dinheiro'
                                  ? 'bg-[#E5DDD4] text-[#44210F] border-[#D5AF7A] font-bold shadow-xs'
                                  : 'bg-white text-[#745240] border-[#E8D8D1] hover:bg-[#FDFBF7]'
                              }`}
                            >
                              <span>Dinheiro</span>
                            </button>
                          )}
                          {paymentConfig.credito && (
                            <button
                              type="button"
                              onClick={() => {
                                setPagamento('Cartão de Crédito');
                                saveCustomerData({ pagamento: 'Cartão de Crédito' });
                              }}
                              className={`py-2 px-2.5 rounded-lg text-xs font-semibold border flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                                pagamento === 'Cartão de Crédito'
                                  ? 'bg-[#E5DDD4] text-[#44210F] border-[#D5AF7A] font-bold shadow-xs'
                                  : 'bg-white text-[#745240] border-[#E8D8D1] hover:bg-[#FDFBF7]'
                              }`}
                            >
                              <span>Cartão Crédito</span>
                            </button>
                          )}
                          {paymentConfig.debito && (
                            <button
                              type="button"
                              onClick={() => {
                                setPagamento('Cartão de Débito');
                                saveCustomerData({ pagamento: 'Cartão de Débito' });
                              }}
                              className={`py-2 px-2.5 rounded-lg text-xs font-semibold border flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                                pagamento === 'Cartão de Débito'
                                  ? 'bg-[#E5DDD4] text-[#44210F] border-[#D5AF7A] font-bold shadow-xs'
                                  : 'bg-white text-[#745240] border-[#E8D8D1] hover:bg-[#FDFBF7]'
                              }`}
                            >
                              <span>Cartão Débito</span>
                            </button>
                          )}
                        </div>

                        {/* Se selecionado Dinheiro, abre o campo de troco */}
                        {pagamento === 'Dinheiro' && (
                          <div className="pt-1">
                            <label className="block text-[10px] font-bold text-gray-600 mb-0.5">
                              Troco para quanto? (R$)
                            </label>
                            <input
                              type="text"
                              inputMode="decimal"
                              placeholder="Ex: 50,00 ou Não precisa de troco"
                              value={trocoPara}
                              onChange={(e) => setTrocoPara(e.target.value)}
                              className="w-full h-8 bg-white border border-gray-200 focus:border-[#083d07] rounded-lg px-2 text-xs outline-none font-medium transition-colors"
                            />
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* CPF opcional */}
                  <div className="pt-0.5">
                    {!showNifInput && !nif ? (
                      <button
                        type="button"
                        onClick={() => setShowNifInput(true)}
                        className="text-[10px] text-gray-400 hover:text-gray-700 flex items-center gap-0.5 cursor-pointer"
                      >
                        <FileText className="w-2.5 h-2.5" />
                        <span>+ Adicionar CPF na nota (opcional)</span>
                      </button>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        <input
                          type="text"
                          placeholder="CPF na nota (opcional)"
                          value={nif}
                          onChange={(e) => {
                            setNif(e.target.value);
                            saveCustomerData({ nif: e.target.value });
                          }}
                          className="h-7 w-full bg-white border border-gray-200 focus:border-[#083d07] rounded-lg px-2 text-xs outline-none"
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
                        zona.trim() ? (
                          <>Taxa entrega: <strong className="text-emerald-600">{deliveryFee === 0 ? 'GRÁTIS' : `R$ ${brl(deliveryFee)}`}</strong></>
                        ) : (
                          <>Taxa entrega: <strong className="text-amber-700 font-semibold">Escolha o bairro</strong></>
                        )
                      ) : (
                        'Retirada no balcão'
                      )}
                    </span>
                    <div className="flex items-center gap-1">
                      <span className="text-gray-500 font-medium">Total:</span>
                      <span className="font-black text-[#083d07] text-base">
                        R$ {brl(total)}
                        {orderType === "Delivery" && !zona.trim() && (
                          <span className="text-[10px] font-normal text-[#745240] ml-1">(+ entrega)</span>
                        )}
                      </span>
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
