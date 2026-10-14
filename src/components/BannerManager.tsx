import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Save, Megaphone, Image as ImageIcon, Sparkles, CheckCircle2, MessageCircle } from 'lucide-react';

export default function BannerManager() {
  const [feedback, setFeedback] = useState("");
  const [uploadingImage, setUploadingImage] = useState(false);
  const [promoConfig, setPromoConfig] = useState({
    active: false,
    image_url: '',
    title: '🎉 Bem-vindo(a) ao DOBRO Pizzas!',
    message: 'Agradecemos a sua visita e é com grande alegria que o(a) recebemos.\nSou a Jéssica e estou pronta para o(a) atender. 😊\nEnvie-nos uma mensagem pelo WhatsApp e teremos todo o gosto em ajudá-lo(a)!',
    button_text: 'Falar no WhatsApp'
  });

  useEffect(() => {
    async function loadSettings() {
      const { data } = await supabase.from('menu_items').select('*').eq('id', 'system_config_promo').single();
      if (data && data.ingredients) {
        try {
          const parsed = JSON.parse(data.ingredients);
          setPromoConfig(parsed);
        } catch (e) {
          console.error("Error parsing promo config", e);
        }
      }
    }
    loadSettings();
  }, []);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploadingImage(true);
      setFeedback("Fazendo upload da imagem...");
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
      const filePath = `dobropizza/promocoes/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('cardapio-dobropizza')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('cardapio-dobropizza')
        .getPublicUrl(filePath);

      setPromoConfig(prev => ({ ...prev, image_url: data.publicUrl }));
      setFeedback("Upload de imagem concluído com sucesso!");
    } catch (error: any) {
      console.error(error);
      setFeedback("Erro no upload da imagem: " + error.message);
    } finally {
      setUploadingImage(false);
      setTimeout(() => setFeedback(""), 4000);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback("Salvando promoção...");
    
    const dbItem = {
      id: 'system_config_promo',
      name: 'Configurações de Promoção',
      category: 'system_config',
      ingredients: JSON.stringify(promoConfig),
    };

    await supabase.from('categories').upsert({ id: 'system_config', name: 'Configurações do Sistema', order_index: 99 }, { onConflict: 'id' });
    const { error } = await supabase.from('menu_items').upsert(dbItem, { onConflict: 'id' });
    
    if (error) setFeedback("Erro: " + error.message);
    else setFeedback("Pop-up promocional salvo com sucesso!");
    setTimeout(() => setFeedback(""), 4000);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white rounded-xl border border-[#E7E5E1] shadow-[0_1px_2px_rgba(28,25,23,0.04),0_1px_8px_rgba(28,25,23,0.04)] p-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-[#FEF2F2] border border-[#FECDD3] text-[#083d07] flex items-center justify-center shrink-0">
              <Megaphone className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-[#1C1917]">Banner Promocional / Pop-up do Site</h2>
              <p className="text-sm text-[#78716C]">Crie avisos, ofertas especiais e mensagens que aparecem na tela do cliente ao abrir a loja.</p>
            </div>
          </div>
          
          <div className={`px-4 py-2 rounded-full text-xs font-bold flex items-center gap-2 border ${promoConfig.active ? 'bg-[#F0FDF4] text-[#15803D] border-[#BBF7D0]' : 'bg-[#FAFAF9] text-[#78716C] border-[#E7E5E1]'}`}>
            <span className={`w-2 h-2 rounded-full ${promoConfig.active ? 'bg-[#16A34A] animate-pulse' : 'bg-[#A8A29E]'}`} />
            {promoConfig.active ? 'POP-UP ATIVO NA LOJA' : 'POP-UP DESATIVADO'}
          </div>
        </div>
      </div>

      {feedback && (
        <div className="p-4 bg-[#EFF6FF] border border-[#BFDBFE] text-[#1D4ED8] rounded-xl text-sm font-semibold flex items-center gap-2">
          <Sparkles className="w-4 h-4 shrink-0" />
          {feedback}
        </div>
      )}

      {/* Main Grid: Form + Live Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Form Column */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white rounded-xl border border-[#E7E5E1] shadow-[0_1px_2px_rgba(28,25,23,0.04),0_1px_8px_rgba(28,25,23,0.04)] p-6">
            <form onSubmit={handleSave} className="space-y-5">
              {/* Active Toggle */}
              <div className={`p-4 rounded-xl border transition-all ${promoConfig.active ? 'bg-[#F0FDF4] border-[#BBF7D0]' : 'bg-[#FAFAF9] border-[#E7E5E1]'}`}>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input 
                    type="checkbox" 
                    id="promo-active"
                    checked={promoConfig.active}
                    onChange={e => setPromoConfig({...promoConfig, active: e.target.checked})}
                    className="w-5 h-5 accent-[#083d07] rounded border-[#E7E5E1] cursor-pointer"
                  />
                  <div>
                    <span className="font-bold text-sm text-[#1C1917] block">Exibir este Pop-up na entrada do site</span>
                    <span className="text-xs text-[#78716C]">Quando marcado, todo cliente que abrir o cardápio verá este aviso.</span>
                  </div>
                </label>
              </div>

              {/* Title Input */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wide text-[#A8A29E]">Título da Promoção ou Aviso</label>
                <input 
                  type="text" 
                  value={promoConfig.title} 
                  onChange={e => setPromoConfig({...promoConfig, title: e.target.value})}
                  placeholder="Ex: Promoção de Terça-feira!"
                  className="w-full p-2.5 bg-[#FAFAF9] border border-[#E7E5E1] rounded-lg text-sm text-[#1C1917] font-semibold focus:outline-none focus:border-[#083d07] focus:ring-1 focus:ring-[#083d07]/20"
                />
              </div>

              {/* Message Textarea */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wide text-[#A8A29E]">Mensagem Detalhada</label>
                <textarea 
                  rows={4}
                  value={promoConfig.message} 
                  onChange={e => setPromoConfig({...promoConfig, message: e.target.value})}
                  placeholder="Escreva os detalhes da promoção ou mensagem..."
                  className="w-full p-2.5 bg-[#FAFAF9] border border-[#E7E5E1] rounded-lg text-sm text-[#1C1917] focus:outline-none focus:border-[#083d07] focus:ring-1 focus:ring-[#083d07]/20"
                />
              </div>

              {/* Image Section */}
              <div className="space-y-2 pt-1 border-t border-[#F0EFED]">
                <label className="text-xs font-semibold uppercase tracking-wide text-[#A8A29E]">Imagem Promocional (Opcional)</label>
                
                <input 
                  type="text" 
                  value={promoConfig.image_url} 
                  onChange={e => setPromoConfig({...promoConfig, image_url: e.target.value})}
                  className="w-full p-2.5 bg-[#FAFAF9] border border-[#E7E5E1] rounded-lg text-sm text-[#1C1917] font-mono focus:outline-none focus:border-[#083d07] focus:ring-1 focus:ring-[#083d07]/20"
                  placeholder="URL da imagem (http://...)"
                />

                <div className="pt-2">
                  <label className="block text-xs font-medium text-[#78716C] mb-1">Ou envie do seu dispositivo:</label>
                  <input 
                    type="file" 
                    accept="image/jpeg, image/png, image/webp" 
                    onChange={handleImageUpload}
                    disabled={uploadingImage}
                    className="block w-full text-sm text-[#78716C]
                      file:mr-4 file:py-2 file:px-4
                      file:rounded-lg file:border-0
                      file:text-sm file:font-semibold
                      file:bg-[#083d07]/10 file:text-[#083d07]
                      hover:file:bg-[#083d07]/20
                      cursor-pointer border border-[#E7E5E1] rounded-lg p-1 bg-white"
                  />
                  {uploadingImage && <p className="text-xs text-[#78716C] mt-1 font-medium">Enviando imagem...</p>}
                </div>
              </div>

              {/* Button Text */}
              <div className="space-y-1.5 pt-1 border-t border-[#F0EFED]">
                <label className="text-xs font-semibold uppercase tracking-wide text-[#A8A29E]">Texto do Botão de Ação (WhatsApp)</label>
                <input 
                  type="text" 
                  value={promoConfig.button_text} 
                  onChange={e => setPromoConfig({...promoConfig, button_text: e.target.value})}
                  placeholder="Ex: Falar no WhatsApp (deixe vazio para ocultar)"
                  className="w-full p-2.5 bg-[#FAFAF9] border border-[#E7E5E1] rounded-lg text-sm text-[#1C1917] focus:outline-none focus:border-[#083d07] focus:ring-1 focus:ring-[#083d07]/20"
                />
              </div>

              {/* Submit Button */}
              <div className="pt-3">
                <button 
                  type="submit" 
                  className="w-full py-3 bg-[#083d07] hover:bg-[#0b520a] text-[#fdfbf7] rounded-lg font-bold text-sm transition-colors flex items-center justify-center gap-2 shadow-sm border border-[#d5af7a]/60 cursor-pointer"
                >
                  <Save size={18} /> Salvar Promoção
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Live Preview Column */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white rounded-xl border border-[#E7E5E1] shadow-[0_1px_2px_rgba(28,25,23,0.04),0_1px_8px_rgba(28,25,23,0.04)] p-6">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-[#A8A29E] mb-3 flex items-center gap-1.5">
              <Sparkles size={14} className="text-[#b88a44]" /> Pré-visualização do Pop-up na Loja
            </h3>

            {/* Mobile / Screen Mockup Frame */}
            <div className="bg-[#1C1917] p-4 rounded-2xl shadow-inner border border-gray-800 relative">
              <div className="bg-[#FAFAF9] rounded-xl overflow-hidden shadow-2xl border border-gray-200">
                {promoConfig.image_url ? (
                  <div className="w-full h-44 bg-gray-100 overflow-hidden relative">
                    <img 
                      src={promoConfig.image_url.startsWith('http') ? promoConfig.image_url : (promoConfig.image_url.startsWith('/') ? promoConfig.image_url : '/' + promoConfig.image_url)} 
                      alt="Banner Preview" 
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="w-full h-24 bg-[#FAFAF9] border-b border-[#E7E5E1] flex flex-col items-center justify-center text-[#A8A29E]">
                    <ImageIcon size={28} />
                    <span className="text-[11px] mt-1 font-medium">Sem imagem configurada</span>
                  </div>
                )}

                <div className="p-4 space-y-3">
                  <h4 className="font-extrabold text-base text-[#1C1917] leading-snug">
                    {promoConfig.title || 'Título do Pop-up'}
                  </h4>

                  <p className="text-xs text-[#78716C] whitespace-pre-line leading-relaxed">
                    {promoConfig.message || 'Sua mensagem aparecerá aqui...'}
                  </p>

                  {promoConfig.button_text && (
                    <button type="button" className="w-full py-2.5 bg-[#25D366] hover:bg-[#1EBE5D] text-white font-bold rounded-lg text-xs flex items-center justify-center gap-2 shadow-sm">
                      <MessageCircle size={15} />
                      {promoConfig.button_text}
                    </button>
                  )}
                </div>
              </div>

              <div className="mt-3 text-center">
                <span className="text-[10px] text-[#D4AF6A] font-extrabold uppercase tracking-wider">
                  {promoConfig.active ? '● Visível para os clientes' : '○ Oculto no site'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
