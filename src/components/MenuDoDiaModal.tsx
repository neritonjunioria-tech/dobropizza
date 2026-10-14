import React from 'react';
import { X } from "lucide-react";
import { MenuItem } from "../data/menu";
import { getLisbonDate } from "../utils/date";

interface MenuDoDiaModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectItem: (item: MenuItem) => void;
  menuItems: MenuItem[];
}

export default function MenuDoDiaModal({ isOpen, onClose, onSelectItem, menuItems }: MenuDoDiaModalProps) {
  React.useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;
  
  const now = getLisbonDate();
  const todayDayOfWeek = now.getDay();
  // Filter items in the 'promocoes' category for today
  const todaysPromos = menuItems.filter(i => (i.category === 'promocoes' || (i as any).groupOverride === 'promocoes') && i.dayOfWeek === todayDayOfWeek);

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm transition-opacity"
      onClick={onClose}
    >
      <div 
        className="bg-white text-[#1a1a1a] rounded-2xl w-full max-w-lg max-h-[90vh] overflow-hidden shadow-2xl relative flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 border-b border-gray-100 flex justify-between items-center sticky top-0 bg-white z-10">
          <h3 className="font-extrabold text-2xl text-[#8b0000]">
            📢 PROMOÇÃO DO DIA!
          </h3>
          <button
            onClick={onClose}
            className="p-2 bg-gray-100 rounded-full text-gray-700 hover:bg-gray-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-4 overflow-y-auto bg-gray-50 flex-1">
          {(() => {
            if (todaysPromos.length === 0) {
              return <div className="text-center p-8 text-gray-500">Nenhuma promoção do dia cadastrada no momento.</div>;
            }

            return (
              <>
                {todaysPromos.map(item => {
                  return (
                    <div
                      key={item.id}
                      className="mb-4 p-5 rounded-2xl border-2 transition-all border-green-500 bg-white shadow-md"
                    >
                      <div className="w-full flex justify-center mb-4">
                        <div className="w-full sm:max-w-[300px] aspect-[4/5] rounded-xl shadow-sm border border-gray-100 overflow-hidden bg-gray-100 relative group flex items-center justify-center">
                          <img 
                            src={item.imageUrl ? (item.imageUrl.startsWith('http') ? item.imageUrl : (item.imageUrl.startsWith('/') ? item.imageUrl : '/' + item.imageUrl)) : "/placeholder.webp"} 
                            alt={item.name} 
                            className="w-full h-full object-contain object-center group-hover:scale-105 transition-transform duration-500" 
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = "/placeholder.webp";
                            }}
                          />
                        </div>
                      </div>
                      <div className="flex justify-between items-start mb-3">
                        <h4 className="font-bold text-lg text-green-700">
                          {item.name}
                        </h4>
                        <span className="bg-green-600 text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider animate-pulse">
                          HOJE
                        </span>
                      </div>
                      <p className="text-[15px] text-gray-600 mb-4 leading-relaxed whitespace-pre-line">
                        {item.ingredients !== 'EM BREVE' ? item.ingredients : 'Prato especial do dia!'}
                      </p>
                      
                      <div className="flex justify-between items-center pt-4 border-t border-gray-100">
                        <span className="font-extrabold text-[#8b0000] text-lg">
                          R$ {item.priceSingle ? Number(item.priceSingle).toFixed(2) : '0.00'}
                        </span>
                        <button
                          onClick={() => {
                            onSelectItem(item);
                            onClose();
                          }}
                          className="px-5 py-2.5 rounded-xl text-sm font-bold transition-colors bg-[#8b0000] text-white hover:bg-[#6b0000]"
                        >
                          Pedir Agora
                        </button>
                      </div>
                    </div>
                  );
                })}
              </>
            );
          })()}
        </div>
      </div>
    </div>
  );
}
