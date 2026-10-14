import React, { useState } from 'react';
import { 
  Copy, 
  Check, 
  RefreshCw, 
  ArrowUpRight,
  CreditCard,
  QrCode
} from 'lucide-react';
import { useSubscription } from '../hooks/useSubscription';

export const BillingManager: React.FC = () => {
  const { 
    subscription, 
    statusInfo, 
    loading, 
    refreshSubscription, 
    confirmPayment, 
    simulateState 
  } = useSubscription();

  const [paymentMethod, setPaymentMethod] = useState<'pix' | 'card'>('pix');
  const [copiedKey, setCopiedKey] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isConfirmingManual, setIsConfirmingManual] = useState(false);

  const PIX_PHONE_DISPLAY = "(41) 99656-0080";
  const PIX_PHONE_RAW = "41996560080";
  const PIX_BRCODE = "00020126360014BR.GOV.BCB.PIX0114+55419965600805204000053039865406490.005802BR5914SISTEMA GESTOR6008CURITIBA62150511MENSALIDADE6304F9A7";

  const handleCopyKey = () => {
    navigator.clipboard.writeText(PIX_PHONE_RAW);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(PIX_BRCODE);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refreshSubscription();
    } finally {
      setTimeout(() => setIsRefreshing(false), 600);
    }
  };

  const handleManualConfirm = async () => {
    if (!confirm('Confirmar pagamento manual de R$ 490,00 e estender acesso até o dia 16 do próximo mês?')) return;
    setIsConfirmingManual(true);
    try {
      await confirmPayment();
    } finally {
      setIsConfirmingManual(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      
      {/* Bloco de Fatura Atual */}
      <div className="bg-[#083d07] border border-[#0b520a] rounded-xl p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-[11px] font-mono text-stone-400 uppercase tracking-wider block mb-1">
            Fatura Atual • Vencimento todo dia 16
          </span>
          <div className="flex items-baseline gap-3">
            <span className="text-3xl font-extrabold font-mono text-stone-100 tracking-tight">
              R$ 490,00
            </span>
            <span className="text-xs text-stone-400">/mês</span>
            
            {statusInfo.isBlocked ? (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-500/10 text-red-400 border border-red-500/20">
                Bloqueado
              </span>
            ) : statusInfo.isGracePeriod ? (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                Carência ({statusInfo.daysPastDue}d)
              </span>
            ) : (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                Em dia
              </span>
            )}
          </div>
          <p className="text-xs text-stone-400 mt-2">
            Mês de Setembro/2026: <strong className="text-emerald-400 font-semibold">Pago ✓</strong> • Próximo vencimento: <strong className="text-stone-200">16 de Outubro de 2026</strong>.
          </p>
        </div>

        <button
          onClick={handleRefresh}
          disabled={isRefreshing || loading}
          className="self-start sm:self-auto flex items-center gap-2 px-3.5 py-2 rounded-lg bg-[#0b520a] hover:bg-stone-700 text-stone-200 text-xs font-medium border border-stone-700 transition-colors cursor-pointer disabled:opacity-50"
        >
          <RefreshCw size={13} className={isRefreshing ? 'animate-spin text-[#d5af7a]' : ''} />
          <span>{isRefreshing ? 'Consultando...' : 'Verificar Status'}</span>
        </button>
      </div>

      {/* Caixa de Pagamento */}
      <div className="bg-[#083d07] border border-[#0b520a] rounded-xl overflow-hidden">
        
        {/* Seletor Segmentado PIX / Cartão */}
        <div className="flex border-b border-[#0b520a] bg-[#062b06]/60 p-1.5 gap-1.5">
          <button
            onClick={() => setPaymentMethod('pix')}
            className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer ${
              paymentMethod === 'pix'
                ? 'bg-[#0b520a] text-stone-100 shadow-xs'
                : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            <QrCode size={14} className={paymentMethod === 'pix' ? 'text-[#d5af7a]' : ''} />
            <span>PIX Direto</span>
          </button>

          <button
            onClick={() => setPaymentMethod('card')}
            className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer ${
              paymentMethod === 'card'
                ? 'bg-[#0b520a] text-stone-100 shadow-xs'
                : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            <CreditCard size={14} className={paymentMethod === 'card' ? 'text-[#d5af7a]' : ''} />
            <span>Cartão de Crédito (Stripe)</span>
          </button>
        </div>

        {/* Conteúdo PIX */}
        {paymentMethod === 'pix' && (
          <div className="p-6">
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
              
              {/* QR Code */}
              <div className="shrink-0 flex flex-col items-center">
                <div className="p-2.5 bg-white rounded-xl shadow-xs inline-block">
                  <img 
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(PIX_BRCODE)}`}
                    alt="QR Code PIX R$ 490,00"
                    className="w-32 h-32 object-contain"
                  />
                </div>
                <span className="text-[11px] font-mono text-stone-400 mt-2">
                  Valor: R$ 490,00
                </span>
              </div>

              {/* Chaves e Códigos */}
              <div className="flex-1 w-full space-y-4">
                
                <div>
                  <label className="text-[11px] font-mono text-stone-400 block mb-1">
                    Chave PIX (Telefone)
                  </label>
                  <div className="flex items-center gap-2">
                    <input 
                      type="text" 
                      readOnly 
                      value={PIX_PHONE_DISPLAY}
                      className="flex-1 bg-[#062b06] border border-[#0b520a] rounded-lg px-3 py-2 text-xs text-stone-200 font-mono select-all focus:outline-none"
                    />
                    <button
                      onClick={handleCopyKey}
                      className="flex items-center gap-1.5 px-3 py-2 bg-[#0b520a] hover:bg-stone-700 text-stone-200 text-xs font-medium rounded-lg transition-colors cursor-pointer shrink-0"
                    >
                      {copiedKey ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                      <span>{copiedKey ? 'Copiado' : 'Copiar'}</span>
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-mono text-stone-400 block mb-1">
                    PIX Copia e Cola (Payload Oficial)
                  </label>
                  <div className="flex items-center gap-2">
                    <input 
                      type="text"
                      readOnly
                      value={PIX_BRCODE}
                      className="flex-1 bg-[#062b06] border border-[#0b520a] rounded-lg px-3 py-2 text-xs text-stone-400 font-mono select-all truncate focus:outline-none"
                    />
                    <button
                      onClick={handleCopyCode}
                      className="flex items-center gap-1.5 px-4 py-2 bg-[#083d07] hover:bg-[#e6c94f] text-[#fdfbf7] text-xs font-bold rounded-lg transition-colors cursor-pointer shrink-0"
                    >
                      {copiedCode ? <Check size={13} /> : <Copy size={13} />}
                      <span>{copiedCode ? 'Copiado' : 'Copiar PIX'}</span>
                    </button>
                  </div>
                </div>

              </div>

            </div>
          </div>
        )}

        {/* Conteúdo Cartão (Stripe) */}
        {paymentMethod === 'card' && (
          <div className="p-6 sm:p-8 text-center max-w-md mx-auto space-y-4">
            <p className="text-xs text-stone-300">
              Pagamento com cartão de crédito processado pelo checkout seguro da Stripe.
            </p>

            <a
              href={subscription.stripe_payment_link || 'https://buy.stripe.com/test_gestor_delivery_490'}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-lg bg-stone-100 hover:bg-white text-stone-900 font-bold text-xs transition-colors cursor-pointer"
            >
              <span>Pagar fatura com Cartão de Crédito</span>
              <ArrowUpRight size={14} />
            </a>
          </div>
        )}

      </div>

      {/* Histórico Simples */}
      <div className="bg-[#083d07] border border-[#0b520a] rounded-xl p-5 space-y-3">
        <h3 className="text-xs font-mono text-stone-400 uppercase tracking-wider">
          Histórico de Pagamentos
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-[#0b520a] text-[11px] font-mono text-stone-400 uppercase">
                <th className="py-2.5 px-3">Competência</th>
                <th className="py-2.5 px-3">Valor</th>
                <th className="py-2.5 px-3">Forma</th>
                <th className="py-2.5 px-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-800/60 text-stone-300">
              <tr>
                <td className="py-2.5 px-3 font-medium text-stone-200">Outubro / 2026</td>
                <td className="py-2.5 px-3 font-mono">R$ 490,00</td>
                <td className="py-2.5 px-3 text-stone-400">PIX Direto</td>
                <td className="py-2.5 px-3">
                  <span className="text-stone-300 font-medium bg-[#0b520a] px-2 py-0.5 rounded text-[11px]">
                    A vencer (16/10)
                  </span>
                </td>
              </tr>
              <tr className="text-stone-300">
                <td className="py-2.5 px-3 font-medium text-stone-200">Setembro / 2026</td>
                <td className="py-2.5 px-3 font-mono">R$ 490,00</td>
                <td className="py-2.5 px-3 text-stone-400">PIX Direto</td>
                <td className="py-2.5 px-3">
                  <span className="text-emerald-400 font-medium flex items-center gap-1">
                    <Check size={12} /> Pago
                  </span>
                </td>
              </tr>
              <tr className="text-stone-400">
                <td className="py-2.5 px-3">Agosto / 2026</td>
                <td className="py-2.5 px-3 font-mono">R$ 490,00</td>
                <td className="py-2.5 px-3">PIX Direto</td>
                <td className="py-2.5 px-3 text-emerald-400 font-medium">Pago</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
