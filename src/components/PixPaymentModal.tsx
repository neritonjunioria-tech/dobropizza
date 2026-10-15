import React, { useState, useEffect } from 'react';
import { Copy, Check, QrCode, ExternalLink, ArrowRight, ShieldCheck, AlertCircle, Clock, X } from 'lucide-react';
import { generatePixPayload, generatePixQrCodeDataUrl, generatePixQrCodeSvg } from '../utils/pix';
import { PIX_CONFIG } from '../config/pixConfig';

interface PixPaymentModalProps {
  orderId: number | null;
  total: number;
  trackingCode: string | null;
  whatsappUrl: string;
  onClose: () => void;
}

export default function PixPaymentModal({
  orderId,
  total,
  trackingCode,
  whatsappUrl,
  onClose
}: PixPaymentModalProps) {
  const [copied, setCopied] = useState(false);
  const [qrCodeSvg, setQrCodeSvg] = useState<string>('');
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [pixPayload, setPixPayload] = useState<string>('');
  const [loading, setLoading] = useState(true);

  const effectiveAmount = Number(total || 0);
  const formattedAmount = effectiveAmount.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  });

  useEffect(() => {
    try {
      const payload = generatePixPayload({
        amount: effectiveAmount,
        txid: orderId ? `DOBRO${orderId}` : 'DOBRO'
      });
      setPixPayload(payload);

      // 1. Gera SVG vetorial puro (impossível de falhar em qualquer navegador)
      generatePixQrCodeSvg(payload)
        .then((svg) => {
          if (svg) setQrCodeSvg(svg);
          setLoading(false);
        })
        .catch((err) => {
          console.warn('[PixPaymentModal] Fallback para DataUrl:', err);
          return generatePixQrCodeDataUrl(payload);
        })
        .then((url) => {
          if (url && typeof url === 'string') setQrCodeUrl(url);
          setLoading(false);
        })
        .catch((err) => {
          console.error('[PixPaymentModal] Erro gerando QR Code:', err);
          setLoading(false);
        });
    } catch (err) {
      console.error('[PixPaymentModal] Erro ao montar payload PIX:', err);
      setLoading(false);
    }
  }, [effectiveAmount, orderId]);

  const handleCopyCode = async () => {
    if (!pixPayload) return;
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(pixPayload);
      } else {
        // Fallback para navegadores legados ou contextos sem HTTPS
        const textarea = document.createElement('textarea');
        textarea.value = pixPayload;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch (err) {
      console.error('[PixPaymentModal] Falha ao copiar código:', err);
    }
  };

  return (
    <div className="w-full flex flex-col items-center text-center font-sans relative">
      {/* Botão fechar no topo */}
      <button
        type="button"
        onClick={onClose}
        className="absolute top-0 right-0 p-1.5 text-stone-400 hover:text-stone-700 rounded-full hover:bg-stone-100 transition-colors cursor-pointer"
        title="Fechar"
      >
        <X size={18} />
      </button>

      {/* Header com Valor e Título */}
      <div className="w-full pb-4 border-b border-stone-100 flex flex-col items-center pr-6">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-[#083d07] border border-emerald-200 text-xs font-bold mb-2">
          <QrCode size={13} className="text-[#083d07]" />
          <span>Pedido {orderId ? `#${orderId}` : ''} Registrado</span>
        </div>
        
        <h2 className="text-xl font-black text-stone-900 tracking-tight">
          Pague com PIX
        </h2>

        <div className="mt-2 flex items-baseline justify-center gap-1.5">
          <span className="text-xs font-medium text-stone-500 uppercase tracking-wider">Total a pagar:</span>
          <span className="text-2xl font-black font-mono text-[#083d07]">
            {formattedAmount}
          </span>
        </div>
      </div>

      {/* Área do QR Code */}
      <div className="my-4 flex flex-col items-center">
        <div className="p-3 bg-white rounded-2xl border-2 border-stone-200 shadow-sm relative flex items-center justify-center min-w-[210px] min-h-[210px]">
          {loading ? (
            <div className="w-48 h-48 flex flex-col items-center justify-center bg-stone-50 rounded-xl text-stone-500 text-xs font-medium gap-2">
              <div className="w-6 h-6 border-2 border-[#083d07] border-t-transparent rounded-full animate-spin" />
              <span>Gerando QR Code...</span>
            </div>
          ) : qrCodeSvg ? (
            <div
              className="w-48 h-48 sm:w-52 sm:h-52 flex items-center justify-center [&>svg]:w-full [&>svg]:h-full [&>svg]:rounded-lg"
              dangerouslySetInnerHTML={{ __html: qrCodeSvg }}
            />
          ) : qrCodeUrl ? (
            <img
              src={qrCodeUrl}
              alt="QR Code Pix do Pedido"
              className="w-48 h-48 sm:w-52 sm:h-52 object-contain rounded-lg"
            />
          ) : (
            <div className="w-48 h-48 flex items-center justify-center bg-stone-50 rounded-xl text-stone-400 text-xs">
              Erro ao exibir QR Code
            </div>
          )}
        </div>
        <p className="text-[11px] text-stone-500 mt-2">
          Aponte a câmera do aplicativo do seu banco para escanear
        </p>
      </div>

      {/* Bloco Copia e Cola */}
      <div className="w-full max-w-sm space-y-2">
        <label className="block text-left text-xs font-bold text-stone-700">
          Código Pix Copia e Cola:
        </label>
        
        <div className="flex items-center gap-2">
          <input
            type="text"
            readOnly
            value={pixPayload}
            onClick={(e) => (e.target as HTMLInputElement).select()}
            className="flex-1 bg-stone-50 border border-stone-200 rounded-xl px-3 py-2.5 text-xs text-stone-600 font-mono select-all truncate focus:outline-none focus:border-[#083d07]"
            title="Clique para selecionar todo o código"
          />
          <button
            type="button"
            onClick={handleCopyCode}
            className={`px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shrink-0 shadow-xs ${
              copied
                ? 'bg-emerald-600 text-white border border-emerald-600'
                : 'bg-[#083d07] hover:bg-[#0b520a] text-white border border-[#d5af7a]/60'
            }`}
          >
            {copied ? (
              <>
                <Check size={14} className="stroke-[3]" />
                <span>Copiado!</span>
              </>
            ) : (
              <>
                <Copy size={14} />
                <span>Copiar código PIX</span>
              </>
            )}
          </button>
        </div>

        {copied && (
          <div className="p-2 bg-emerald-50 border border-emerald-200 rounded-lg text-[11px] font-semibold text-emerald-800 flex items-center justify-center gap-1.5 animate-fadeIn">
            <Check size={13} className="text-emerald-700" />
            <span>Código PIX copiado para a área de transferência!</span>
          </div>
        )}
      </div>

      {/* Instruções de Pagamento e Alerta de Conferência Manual */}
      <div className="w-full max-w-sm mt-4 p-3.5 bg-stone-50 rounded-xl border border-stone-200 text-left space-y-2 text-xs text-stone-600">
        <div className="flex items-center gap-1.5 font-bold text-stone-800 text-[11px] uppercase tracking-wider">
          <ShieldCheck size={14} className="text-[#083d07]" />
          <span>Como pagar pelo banco:</span>
        </div>
        <ol className="list-decimal list-inside space-y-1 text-[11px] leading-relaxed text-stone-600 pl-0.5">
          <li>Abra o aplicativo do seu banco e escolha a opção <strong>PIX</strong>.</li>
          <li>Escolha <strong>Pix Copia e Cola</strong> ou aponte a câmera para o QR Code acima.</li>
          <li>Confira se o valor é <strong>{formattedAmount}</strong> e o recebedor é <strong>{PIX_CONFIG.nomeRecebedor}</strong>.</li>
          <li>Após concluir a transferência, toque no botão verde abaixo para enviar o pedido no WhatsApp da pizzaria!</li>
        </ol>

        <div className="pt-2 border-t border-stone-200/80 flex items-start gap-2 text-[11px] text-amber-900 bg-amber-50/80 p-2 rounded-lg">
          <Clock size={13} className="text-amber-700 shrink-0 mt-0.5" />
          <span>
            <strong>Atenção:</strong> O pagamento é conferido manualmente pelo atendente antes de iniciar a produção do pedido.
          </span>
        </div>
      </div>

      {/* Ações Finais: Enviar Pedido no WhatsApp & Acompanhar */}
      <div className="w-full max-w-sm flex flex-col gap-2.5 mt-5">
        <a
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full bg-[#25D366] hover:bg-[#1EBE5D] text-white font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 text-sm shadow-md transition-all cursor-pointer active:scale-[0.98]"
        >
          <span>Enviar pedido e comprovante no WhatsApp</span>
          <ArrowRight size={15} />
        </a>

        {trackingCode && (
          <a
            href={`/track/${trackingCode}`}
            className="w-full bg-white border border-[#083d07] text-[#083d07] hover:bg-[#083d07] hover:text-white font-bold py-2.5 px-4 rounded-xl flex items-center justify-center gap-1.5 text-xs shadow-xs transition-all cursor-pointer"
          >
            <span>Acompanhar status do pedido</span>
            <ExternalLink size={13} />
          </a>
        )}

        <button
          type="button"
          onClick={onClose}
          className="text-xs text-stone-500 hover:text-stone-800 font-medium py-1.5 cursor-pointer transition-colors"
        >
          Voltar ao Cardápio
        </button>
      </div>
    </div>
  );
}
