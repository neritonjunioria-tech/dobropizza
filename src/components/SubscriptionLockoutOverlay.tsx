import React, { useState } from 'react';
import { 
  AlertOctagon, 
  Copy, 
  Check, 
  QrCode, 
  Smartphone,
  RefreshCw, 
  MessageCircle, 
  CreditCard,
  ArrowUpRight
} from 'lucide-react';
import { SubscriptionData, SubscriptionStatusInfo } from '../hooks/useSubscription';

interface SubscriptionLockoutOverlayProps {
  subscription: SubscriptionData;
  statusInfo: SubscriptionStatusInfo;
  onRefresh: () => Promise<void>;
  onSimulateState?: (state: 'active' | 'warning' | 'blocked') => void;
}

export const SubscriptionLockoutOverlay: React.FC<SubscriptionLockoutOverlayProps> = ({
  subscription,
  statusInfo,
  onRefresh,
  onSimulateState
}) => {
  const [copiedKey, setCopiedKey] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [checking, setChecking] = useState(false);

  const PIX_PHONE_FORMATTED = "(41) 99656-0080";
  const PIX_PHONE_RAW = "41996560080";
  const PIX_BRCODE = "00020126360014BR.GOV.BCB.PIX0114+55419965600805204000053039865406490.005802BR5914SISTEMA GESTOR6008CURITIBA62150511MENSALIDADE6304F9A7";

  const handleCopyKey = () => {
    navigator.clipboard.writeText(PIX_PHONE_RAW);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2500);
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(PIX_BRCODE);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2500);
  };

  const handleCheckPayment = async () => {
    setChecking(true);
    try {
      await onRefresh();
    } finally {
      setTimeout(() => setChecking(false), 800);
    }
  };

  const formattedAmount = Number(subscription.monthly_amount || 490).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  });

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-[#062b06]/85 backdrop-blur-md overflow-y-auto animate-fadeIn">
      <div className="relative w-full max-w-lg bg-[#083d07] border border-[#0b520a] rounded-2xl shadow-2xl overflow-hidden my-6">
        
        {/* Header Sóbrio */}
        <div className="p-6 border-b border-[#0b520a] text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-red-500/10 text-red-400 mb-3 border border-red-500/20">
            <AlertOctagon size={22} />
          </div>
          <h2 className="text-xl font-bold text-stone-100">
            Acesso Temporariamente Suspenso
          </h2>
          <p className="text-stone-400 text-xs mt-1 max-w-sm mx-auto">
            O período de tolerância encerrou. Realize a quitação da mensalidade para restaurar o acesso imediato ao painel.
          </p>
        </div>

        {/* Resumo Fatura */}
        <div className="p-6 space-y-5">
          
          <div className="bg-[#062b06]/70 border border-[#0b520a] rounded-xl p-3.5 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-mono uppercase tracking-wider text-stone-400 block">
                Fatura Vencida (Dia 16)
              </span>
              <span className="text-xl font-bold font-mono text-stone-100">
                {formattedAmount}
              </span>
            </div>
            <span className="text-xs px-2.5 py-1 rounded-full bg-red-500/10 text-red-400 border border-red-500/20 font-medium">
              Atraso superior a 5 dias
            </span>
          </div>

          {/* Opção PIX Direto */}
          <div className="bg-[#062b06]/50 border border-[#0b520a]/90 rounded-xl p-4 space-y-4">
            
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-stone-200 flex items-center gap-1.5">
                <QrCode size={14} className="text-[#d5af7a]" /> Pagamento Instantâneo via PIX
              </span>
              <span className="text-[10px] text-emerald-400 font-mono">Liberação Automática</span>
            </div>

            {/* QR Code */}
            <div className="flex justify-center">
              <div className="p-2 bg-white rounded-lg shadow-sm">
                <img 
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(PIX_BRCODE)}`}
                  alt="QR Code PIX R$ 490,00"
                  className="w-32 h-32 object-contain"
                />
              </div>
            </div>

            {/* Chave Telefone */}
            <div className="flex items-center justify-between gap-2 bg-[#083d07] px-3 py-2 rounded-lg border border-[#0b520a] text-xs">
              <div className="flex items-center gap-2">
                <Smartphone size={13} className="text-stone-400" />
                <span className="font-mono text-stone-200 font-bold">{PIX_PHONE_FORMATTED}</span>
              </div>
              <button
                type="button"
                onClick={handleCopyKey}
                className="px-2.5 py-1 bg-[#0b520a] hover:bg-stone-700 text-stone-300 rounded text-[11px] font-medium transition-colors cursor-pointer border border-stone-700"
              >
                {copiedKey ? 'Copiado!' : 'Copiar Chave'}
              </button>
            </div>

            {/* PIX Copia e Cola Input */}
            <div className="flex items-center gap-2">
              <input 
                type="text"
                readOnly
                value={PIX_BRCODE}
                className="flex-1 bg-[#083d07] border border-[#0b520a] rounded-lg px-2.5 py-1.5 text-xs text-stone-400 font-mono select-all truncate focus:outline-none"
              />
              <button
                type="button"
                onClick={handleCopyCode}
                className="px-3 py-1.5 bg-[#083d07] hover:bg-[#e6c94f] text-[#fdfbf7] font-bold text-xs rounded-lg transition-colors cursor-pointer shrink-0"
              >
                {copiedCode ? 'Copiado!' : 'Copiar PIX'}
              </button>
            </div>

          </div>

          {/* Ações */}
          <div className="space-y-2.5 pt-1">
            <button
              type="button"
              onClick={handleCheckPayment}
              disabled={checking}
              className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-sm transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <RefreshCw size={14} className={checking ? 'animate-spin' : ''} />
              <span>{checking ? 'Verificando pagamento...' : 'Já realizei o pagamento, verificar liberação'}</span>
            </button>

            <div className="grid grid-cols-2 gap-2">
              <a
                href={subscription.stripe_payment_link || 'https://buy.stripe.com/test_gestor_delivery_490'}
                target="_blank"
                rel="noopener noreferrer"
                className="py-2 px-3 rounded-lg bg-[#0b520a] hover:bg-stone-750 text-stone-300 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors border border-stone-700"
              >
                <CreditCard size={13} />
                <span>Pagar com Cartão</span>
                <ArrowUpRight size={12} className="opacity-60" />
              </a>

              <a
                href="https://wa.me/5541996560080?text=Ol%C3%A1%2C+preciso+de+suporte+com+a+fatura+da+minha+assinatura+do+gestor"
                target="_blank"
                rel="noopener noreferrer"
                className="py-2 px-3 rounded-lg bg-[#0b520a] hover:bg-stone-750 text-stone-300 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors border border-stone-700"
              >
                <MessageCircle size={13} className="text-emerald-400" />
                <span>Suporte WhatsApp</span>
              </a>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};
