import React, { useState, useEffect } from 'react';
import { MenuItem, ExtraIngredient } from '../data/menu';
import { CartItem } from '../types';
import { X, Check, ShoppingBag } from 'lucide-react';
import { useExtras } from '../hooks/useExtras';
import { hapticLight, hapticMedium } from '../utils/haptics';

interface PizzaModalProps {
  item: MenuItem | null;
  pausedItems?: string[];
  isOpen: boolean;
  onClose: () => void;
  onAddToCart: (item: CartItem, openCart?: boolean) => void;
  initialSize: 'P' | 'M' | 'G';
  allMenuItems: MenuItem[];
}

export default function PizzaModal({ item, isOpen, onClose, onAddToCart, initialSize, pausedItems = [], allMenuItems = [] }: PizzaModalProps) {
  const extrasList = useExtras();
  const menuPizzas = allMenuItems.filter(i => i.id.startsWith('p-'));
  const menuBordas = allMenuItems.filter(i => i.id.startsWith('bd-') && !pausedItems.includes(i.id));
  const menuBebidas = allMenuItems.filter(i => i.id.startsWith('b-') && !i.id.startsWith('bd-'));
  const [selectedSize, setSelectedSize] = useState<'P' | 'M' | 'G'>(initialSize);
  const [isHalf, setIsHalf] = useState(false);
  const [secondFlavorId, setSecondFlavorId] = useState<string>('');
  const [selectedExtras, setSelectedExtras] = useState<ExtraIngredient[]>([]);
  const [selectedBorda, setSelectedBorda] = useState<MenuItem | null>(null);
  const [selectedDrinks, setSelectedDrinks] = useState<MenuItem[]>([]);
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState('');
  const [selectedVariant, setSelectedVariant] = useState('Normal');
  const [promoFlavor, setPromoFlavor] = useState('');
  const [promoFlavor2, setPromoFlavor2] = useState('');
  const [esfihaTradicionais, setEsfihaTradicionais] = useState<string[]>(['', '', '', '', '']);
  const [esfihaDoces, setEsfihaDoces] = useState<string[]>(['', '', '', '', '']);
  
  useEffect(() => {
    if (isOpen && item) {
       setSelectedSize(item.priceM === undefined ? 'G' : initialSize);
       setIsHalf(false);
       setSecondFlavorId('');
       setSelectedExtras([]);
       setSelectedBorda(null);
       setSelectedDrinks([]);
       setQuantity(1);
       setNotes('');
       setSelectedVariant('Normal');
       setPromoFlavor('');
       setPromoFlavor2('');
       setEsfihaTradicionais(['', '', '', '', '']);
       setEsfihaDoces(['', '', '', '', '']);
    }
  }, [isOpen, item, initialSize]);

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

  if (!isOpen || !item) return null;

  const isMondayPromoPizza = item.id === 'md-1-pizza';
  const mondayPromoFlavors = ['Calabresa', 'Calabresa acebolada', 'Da Casa', 'Calapiry', 'Crocante', 'Frampalha', 'Marguerita'];

  const isTuesdayPromoPizza = item.id === 'md-2-pizza';
  const tuesdayPromoFlavors = ['Da Casa', 'Frango c/ catupiry', 'Carijó', 'Fiambre c/ queijo', 'Milho', 'Tradicional'];

  const isTuesdayPromoEsfirra = item.id === 'md-2-esfirra';
  const tradEsfihas = allMenuItems.filter(i => i.category === 'esfihas-salgadas-tradicionais');
  const doceEsfihas = allMenuItems.filter(i => i.category === 'esfihas-doces');
  
  const isPromoPizza = (item.category === 'promocoes' || (item as any).groupOverride === 'promocoes') && item.name.toLowerCase().includes('pizza');

  const hasSizes = item.priceM !== undefined && item.priceG !== undefined;
  const calculatedPriceP = item.priceP || (item.priceM ? Math.max(item.priceM - 2, 0) : undefined);
  
  // Calculate display price based on size and half-and-half
  let currentPrice = selectedSize === 'P' ? calculatedPriceP : selectedSize === 'M' ? item.priceM : (item.priceG || item.priceSingle || item.priceM || 0);
  const selectedSecondFlavor = menuPizzas.find(p => p.id === secondFlavorId);
  if (selectedSize === 'G' && isHalf && selectedSecondFlavor && selectedSecondFlavor.priceG) {
       currentPrice = Math.max(item.priceG || 0, selectedSecondFlavor.priceG);
  }

  // Add the price of selected extras
  const extrasTotalPrice = selectedExtras.reduce((sum, extra) => sum + extra.price, 0);
  if (currentPrice !== undefined) {
    currentPrice += extrasTotalPrice;
    if (selectedBorda && selectedBorda.priceSingle !== undefined) {
      currentPrice += selectedBorda.priceSingle;
    }
    const drinksTotalPrice = selectedDrinks.reduce((sum, drink) => sum + (drink.priceSingle || 0), 0);
    currentPrice += drinksTotalPrice;
  }

  const handleToggleExtra = (extra: ExtraIngredient) => {
    hapticLight();
    setSelectedExtras(prev => {
      const isSelected = prev.some(e => e.id === extra.id);
      if (isSelected) {
        return prev.filter(e => e.id !== extra.id);
      } else {
        return [...prev, extra];
      }
    });
  };

  const handleAdd = (openCart: boolean) => {
    hapticMedium();
    let finalExtras = [...selectedExtras];
    if (selectedBorda) {
      finalExtras.unshift({ id: selectedBorda.id, name: selectedBorda.name, price: selectedBorda.priceSingle! });
    }
    selectedDrinks.forEach(drink => {
      finalExtras.push({ id: drink.id, name: drink.name, price: drink.priceSingle || 0 });
    });

    let notesToSave = notes.trim();
    if (isMondayPromoPizza && promoFlavor) {
      notesToSave = `Sabor: ${promoFlavor}\nBebida: Coca-Cola ${selectedVariant}\n${notesToSave}`.trim();
    } else if (isTuesdayPromoPizza && promoFlavor && promoFlavor2) {
      notesToSave = `Sabor 1: ${promoFlavor}\nSabor 2: ${promoFlavor2}\n${notesToSave}`.trim();
    } else if (item.id === 'md-2-esfirra') {
      const trads = esfihaTradicionais.filter(f => f).join(', ');
      const doces = esfihaDoces.filter(f => f).join(', ');
      notesToSave = `Bebida: Coca-Cola ${selectedVariant}\n5 Esfirras Tradicionais:\n${trads}\n\n5 Esfirras Doces:\n${doces}\n\n${notesToSave}`.trim();
    }

    onAddToCart({
      id: crypto.randomUUID(),
      menuItem: item,
      quantity: quantity,
      size: hasSizes ? selectedSize : undefined,
      isHalfAndHalf: (selectedSize === 'G' && isHalf && !!selectedSecondFlavor),
      halfAndHalfFlavor: selectedSecondFlavor,
      extras: finalExtras,
      priceCalculated: currentPrice!,
      notes: notesToSave ? notesToSave : undefined
    }, openCart);
    onClose();
  };

  const isEsfirrasIncomplete = isTuesdayPromoEsfirra && (esfihaTradicionais.some(f => !f) || esfihaDoces.some(f => !f));

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm transition-opacity"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden text-[#1a1a1a] flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50 flex-shrink-0">
          <h3 className="font-bold text-lg">{item.name}</h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full text-gray-500 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-5 overflow-y-auto">
           <p className="text-gray-500 text-sm mb-2 leading-relaxed bg-gray-50 p-3 rounded-lg border border-gray-100">{item.ingredients}</p>
           <p className="text-[11px] text-gray-400 mb-1">Contém: Glúten, leite e derivados.</p>
           {item.id.startsWith('p-') && (
             <p className="text-[11px] text-gray-400 mb-6">Todas as pizzas são finalizadas com orégãos.</p>
           )}
           {!item.id.startsWith('p-') && <div className="mb-6" />}
           {(item.id === 'md-2-esfirra' || isMondayPromoPizza) && (
             <div className="mb-6">
                <h4 className="font-bold mb-3 text-sm uppercase tracking-wide text-gray-800">Escolha a Versão da Coca-Cola:</h4>
                <div className="flex flex-col gap-3">
                   <button
                     onClick={() => setSelectedVariant('Normal')}
                     className={`p-3 rounded-xl border-2 text-left transition-all ${selectedVariant === 'Normal' ? 'border-[#083d07] bg-[#083d07]/5' : 'border-gray-200 hover:border-gray-300 bg-white'}`}
                   >
                      <div className="flex justify-between items-center">
                         <span className="font-bold text-sm">Normal</span>
                         <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${selectedVariant === 'Normal' ? 'border-[#083d07] bg-[#083d07]' : 'border-gray-300'}`}>
                            {selectedVariant === 'Normal' && <Check className="w-3 h-3 text-white" />}
                         </div>
                      </div>
                   </button>
                   <button
                     onClick={() => setSelectedVariant('Zero')}
                     className={`p-3 rounded-xl border-2 text-left transition-all ${selectedVariant === 'Zero' ? 'border-[#083d07] bg-[#083d07]/5' : 'border-gray-200 hover:border-gray-300 bg-white'}`}
                   >
                      <div className="flex justify-between items-center">
                         <span className="font-bold text-sm">Zero</span>
                         <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${selectedVariant === 'Zero' ? 'border-[#083d07] bg-[#083d07]' : 'border-gray-300'}`}>
                            {selectedVariant === 'Zero' && <Check className="w-3 h-3 text-white" />}
                         </div>
                      </div>
                   </button>
                </div>
             </div>
           )}


           {isMondayPromoPizza && (
             <div className="mb-6">
                <h4 className="font-bold mb-3 text-sm uppercase tracking-wide text-gray-800">Sabor da Pizza (Obrigatório):</h4>
                <select
                  value={promoFlavor}
                  onChange={(e) => setPromoFlavor(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#083d07] text-sm"
                >
                  <option value="">Selecione o sabor...</option>
                  {mondayPromoFlavors.map(flavor => (
                    <option key={flavor} value={flavor}>{flavor}</option>
                  ))}
                </select>
             </div>
           )}

           {isTuesdayPromoPizza && (
             <div className="mb-6 flex flex-col gap-4">
                <div>
                  <h4 className="font-bold mb-3 text-sm uppercase tracking-wide text-gray-800">Sabor da Pizza 1 (Obrigatório):</h4>
                  <select
                    value={promoFlavor}
                    onChange={(e) => setPromoFlavor(e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#083d07] text-sm"
                  >
                    <option value="">Selecione o sabor 1...</option>
                    {tuesdayPromoFlavors.map(flavor => (
                      <option key={flavor} value={flavor}>{flavor}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <h4 className="font-bold mb-3 text-sm uppercase tracking-wide text-gray-800">Sabor da Pizza 2 (Obrigatório):</h4>
                  <select
                    value={promoFlavor2}
                    onChange={(e) => setPromoFlavor2(e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#083d07] text-sm"
                  >
                    <option value="">Selecione o sabor 2...</option>
                    {tuesdayPromoFlavors.map(flavor => (
                      <option key={flavor} value={flavor}>{flavor}</option>
                    ))}
                  </select>
                </div>
             </div>
           )}

           {isTuesdayPromoEsfirra && (
             <div className="mb-6 flex flex-col gap-6">
                <div>
                  <h4 className="font-bold mb-3 text-sm uppercase tracking-wide text-gray-800">5 Esfirras Tradicionais (Obrigatório):</h4>
                  <div className="flex flex-col gap-2">
                    {[0,1,2,3,4].map(idx => (
                      <select
                        key={`trad-${idx}`}
                        value={esfihaTradicionais[idx]}
                        onChange={(e) => {
                          const newArr = [...esfihaTradicionais];
                          newArr[idx] = e.target.value;
                          setEsfihaTradicionais(newArr);
                        }}
                        className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#083d07] text-sm"
                      >
                        <option value="">Selecione o sabor...</option>
                        {tradEsfihas.map(flavor => (
                          <option key={flavor.id} value={flavor.name}>{flavor.name}</option>
                        ))}
                      </select>
                    ))}
                  </div>
                </div>
                <div>
                  <h4 className="font-bold mb-3 text-sm uppercase tracking-wide text-gray-800">5 Esfirras Doces (Obrigatório):</h4>
                  <div className="flex flex-col gap-2">
                    {[0,1,2,3,4].map(idx => (
                      <select
                        key={`doce-${idx}`}
                        value={esfihaDoces[idx]}
                        onChange={(e) => {
                          const newArr = [...esfihaDoces];
                          newArr[idx] = e.target.value;
                          setEsfihaDoces(newArr);
                        }}
                        className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#083d07] text-sm"
                      >
                        <option value="">Selecione o sabor...</option>
                        {doceEsfihas.map(flavor => (
                          <option key={flavor.id} value={flavor.name}>{flavor.name}</option>
                        ))}
                      </select>
                    ))}
                  </div>
                </div>
             </div>
           )}

           {hasSizes && (
             <div className="mb-6">
                <h4 className="font-bold mb-3 text-sm uppercase tracking-wide text-gray-800">Escolha o Tamanho:</h4>
                <div className="flex flex-col gap-3">
                   {calculatedPriceP !== undefined && <button 
                     onClick={() => { hapticLight(); setSelectedSize('P'); }}
                     disabled={pausedItems?.includes(`${item?.id}-P`)}
                     className={`p-3 rounded-xl border-2 text-left transition-all ${pausedItems?.includes(`${item?.id}-P`) ? 'opacity-50 grayscale cursor-not-allowed bg-gray-100' : (selectedSize === 'P' ? 'border-[#083d07] bg-[#083d07]/5' : 'border-gray-200 hover:border-gray-300 bg-white')}`}
                   >
                      <div className="flex justify-between items-center">
                         <span className="font-bold text-sm">Pequena (P)</span>
                         <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${selectedSize === 'P' ? 'border-[#083d07] bg-[#083d07]' : 'border-gray-300'}`}>
                            {selectedSize === 'P' && <Check className="w-3 h-3 text-white" />}
                         </div>
                      </div>
                      <span className="text-[11px] text-gray-500 block mt-1">6 fatias | 1 sabor</span>
                      <span className="text-[#083d07] font-bold mt-2 block text-lg">R$ {calculatedPriceP.toFixed(2)}</span>
                   </button>}

                   <button 
                     onClick={() => { hapticLight(); setSelectedSize('M'); setIsHalf(false); }}
                     disabled={pausedItems?.includes(`${item?.id}-M`)}
                     className={`p-3 rounded-xl border-2 text-left transition-all ${pausedItems?.includes(`${item?.id}-M`) ? 'opacity-50 grayscale cursor-not-allowed bg-gray-100' : (selectedSize === 'M' ? 'border-[#083d07] bg-[#083d07]/5' : 'border-gray-200 hover:border-gray-300 bg-white')}`}
                   >
                      <div className="flex justify-between items-center">
                         <span className="font-bold text-sm">Média (M)</span>
                         <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${selectedSize === 'M' ? 'border-[#083d07] bg-[#083d07]' : 'border-gray-300'}`}>
                            {selectedSize === 'M' && <Check className="w-3 h-3 text-white" />}
                         </div>
                      </div>
                      <span className="text-[11px] text-gray-500 block mt-1">8 fatias | 1 sabor</span>
                      <span className="text-[#083d07] font-bold mt-2 block text-lg">R$ {item.priceM?.toFixed(2)}</span>
                   </button>

                   <button 
                     onClick={() => { hapticLight(); setSelectedSize('G'); }}
                     disabled={pausedItems?.includes(`${item?.id}-G`)}
                     className={`p-3 rounded-xl border-2 text-left transition-all ${pausedItems?.includes(`${item?.id}-G`) ? 'opacity-50 grayscale cursor-not-allowed bg-gray-100' : (selectedSize === 'G' ? 'border-[#083d07] bg-[#083d07]/5' : 'border-gray-200 hover:border-gray-300 bg-white')}`}
                   >
                      <div className="flex justify-between items-center">
                         <span className="font-bold text-sm">Grande (G)</span>
                         <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${selectedSize === 'G' ? 'border-[#083d07] bg-[#083d07]' : 'border-gray-300'}`}>
                            {selectedSize === 'G' && <Check className="w-3 h-3 text-white" />}
                         </div>
                      </div>
                      <span className="text-[11px] text-gray-500 block mt-1">10 fatias | até 2 sabores</span>
                      <span className="text-[#083d07] font-bold mt-2 block text-lg">R$ {item.priceG?.toFixed(2)}</span>
                   </button>
                </div>
             </div>
           )}

           {hasSizes && selectedSize === 'G' && (
              <div className="mb-6 p-4 rounded-xl border border-gray-200 bg-gray-50">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={isHalf}
                    onChange={(e) => { setIsHalf(e.target.checked); if(!e.target.checked) setSecondFlavorId(''); }}
                    className="w-5 h-5 accent-[#083d07] rounded"
                  />
                  <div>
                    <span className="font-bold block text-sm">Adicionar 2º Sabor (Opcional)</span>
                    <span className="text-xs text-gray-500">Será cobrado pelo sabor mais caro</span>
                  </div>
                </label>

                {isHalf && (
                  <div className="mt-4">
                    <select
                      value={secondFlavorId}
                      onChange={(e) => setSecondFlavorId(e.target.value)}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#083d07] text-sm"
                    >
                      <option value="">Selecione o 2º sabor...</option>
                      {menuPizzas.filter(p => p.id !== item.id && p.id !== 'p-61' && p.priceG !== undefined).map(p => (
                        <option key={p.id} value={p.id}>
                          MEIA {p.name} (Tira-teima: R$ {Math.max(p.priceG || 0, item.priceG || 0).toFixed(2)})
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
           )}

           {/* Borda Selection */}
           {(hasSizes || isMondayPromoPizza || isTuesdayPromoPizza || isPromoPizza) && (
             <div className="mb-6">
               <h4 className="font-bold mb-3 text-sm uppercase tracking-wide text-gray-800">Borda Recheada (Opcional):</h4>
               <div className="flex flex-col gap-2">
                 <label className={`flex items-center justify-between p-3 rounded-lg border-2 cursor-pointer transition-colors ${!selectedBorda ? 'border-[#083d07] bg-[#083d07]/5' : 'border-gray-200 hover:border-gray-300'}`}>
                   <div className="flex items-center gap-3">
                     <input 
                       type="radio" 
                       name="borda"
                       checked={!selectedBorda}
                       onChange={() => setSelectedBorda(null)}
                       className="w-5 h-5 accent-[#083d07]"
                     />
                     <span className="font-medium text-sm">Sem Borda</span>
                   </div>
                 </label>
                 {menuBordas.filter(borda => !pausedItems?.includes(borda.id)).map((borda) => {
                   const isSelected = selectedBorda?.id === borda.id;
                   return (
                     <label key={borda.id} className={`flex items-center justify-between p-3 rounded-lg border-2 cursor-pointer transition-colors ${isSelected ? 'border-[#083d07] bg-[#083d07]/5' : 'border-gray-200 hover:border-gray-300'}`}>
                       <div className="flex items-center gap-3">
                         <input 
                           type="radio" 
                           name="borda"
                           checked={isSelected}
                           onChange={() => setSelectedBorda(borda)}
                           className="w-5 h-5 accent-[#083d07]"
                         />
                         <span className="font-medium text-sm">{borda.name}</span>
                       </div>
                       <span className="text-[#083d07] font-bold text-sm">+ R$ {borda.priceSingle!.toFixed(2)}</span>
                     </label>
                   );
                 })}
               </div>
             </div>
           )}

           {/* Extras Selection */}
           {item.category !== 'bebidas' && item.category !== 'bordas' && item.id !== 'md-1-esfirra' && (
             <div className="mb-6">
               <h4 className="font-bold mb-3 text-sm uppercase tracking-wide text-gray-800">Adicionais Extras (Opcional):</h4>
               <div className="flex flex-col gap-2">
                 {extrasList.map((extra) => {
                   const isSelected = selectedExtras.some(e => e.id === extra.id);
                   return (
                     <label key={extra.id} className={`flex items-center justify-between p-3 rounded-lg border-2 cursor-pointer transition-colors ${isSelected ? 'border-[#083d07] bg-[#083d07]/5' : 'border-gray-200 hover:border-gray-300'}`}>
                       <div className="flex items-center gap-3 pr-4">
                         <input 
                           type="checkbox" 
                           checked={isSelected}
                           onChange={() => handleToggleExtra(extra)}
                           className="w-5 h-5 accent-[#083d07] rounded flex-shrink-0"
                         />
                         <span className="font-medium text-sm">{extra.name}</span>
                       </div>
                       <span className="text-[#083d07] font-bold text-sm whitespace-nowrap flex-shrink-0">+ R$ {extra.price.toFixed(2)}</span>
                     </label>
                   );
                 })}
               </div>
             </div>
           )}

           {/* Drinks Selection */}
           {item.id === 'md-1-esfirra' && (
             <div className="mb-6">
               <h4 className="font-bold mb-3 text-sm uppercase tracking-wide text-gray-800">Adicionar Bebida (Opcional):</h4>
               <div className="flex flex-col gap-2">
                 {menuBebidas.map((drink) => {
                   const isSelected = selectedDrinks.some(d => d.id === drink.id);
                   return (
                     <label key={drink.id} className={`flex items-center justify-between p-3 rounded-lg border-2 cursor-pointer transition-colors ${isSelected ? 'border-[#083d07] bg-[#083d07]/5' : 'border-gray-200 hover:border-gray-300'}`}>
                       <div className="flex items-center gap-3 pr-4">
                         <input 
                           type="checkbox" 
                           checked={isSelected}
                           onChange={() => {
                             if (isSelected) {
                               setSelectedDrinks(prev => prev.filter(d => d.id !== drink.id));
                             } else {
                               setSelectedDrinks(prev => [...prev, drink]);
                             }
                           }}
                           className="w-5 h-5 accent-[#083d07] rounded flex-shrink-0"
                         />
                         <span className="font-medium text-sm">{drink.name}</span>
                       </div>
                       <span className="text-[#083d07] font-bold text-sm whitespace-nowrap flex-shrink-0">+ R$ {(drink.priceSingle || 0).toFixed(2)}</span>
                     </label>
                   );
                 })}
               </div>
             </div>
           )}

           {/* Campo de Observações */}
           {item.category !== 'bebidas' && (
             <div className="mb-6">
               <div className="flex justify-between items-center mb-2">
                 <label htmlFor="order-notes" className="font-bold text-sm uppercase tracking-wide text-gray-800">
                   Observações do Pedido
                 </label>
                 <span className="text-xs text-gray-400">{notes.length}/250</span>
               </div>
               <textarea
                 id="order-notes"
                 value={notes}
                 onChange={(e) => setNotes(e.target.value)}
                 maxLength={250}
                 rows={3}
                 placeholder={item.id === 'md-2-esfirra' ? "Escreva aqui os sabores das esfirras (ex: 3 carne, 2 queijo, 5 chocolate)..." : "Ex.: Sem cebola, sem queijo, massa bem assada, cortar em 8 pedaços..."}
                 className="w-full p-3 text-sm border-2 border-gray-200 rounded-xl focus:border-[#083d07] focus:outline-none transition-colors resize-none placeholder:text-gray-400"
               />
             </div>
           )}

           <div className="mb-6 flex justify-between items-center bg-gray-50 p-4 rounded-xl border border-gray-100">
             <div className="flex items-center gap-4">
               <button 
                 onClick={() => {
                   hapticLight();
                   setQuantity(Math.max(1, quantity - 1));
                 }}
                 className="w-10 h-10 rounded-full bg-white border border-gray-200 flex items-center justify-center text-[#083d07] font-bold text-xl hover:bg-gray-100 active:scale-95 transition-all shadow-sm"
               >
                 -
               </button>
               <span className="font-bold text-xl w-6 text-center text-gray-800">{quantity}</span>
               <button 
                 onClick={() => {
                   hapticLight();
                   setQuantity(quantity + 1);
                 }}
                 className="w-10 h-10 rounded-full bg-white border border-gray-200 flex items-center justify-center text-[#083d07] font-bold text-xl hover:bg-gray-100 active:scale-95 transition-all shadow-sm"
               >
                 +
               </button>
             </div>
             <div className="text-right">
               <div className="text-xs text-gray-500 font-bold uppercase tracking-wide mb-1">Total</div>
               <div className="text-[#083d07] font-bold text-2xl">R$ {((currentPrice || 0) * quantity).toFixed(2)}</div>
             </div>
           </div>

           <div className="flex flex-col gap-3">
             <button 
               onClick={() => handleAdd(true)}
               disabled={(isHalf && !secondFlavorId) || (isMondayPromoPizza && !promoFlavor) || (isTuesdayPromoPizza && (!promoFlavor || !promoFlavor2)) || isEsfirrasIncomplete}
               className="w-full bg-[#083d07] hover:bg-[#052904] disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-bold py-4 px-4 rounded-xl transition-transform active:scale-[0.98] shadow-md flex justify-center items-center gap-2"
             >
               <ShoppingBag className="w-5 h-5" />
               Adicionar e ver pedido
             </button>
             <button 
               onClick={() => handleAdd(false)}
               disabled={(isHalf && !secondFlavorId) || (isMondayPromoPizza && !promoFlavor) || (isTuesdayPromoPizza && (!promoFlavor || !promoFlavor2)) || isEsfirrasIncomplete}
               className="w-full bg-white text-[#083d07] border-2 border-[#083d07] disabled:text-gray-400 disabled:border-gray-300 disabled:cursor-not-allowed font-bold py-3.5 px-4 rounded-xl transition-transform active:scale-[0.98] flex justify-center items-center gap-2"
             >
               Adicionar e continuar comprando
             </button>
           </div>
        </div>
      </div>
    </div>
  );
}
