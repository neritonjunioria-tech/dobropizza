
import React from 'react';
import { X, Pizza, ArrowRight } from "lucide-react";


interface PizzaDayModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAction: () => void;
}

export default function PizzaDayModal({ isOpen, onClose, onAction }: PizzaDayModalProps) {
  React.useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm transition-opacity"
      onClick={onClose}
    >
      <div 
        className="bg-white text-[#1a1a1a] rounded-3xl w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl relative flex flex-col transform transition-all scale-100 animate-in fade-in zoom-in-95 duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 bg-black/40 backdrop-blur-md rounded-full text-white hover:bg-black/60 z-20 transition-colors shadow-lg"
        >
          <X className="w-5 h-5" />
        </button>
        
        <div className="relative w-full h-[40vh] sm:h-[350px] bg-[#083d07] overflow-hidden">
          <img
            src="/dobro/logo-dobro.png"
            alt="Dia da Pizza"
            className="w-full h-full object-cover object-center"
          />
        </div>

        <div className="p-7 text-center shrink-0">
          <div className="text-gray-600 mb-6 leading-relaxed space-y-3">
            <p className="text-[17px] font-bold text-gray-900 leading-snug">
              Hoje é o Dia Mundial da Pizza e o nosso Aniversário de 1 Mês!
            </p>
            <p className="text-sm">
              Temos um destaque especial te esperando. Clique abaixo para conferir e pedir a sua.
            </p>
          </div>

          <button
            onClick={() => {
              onAction();
              onClose();
            }}
            className="flex items-center justify-center gap-2 w-full bg-[#083d07] hover:bg-[#0b520a] text-[#fdfbf7] font-bold py-4 px-4 rounded-2xl transition-all shadow-xl shadow-[#083d07]/30 active:scale-[0.98]"
          >
            Garantir Minha Promoção <ArrowRight className="w-5 h-5" />
          </button>
          
          <button
            onClick={onClose}
            className="mt-5 text-gray-400 font-medium text-sm hover:text-gray-600 transition-colors"
          >
            Não quero aproveitar agora
          </button>
        </div>
      </div>
    </div>
  );
}
