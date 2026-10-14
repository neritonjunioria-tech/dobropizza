import React, { useState, useRef, useEffect } from 'react';
import { Calendar, ChevronDown, Check } from 'lucide-react';

export type PeriodFilterOption = 
  | 'hoje' 
  | 'ontem' 
  | '7dias' 
  | '30dias' 
  | 'mes' 
  | 'mes_passado' 
  | 'todos' 
  | 'customizado';

export interface PeriodFilterValue {
  period: PeriodFilterOption;
  startDate?: string;
  endDate?: string;
}

interface PeriodFilterCompactProps {
  value: PeriodFilterOption;
  startDate?: string;
  endDate?: string;
  onChange: (newValue: PeriodFilterValue) => void;
  className?: string;
  align?: 'left' | 'right';
  allowedOptions?: PeriodFilterOption[];
}

const DEFAULT_OPTIONS: { id: PeriodFilterOption; label: string }[] = [
  { id: 'hoje', label: 'Hoje' },
  { id: 'ontem', label: 'Ontem' },
  { id: '7dias', label: 'Últimos 7 dias' },
  { id: '30dias', label: 'Últimos 30 dias' },
  { id: 'mes', label: 'Este mês' },
  { id: 'mes_passado', label: 'Mês passado' },
  { id: 'todos', label: 'Todo o histórico' },
  { id: 'customizado', label: 'Personalizado' },
];

export const PeriodFilterCompact: React.FC<PeriodFilterCompactProps> = ({
  value,
  startDate = '',
  endDate = '',
  onChange,
  className = '',
  align = 'right',
  allowedOptions,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [tempStart, setTempStart] = useState(startDate);
  const [tempEnd, setTempEnd] = useState(endDate);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  useEffect(() => {
    setTempStart(startDate);
    setTempEnd(endDate);
  }, [startDate, endDate]);

  const options = allowedOptions 
    ? DEFAULT_OPTIONS.filter(opt => allowedOptions.includes(opt.id))
    : DEFAULT_OPTIONS;

  const getLabel = () => {
    if (value === 'customizado') {
      if (startDate && endDate) {
        const fmt = (d: string) => {
          const parts = d.split('-');
          return parts.length === 3 ? `${parts[2]}/${parts[1]}` : d;
        };
        return `${fmt(startDate)} a ${fmt(endDate)}`;
      }
      return 'Personalizado';
    }
    const found = DEFAULT_OPTIONS.find(o => o.id === value);
    return found ? found.label : 'Período';
  };

  const isFiltered = value !== 'todos' && value !== 'hoje';

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      {/* Botão Gatilho Compacto e Discreto */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`h-7 px-2 border rounded-lg text-[11px] font-mono font-medium flex items-center justify-between gap-1.5 transition-all cursor-pointer shadow-2xs ${
          isFiltered
            ? 'border-amber-400/80 bg-amber-50/70 text-stone-950 ring-1 ring-amber-400/20'
            : 'border-stone-200 hover:border-stone-300 bg-white text-stone-700'
        }`}
      >
        <div className="flex items-center gap-1.5 truncate">
          <Calendar size={12} className={isFiltered ? 'text-amber-700 shrink-0' : 'text-stone-400 shrink-0'} />
          <span className="truncate">{getLabel()}</span>
        </div>
        <ChevronDown size={12} className={`text-stone-400 transition-transform duration-200 shrink-0 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Popover Suspenso */}
      {isOpen && (
        <div 
          className={`absolute ${align === 'right' ? 'right-0' : 'left-0'} mt-1.5 w-72 bg-white rounded-2xl border border-stone-200 shadow-xl z-50 p-2.5 space-y-1 animate-in fade-in zoom-in-95 duration-150`}
        >
          <div className="px-2.5 py-1 text-[10px] font-mono font-bold text-stone-400 uppercase tracking-wider border-b border-stone-100 mb-1">
            Selecione o Período
          </div>

          <div className="max-h-60 overflow-y-auto space-y-0.5">
            {options.map(opt => {
              const isSelected = value === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => {
                    if (opt.id !== 'customizado') {
                      onChange({ period: opt.id });
                      setIsOpen(false);
                    } else {
                      onChange({ period: 'customizado', startDate: tempStart, endDate: tempEnd });
                    }
                  }}
                  className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs font-medium transition-colors text-left cursor-pointer ${
                    isSelected 
                      ? 'bg-stone-100 text-stone-950 font-bold' 
                      : 'text-stone-600 hover:bg-stone-50 hover:text-stone-900'
                  }`}
                >
                  <span>{opt.label}</span>
                  {isSelected && <Check size={14} className="text-amber-600 shrink-0" />}
                </button>
              );
            })}
          </div>

          {/* Sub-painel de Datas Personalizadas */}
          {value === 'customizado' && (
            <div className="pt-2.5 mt-1.5 border-t border-stone-100 px-1 space-y-2.5">
              <div className="grid grid-cols-2 gap-2 text-left">
                <div>
                  <label className="block text-[10px] font-mono font-bold text-stone-400 uppercase mb-1">Início</label>
                  <input
                    type="date"
                    value={tempStart}
                    onChange={e => setTempStart(e.target.value)}
                    className="w-full h-8 px-2 bg-stone-50 border border-stone-200 rounded-lg text-xs font-mono text-stone-800 outline-none focus:border-[#083d07]"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-mono font-bold text-stone-400 uppercase mb-1">Fim</label>
                  <input
                    type="date"
                    value={tempEnd}
                    onChange={e => setTempEnd(e.target.value)}
                    className="w-full h-8 px-2 bg-stone-50 border border-stone-200 rounded-lg text-xs font-mono text-stone-800 outline-none focus:border-[#083d07]"
                  />
                </div>
              </div>

              {tempStart && tempEnd && tempEnd < tempStart && (
                <p className="text-[10px] text-rose-600 font-bold">
                  Data final não pode ser anterior à inicial.
                </p>
              )}

              <button
                type="button"
                disabled={!tempStart || !tempEnd || tempEnd < tempStart}
                onClick={() => {
                  onChange({ period: 'customizado', startDate: tempStart, endDate: tempEnd });
                  setIsOpen(false);
                }}
                className="w-full h-8 bg-[#083d07] hover:bg-[#0b520a] disabled:opacity-40 text-white text-xs font-bold font-mono rounded-lg transition-colors cursor-pointer shadow-xs"
              >
                Aplicar Intervalo
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default PeriodFilterCompact;
