import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import {
  Save, Printer, Bell, BellOff, Volume2,
  Clock, Truck, Building2, Key, FileSpreadsheet,
  Sparkles, Check, CheckCircle2,
  Sliders, AlertCircle, Trash2, Upload,
  Shield, CheckCheck, RefreshCw,
  CreditCard, QrCode, Banknote, Instagram, Zap
} from 'lucide-react';

interface SettingsManagerProps {
  onTestPrint?: (order: any) => void;
  autoPrint?: boolean;
  onToggleAutoPrint?: () => void;
  onExportCSV?: () => void;
  onChangePassword?: () => void;
  soundEnabled?: boolean;
  onToggleSound?: () => void;
  onTestSound?: () => void;
}

type SettingsTab = 'empresa' | 'pagamentos' | 'horarios' | 'impressao' | 'entregas' | 'notificacoes' | 'seguranca';

export interface PaymentMethodsConfig {
  pix: boolean;
  dinheiro: boolean;
  credito: boolean;
  debito: boolean;
}

export default function SettingsManager({
  onTestPrint,
  autoPrint,
  onToggleAutoPrint,
  onExportCSV,
  onChangePassword,
  soundEnabled = true,
  onToggleSound,
  onTestSound
}: SettingsManagerProps) {
  const [activeTab, setActiveTab] = useState<SettingsTab>('empresa');
  const [feedback, setFeedback] = useState<{ message: string; type: 'success' | 'error' | 'warning' } | null>(null);

  const showSavedFeedback = (msg = "Alterações salvas com sucesso!") => {
    setFeedback({ message: msg, type: 'success' });
    setTimeout(() => setFeedback(null), 3500);
  };

  const showFeedback = (message: string, type: 'success' | 'error' | 'warning' = 'success') => {
    setFeedback({ message, type });
    setTimeout(() => setFeedback(null), 3500);
  };

  // ────────────────── ESTADO: EMPRESA & IDENTIDADE ──────────────────
  const [companyInfo, setCompanyInfo] = useState({ name: "DOBRO Pizzas", nif: '', address: '' });
  const [instagramUrl, setInstagramUrl] = useState('https://www.instagram.com/dobropizzas/');
  const [savingCompany, setSavingCompany] = useState(false);

  useEffect(() => {
    async function loadCompany() {
      const { data } = await supabase.from('settings').select('key, value').in('key', ['company_name', 'company_nif', 'company_address', 'instagram_url']);
      const info = { name: "DOBRO Pizzas", nif: '', address: '' };
      data?.forEach((row: any) => {
        if (row.key === 'company_name') info.name = row.value;
        if (row.key === 'company_nif') info.nif = row.value;
        if (row.key === 'company_address') info.address = row.value;
        if (row.key === 'instagram_url' && row.value) setInstagramUrl(row.value);
      });
      setCompanyInfo(info);
    }
    loadCompany();
  }, []);

  const handleSaveCompany = async () => {
    setSavingCompany(true);
    await supabase.from('settings').upsert([
      { key: 'company_name', value: companyInfo.name, updated_at: new Date().toISOString() },
      { key: 'company_nif', value: companyInfo.nif, updated_at: new Date().toISOString() },
      { key: 'company_address', value: companyInfo.address, updated_at: new Date().toISOString() },
      { key: 'instagram_url', value: instagramUrl.trim(), updated_at: new Date().toISOString() },
    ]);
    setSavingCompany(false);
    showSavedFeedback("Dados da empresa e Instagram atualizados!");
  };

  // ────────────────── ESTADO: FORMAS DE PAGAMENTO ATIVAS POR DIA ──────────────────
  const [paymentConfig, setPaymentConfig] = useState<PaymentMethodsConfig>({
    pix: true,
    dinheiro: false,
    credito: false,
    debito: false
  });
  const [savingPayments, setSavingPayments] = useState(false);

  useEffect(() => {
    async function loadPaymentConfig() {
      try {
        const { data } = await supabase
          .from('settings')
          .select('value')
          .eq('key', 'payment_methods_config')
          .maybeSingle();
        if (data?.value) {
          const parsed = JSON.parse(data.value);
          setPaymentConfig({
            pix: parsed.pix !== false,
            dinheiro: Boolean(parsed.dinheiro),
            credito: Boolean(parsed.credito),
            debito: Boolean(parsed.debito)
          });
        }
      } catch (e) {
        console.warn('Erro ao carregar formas de pagamento salvas:', e);
      }
    }
    loadPaymentConfig();
  }, []);

  const handleSavePayments = async (override?: PaymentMethodsConfig) => {
    const cfg = override || paymentConfig;
    if (!cfg.pix && !cfg.dinheiro && !cfg.credito && !cfg.debito) {
      showFeedback("Pelo menos uma forma de pagamento deve permanecer ativada!", "warning");
      return;
    }
    setSavingPayments(true);
    try {
      const { error } = await supabase.from('settings').upsert({
        key: 'payment_methods_config',
        value: JSON.stringify(cfg),
        updated_at: new Date().toISOString()
      });
      if (error) throw error;
      showSavedFeedback("Formas de pagamento atualizadas para o dia!");
    } catch (err: any) {
      showFeedback("Erro ao salvar formas de pagamento: " + (err?.message || err), "error");
    } finally {
      setSavingPayments(false);
    }
  };

  const handleTogglePaymentMethod = (key: keyof PaymentMethodsConfig) => {
    setPaymentConfig(prev => {
      const next = { ...prev, [key]: !prev[key] };
      return next;
    });
  };

  const handleQuickActivateOnlyPix = async () => {
    const onlyPix: PaymentMethodsConfig = { pix: true, dinheiro: false, credito: false, debito: false };
    setPaymentConfig(onlyPix);
    await handleSavePayments(onlyPix);
  };

  const handleQuickActivateAll = async () => {
    const all: PaymentMethodsConfig = { pix: true, dinheiro: true, credito: true, debito: true };
    setPaymentConfig(all);
    await handleSavePayments(all);
  };


  // ────────────────── ESTADO: LOGO COM PREVIEW VISUAL ──────────────────
  const [adminLogoUrl, setAdminLogoUrl] = useState('');
  const [uploadingAdminLogo, setUploadingAdminLogo] = useState(false);

  useEffect(() => {
    async function loadAdminLogo() {
      const { data } = await supabase.from('settings').select('value').eq('key', 'admin_logo_url').maybeSingle();
      if (data?.value) setAdminLogoUrl(data.value);
    }
    loadAdminLogo();
  }, []);

  const handleAdminLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setUploadingAdminLogo(true);
      const fileExt = file.name.split('.').pop();
      const fileName = `admin-logo-${Date.now()}.${fileExt}`;
      const filePath = `admin/logo/${fileName}`;
      const { error: uploadError } = await supabase.storage.from('cardapio-dobropizza').upload(filePath, file);
      if (uploadError) throw uploadError;
      const { data } = supabase.storage.from('cardapio-dobropizza').getPublicUrl(filePath);
      const newUrl = data.publicUrl;
      setAdminLogoUrl(newUrl);
      await supabase.from('settings').upsert({ key: 'admin_logo_url', value: newUrl, updated_at: new Date().toISOString() });
      showSavedFeedback("Logo da loja atualizada!");
    } catch (error: any) {
      console.error(error);
      showFeedback("Erro no upload da logo: " + error.message, "error");
    } finally {
      setUploadingAdminLogo(false);
    }
  };

  const handleRemoveAdminLogo = async () => {
    setAdminLogoUrl('');
    await supabase.from('settings').upsert({ key: 'admin_logo_url', value: '', updated_at: new Date().toISOString() });
    showSavedFeedback("Logo removida.");
  };

  // ────────────────── ESTADO: HORÁRIOS DE FUNCIONAMENTO ──────────────────
  const DAY_NAMES = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
  const [hours, setHours] = useState<any[]>([]);
  const [savingHours, setSavingHours] = useState(false);

  useEffect(() => {
    async function loadHours() {
      const { data } = await supabase.from('business_hours').select('*').order('day_of_week');
      if (data) setHours(data);
    }
    loadHours();
  }, []);

  const updateDay = (dayOfWeek: number, field: string, value: any) => {
    setHours(prev => prev.map(h => h.day_of_week === dayOfWeek ? { ...h, [field]: value } : h));
  };

  const handleSaveHours = async () => {
    setSavingHours(true);
    const { error } = await supabase.from('business_hours').upsert(hours, { onConflict: 'day_of_week' });
    setSavingHours(false);
    if (error) showFeedback("Erro ao salvar horários: " + error.message, "error");
    else showSavedFeedback("Grade de horários salva com sucesso!");
  };

  // ────────────────── ESTADO: IMPRESSÃO & COMANDAS ──────────────────
  const [printDelay, setPrintDelay] = useState('200');
  const [savingPrint, setSavingPrint] = useState(false);

  useEffect(() => {
    async function loadPrintDelay() {
      const { data } = await supabase.from('settings').select('value').eq('key', 'print_delay_ms').maybeSingle();
      if (data?.value) setPrintDelay(String(data.value));
    }
    loadPrintDelay();
  }, []);

  const handleSavePrintDelay = async () => {
    setSavingPrint(true);
    await supabase.from('settings').upsert({ key: 'print_delay_ms', value: printDelay, updated_at: new Date().toISOString() });
    setSavingPrint(false);
    showSavedFeedback("Parâmetros de impressão salvos!");
  };

  const handleTestPrint = () => {
    if (onTestPrint) {
      onTestPrint({
        id: 'TESTE',
        customerName: 'Cliente de Teste',
        orderType: 'Delivery',
        paymentMethod: 'Dinheiro',
        totalAmount: 20.90,
        createdAt: new Date().toISOString(),
        items: [
          { name: '1 - Margherita (Gr)', quantity: 1, priceCalculated: 18.90, basePrice: 18.90, extras: [] },
          { name: 'Coca Cola (Lata)', quantity: 1, priceCalculated: 2.00, basePrice: 2.00, extras: [] }
        ]
      });
    }
  };

  // ────────────────── ESTADO: ENTREGAS & PRAZOS ──────────────────
  const [deliveryTime, setDeliveryTime] = useState('40 a 50 min');
  const [pickupTime, setPickupTime] = useState('25 a 35 min');
  const [freeDeliveryThreshold, setFreeDeliveryThreshold] = useState('20');
  const [savingTimes, setSavingTimes] = useState(false);

  useEffect(() => {
    async function loadTimes() {
      const { data } = await supabase.from('settings').select('key, value').in('key', ['delivery_time_estimate', 'pickup_time_estimate', 'free_delivery_threshold']);
      data?.forEach((row: any) => {
        if (row.key === 'delivery_time_estimate') setDeliveryTime(row.value);
        if (row.key === 'pickup_time_estimate') setPickupTime(row.value);
        if (row.key === 'free_delivery_threshold') setFreeDeliveryThreshold(String(row.value));
      });
    }
    loadTimes();
  }, []);

  const handleSaveTimes = async () => {
    setSavingTimes(true);
    await supabase.from('settings').upsert([
      { key: 'delivery_time_estimate', value: deliveryTime, updated_at: new Date().toISOString() },
      { key: 'pickup_time_estimate', value: pickupTime, updated_at: new Date().toISOString() },
      { key: 'free_delivery_threshold', value: Number(freeDeliveryThreshold) || 0, updated_at: new Date().toISOString() },
    ]);
    setSavingTimes(false);
    showSavedFeedback("Configurações de entrega salvas com sucesso!");
  };

  const isOnlyPixActive = paymentConfig.pix && !paymentConfig.dinheiro && !paymentConfig.credito && !paymentConfig.debito;
  const activeMethodsCount = Object.values(paymentConfig).filter(Boolean).length;

  // Categorias do menu lateral de navegação
  const navItems = [
    { id: 'empresa' as SettingsTab, label: 'Empresa & Marca', icon: Building2, desc: 'Nome, CNPJ, Instagram e logo' },
    {
      id: 'pagamentos' as SettingsTab,
      label: 'Formas de Pagamento',
      icon: CreditCard,
      desc: isOnlyPixActive ? 'Somente Pix Ativo Hoje' : `${activeMethodsCount} formas ativas`,
      badge: isOnlyPixActive ? 'Apenas Pix' : null
    },
    { id: 'horarios' as SettingsTab, label: 'Horários de Funcionamento', icon: Clock, desc: 'Turnos e dias operacionais' },
    { id: 'impressao' as SettingsTab, label: 'Impressão Térmica', icon: Printer, desc: 'Auto-impressão e atrasos' },
    { id: 'entregas' as SettingsTab, label: 'Entregas & Prazos', icon: Truck, desc: 'Tempo de espera e frete grátis' },
    { id: 'notificacoes' as SettingsTab, label: 'Notificações & Som', icon: Bell, desc: 'Alertas sonoros de novos pedidos' },
    { id: 'seguranca' as SettingsTab, label: 'Segurança & Backup', icon: Key, desc: 'Troca de senha e exportação CSV' },
  ];

  return (
    <div className="max-w-6xl mx-auto pb-16 font-sans">

      {/* ────────────────── HEADER PRINCIPAL ────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-stone-200">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#083d07] text-[#d5af7a] flex items-center justify-center border border-[#0b520a] shadow-2xs">
              <Sliders size={16} />
            </div>
            <h1 className="text-xl font-bold text-stone-900 tracking-tight">Configurações do Sistema</h1>
          </div>
          <p className="text-xs text-stone-500 mt-1">Gerencie a identidade da loja, regras operacionais e integração do terminal.</p>
        </div>

        {feedback && (
          <div className={`animate-in fade-in slide-in-from-top-2 flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold border shadow-xs ${
            feedback.type === 'error'
              ? 'bg-rose-50 text-rose-900 border-rose-200'
              : feedback.type === 'warning'
              ? 'bg-amber-50 text-amber-900 border-amber-200'
              : 'bg-emerald-50 text-emerald-900 border-emerald-200'
          }`}>
            {feedback.type === 'error' || feedback.type === 'warning' ? (
              <AlertCircle size={14} className={feedback.type === 'error' ? 'text-rose-600' : 'text-amber-600'} />
            ) : (
              <CheckCheck size={14} className="text-emerald-600" />
            )}
            <span>{feedback.message}</span>
          </div>
        )}
      </div>

      {/* ────────────────── LAYOUT EM 2 COLUNAS: ABAS LATERAIS + CONTEÚDO ────────────────── */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-12 gap-6 items-start">

        {/* Coluna Esquerda: Navegação Lateral Fixa */}
        <aside className="md:col-span-4 lg:col-span-3 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all cursor-pointer ${isActive
                    ? 'bg-[#083d07] text-white shadow-xs'
                    : 'text-stone-600 hover:text-stone-950 hover:bg-stone-100'
                  }`}
              >
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-colors ${isActive ? 'bg-[#0b520a] text-[#d5af7a]' : 'bg-stone-100 text-stone-500'
                  }`}>
                  <Icon size={15} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-xs font-bold block truncate leading-tight">{item.label}</span>
                    {item.badge && (
                      <span className={`text-[9px] px-1.5 py-0.2 rounded font-bold uppercase shrink-0 ${isActive ? 'bg-[#d5af7a] text-[#083d07]' : 'bg-emerald-100 text-emerald-800'
                        }`}>
                        {item.badge}
                      </span>
                    )}
                  </div>
                  <span className={`text-[10px] block truncate leading-tight mt-0.5 ${isActive ? 'text-stone-300' : 'text-stone-400'}`}>{item.desc}</span>
                </div>
              </button>
            );
          })}
        </aside>

        {/* Coluna Direita: Conteúdo com Largura Máxima (~650px) para Leitura Confortável */}
        <main className="md:col-span-8 lg:col-span-9">
          <div className="max-w-2xl bg-white rounded-2xl border border-stone-200 shadow-2xs overflow-hidden">

            {/* ═══════════ 1. EMPRESA & MARCA ═══════════ */}
            {activeTab === 'empresa' && (
              <div className="p-6 space-y-6">
                <div className="flex items-center gap-3 pb-4 border-b border-stone-100">
                  <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-700 flex items-center justify-center border border-purple-200">
                    <Building2 size={16} />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-stone-900">Empresa & Identidade Visual</h2>
                    <p className="text-xs text-stone-500">Dados impressos nas comandas térmicas, Instagram e a logo oficial da loja.</p>
                  </div>
                </div>

                {/* Área de Logo com Drop/Preview Redondo */}
                <div>
                  <label className="text-xs font-bold text-stone-800 block mb-2">Logo do Painel de Controle</label>
                  <div className="p-4 bg-stone-50 rounded-xl border border-stone-200 flex flex-col sm:flex-row items-center gap-4">
                    <div className="w-16 h-16 rounded-full overflow-hidden bg-black border-2 border-stone-300 flex items-center justify-center p-1 shadow-xs shrink-0">
                      {adminLogoUrl ? (
                        <img src={adminLogoUrl} alt="Logo" className="w-full h-full object-cover rounded-full" />
                      ) : (
                        <Building2 size={24} className="text-stone-500" />
                      )}
                    </div>
                    <div className="flex-1 text-center sm:text-left min-w-0">
                      <p className="text-xs font-bold text-stone-900">
                        {adminLogoUrl ? 'Logo Atual Ativa' : 'Nenhuma logo configurada'}
                      </p>
                      <p className="text-[11px] text-stone-500 mt-0.5">Formato quadrado recomendado (PNG ou JPG). Aparece no topo do menu lateral.</p>

                      <div className="mt-3 flex flex-wrap items-center justify-center sm:justify-start gap-2">
                        <label className="px-3 py-1.5 bg-[#083d07] hover:bg-[#0b520a] text-[#fdfbf7] font-bold text-xs rounded-lg border border-[#d5af7a]/60 cursor-pointer shadow-xs transition-all flex items-center gap-1.5">
                          <Upload size={13} />
                          <span>{uploadingAdminLogo ? 'Enviando...' : 'Fazer Upload de Logo'}</span>
                          <input
                            type="file"
                            accept="image/png, image/jpeg, image/webp"
                            onChange={handleAdminLogoUpload}
                            disabled={uploadingAdminLogo}
                            className="hidden"
                          />
                        </label>
                        {adminLogoUrl && (
                          <button
                            type="button"
                            onClick={handleRemoveAdminLogo}
                            className="px-3 py-1.5 text-xs text-stone-600 hover:text-rose-600 hover:bg-stone-200/60 rounded-lg transition-colors cursor-pointer"
                          >
                            Remover
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Formulário de Dados da Empresa */}
                <div className="space-y-4 pt-2">
                  <div>
                    <label className="text-xs font-semibold text-stone-700 block mb-1">Nome do Estabelecimento</label>
                    <input
                      type="text"
                      value={companyInfo.name}
                      onChange={e => setCompanyInfo({ ...companyInfo, name: e.target.value })}
                      className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-semibold text-stone-900 focus:bg-white focus:border-[#083d07] focus:ring-2 focus:ring-[#083d07]/30 outline-none transition-all"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-semibold text-stone-700 block mb-1">CNPJ</label>
                      <input
                        type="text"
                        value={companyInfo.nif}
                        onChange={e => setCompanyInfo({ ...companyInfo, nif: e.target.value })}
                        className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-mono font-semibold text-stone-900 focus:bg-white focus:border-[#083d07] focus:ring-2 focus:ring-[#083d07]/30 outline-none transition-all"
                        placeholder="Ex: 517000000"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-stone-700 block mb-1">Endereço</label>
                      <input
                        type="text"
                        value={companyInfo.address}
                        onChange={e => setCompanyInfo({ ...companyInfo, address: e.target.value })}
                        className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-semibold text-stone-900 focus:bg-white focus:border-[#083d07] focus:ring-2 focus:ring-[#083d07]/30 outline-none transition-all"
                        placeholder="Ex: Rua Quirino Zagonel 500 - São José dos Pinhais"
                      />
                    </div>
                  </div>

                  {/* Campo de Instagram Dinâmico */}
                  <div>
                    <label className="text-xs font-semibold text-stone-700 block mb-1 flex items-center gap-1.5">
                      <Instagram size={14} className="text-[#083d07]" />
                      <span>Link do Instagram Oficial</span>
                    </label>
                    <input
                      type="url"
                      value={instagramUrl}
                      onChange={e => setInstagramUrl(e.target.value)}
                      className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-semibold text-stone-900 focus:bg-white focus:border-[#083d07] focus:ring-2 focus:ring-[#083d07]/30 outline-none transition-all"
                      placeholder="https://www.instagram.com/dobropizzas/"
                    />
                    <p className="text-[11px] text-stone-400 mt-1">Atualiza automaticamente o link e o @ no rodapé do cardápio digital.</p>
                  </div>
                </div>

                <div className="pt-4 border-t border-stone-100 flex justify-end">
                  <button
                    onClick={handleSaveCompany}
                    disabled={savingCompany}
                    className="px-5 py-2.5 bg-[#083d07] hover:bg-[#0b520a] text-[#fdfbf7] font-bold rounded-xl text-xs flex items-center gap-1.5 transition-all shadow-xs border border-[#d5af7a]/60 cursor-pointer"
                  >
                    <Save size={14} />
                    <span>{savingCompany ? 'Salvando...' : 'Salvar Dados & Instagram'}</span>
                  </button>
                </div>
              </div>
            )}

            {/* ═══════════ FORMAS DE PAGAMENTO ATIVAS POR DIA ═══════════ */}
            {activeTab === 'pagamentos' && (
              <div className="p-6 space-y-6">
                <div className="flex items-center justify-between pb-4 border-b border-stone-100 flex-wrap gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-[#083d07] text-[#fdfbf7] flex items-center justify-center border border-[#083d07] shadow-2xs">
                      <CreditCard size={16} />
                    </div>
                    <div>
                      <h2 className="text-sm font-bold text-stone-900">Formas de Pagamento Aceitas</h2>
                      <p className="text-xs text-stone-500">Ligue ou desligue as formas de pagamento disponíveis para o cliente hoje.</p>
                    </div>
                  </div>

                  {isOnlyPixActive ? (
                    <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                      Hoje: Somente Pix Ativo
                    </span>
                  ) : (
                    <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                      {activeMethodsCount} formas disponíveis
                    </span>
                  )}
                </div>

                {/* Lista de Métodos de Pagamento - Ativação/Desativação Individual */}
                <div className="space-y-3">
                  {[
                    {
                      key: 'pix' as const,
                      title: 'Pix Instantâneo',
                      badge: '56.116.831/0001-88 (chave pix)',
                      desc: '56.116.831/0001-88 (chave pix) • QR Code dinâmico e Copia e Cola gerados no checkout.',
                      icon: QrCode,
                      activeColor: 'border-emerald-500 bg-emerald-50/30'
                    },
                    {
                      key: 'dinheiro' as const,
                      title: 'Dinheiro em Espécie',
                      badge: 'Na entrega/balcão',
                      desc: 'Cliente paga em dinheiro e pode informar o valor para troco no pedido.',
                      icon: Banknote,
                      activeColor: 'border-amber-500 bg-amber-50/20'
                    },
                    {
                      key: 'credito' as const,
                      title: 'Cartão de Crédito',
                      badge: 'Maquininha',
                      desc: 'Entregador leva a maquininha para passar o cartão de crédito.',
                      icon: CreditCard,
                      activeColor: 'border-blue-500 bg-blue-50/20'
                    },
                    {
                      key: 'debito' as const,
                      title: 'Cartão de Débito',
                      badge: 'Maquininha',
                      desc: 'Entregador leva a maquininha para passar o cartão de débito.',
                      icon: CreditCard,
                      activeColor: 'border-indigo-500 bg-indigo-50/20'
                    }
                  ].map(method => {
                    const isChecked = paymentConfig[method.key];
                    const IconComp = method.icon;
                    return (
                      <div
                        key={method.key}
                        onClick={() => handleTogglePaymentMethod(method.key)}
                        className={`p-3.5 sm:p-4 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 sm:gap-4 ${isChecked
                            ? `${method.activeColor} shadow-2xs`
                            : 'bg-stone-50/60 border-stone-200 opacity-60 hover:opacity-90'
                          }`}
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <div className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center shrink-0 border ${isChecked
                              ? 'bg-[#083d07] text-[#fdfbf7] border-[#083d07]'
                              : 'bg-white text-stone-400 border-stone-200'
                            }`}>
                            <IconComp size={16} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center flex-wrap gap-1.5">
                              <h3 className="text-[11px] sm:text-xs font-bold text-stone-900">{method.title}</h3>
                              <span className="text-[9px] font-medium px-1.5 py-0.2 rounded bg-white border border-stone-200 text-stone-600 shrink-0">
                                {method.badge}
                              </span>
                            </div>
                            <p className="text-[10px] sm:text-[10.5px] text-stone-500 mt-0.5 leading-snug break-words">
                              {method.desc}
                            </p>
                          </div>
                        </div>

                        {/* Switch Toggle */}
                        <div className="shrink-0 flex items-center gap-2">
                          <span className={`text-[10px] sm:text-xs font-bold font-mono ${isChecked ? 'text-emerald-700' : 'text-stone-400'}`}>
                            {isChecked ? 'ATIVO' : 'DESLIGADO'}
                          </span>
                          <div className={`w-10 sm:w-11 h-5 sm:h-6 flex items-center rounded-full p-0.5 sm:p-1 transition-colors cursor-pointer ${isChecked ? 'bg-[#083d07]' : 'bg-stone-300'
                            }`}>
                            <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${isChecked ? 'translate-x-5' : 'translate-x-0'
                              }`} />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="pt-4 border-t border-stone-100 flex items-center justify-between">
                  <span className="text-xs text-stone-500">
                    O cardápio digital reflete essas opções no checkout imediatamente.
                  </span>
                  <button
                    onClick={() => handleSavePayments()}
                    disabled={savingPayments}
                    className="px-5 py-2.5 bg-[#083d07] hover:bg-[#0b520a] text-[#fdfbf7] font-bold rounded-xl text-xs flex items-center gap-1.5 transition-all shadow-xs border border-[#d5af7a]/60 cursor-pointer disabled:opacity-50"
                  >
                    <Save size={14} />
                    <span>{savingPayments ? 'Salvando...' : 'Salvar Formas de Pagamento'}</span>
                  </button>
                </div>
              </div>
            )}


            {/* ═══════════ 2. HORÁRIOS DE FUNCIONAMENTO ═══════════ */}
            {activeTab === 'horarios' && (
              <div className="p-6 space-y-6">
                <div className="flex items-center gap-3 pb-4 border-b border-stone-100">
                  <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center border border-amber-200">
                    <Clock size={16} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h2 className="text-sm font-bold text-stone-900">Horários de Funcionamento</h2>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-[#083d07] border border-emerald-200">
                        🇧🇷 Horário de Brasília (BRT / UTC-3)
                      </span>
                    </div>
                    <p className="text-xs text-stone-500 mt-0.5">Defina os dias e turnos em que a pizzaria aceita pedidos online no cardápio digital.</p>
                  </div>
                </div>

                <div className="space-y-3">
                  {hours.map((h) => (
                    <div
                      key={h.day_of_week}
                      className={`p-3 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${h.is_closed ? 'bg-stone-50/70 border-stone-200 opacity-75' : 'bg-white border-stone-200 shadow-2xs'
                        }`}
                    >
                      <div className="flex items-center justify-between sm:justify-start gap-3 w-40">
                        <span className="text-xs font-bold text-stone-900">{DAY_NAMES[h.day_of_week]}</span>
                      </div>

                      {/* Controle Unificado: Toggle Moderno iOS/Linear */}
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => updateDay(h.day_of_week, 'is_closed', !h.is_closed)}
                          className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${!h.is_closed ? 'bg-emerald-600' : 'bg-stone-300'
                            }`}
                          role="switch"
                          aria-checked={!h.is_closed}
                        >
                          <span
                            className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${!h.is_closed ? 'translate-x-4' : 'translate-x-0'
                              }`}
                          />
                        </button>
                        <span className="text-[11px] font-mono text-stone-500 w-16">
                          {!h.is_closed ? 'Aberto' : 'Fechado'}
                        </span>
                      </div>

                      {!h.is_closed ? (
                        <div className="flex items-center gap-2 font-mono text-xs">
                          <input
                            type="time"
                            value={h.opens_at ? h.opens_at.slice(0, 5) : ''}
                            onChange={(e) => updateDay(h.day_of_week, 'opens_at', e.target.value)}
                            className="p-1.5 bg-stone-50 border border-stone-200 rounded-lg text-xs font-bold text-stone-900 focus:outline-none focus:border-[#083d07]"
                          />
                          <span className="text-stone-300">→</span>
                          <input
                            type="time"
                            value={h.closes_at ? h.closes_at.slice(0, 5) : ''}
                            onChange={(e) => updateDay(h.day_of_week, 'closes_at', e.target.value)}
                            className="p-1.5 bg-stone-50 border border-stone-200 rounded-lg text-xs font-bold text-stone-900 focus:outline-none focus:border-[#083d07]"
                          />
                        </div>
                      ) : (
                        <span className="text-[11px] font-mono text-stone-400 italic">Folga semanal</span>
                      )}
                    </div>
                  ))}
                </div>

                <div className="pt-4 border-t border-stone-100 flex justify-end">
                  <button
                    onClick={handleSaveHours}
                    disabled={savingHours}
                    className="px-5 py-2.5 bg-[#083d07] hover:bg-[#0b520a] text-[#fdfbf7] font-bold rounded-xl text-xs flex items-center gap-1.5 transition-all shadow-xs border border-[#d5af7a]/60 cursor-pointer"
                  >
                    <Save size={14} />
                    <span>{savingHours ? 'Salvando...' : 'Salvar Grade de Horários'}</span>
                  </button>
                </div>
              </div>
            )}

            {/* ═══════════ 3. IMPRESSÃO TÉRMICA ═══════════ */}
            {activeTab === 'impressao' && (
              <div className="p-6 space-y-6">
                <div className="flex items-center gap-3 pb-4 border-b border-stone-100">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center border border-blue-200">
                    <Printer size={16} />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-stone-900">Impressão Térmica & Comandas</h2>
                    <p className="text-xs text-stone-500">Configurações para impressoras de 80mm ou 58mm (balcão e cozinha).</p>
                  </div>
                </div>

                {/* Toggle Padronizado de Auto-Impressão */}
                {onToggleAutoPrint && (
                  <div className="p-4 bg-stone-50 rounded-xl border border-stone-200 flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-stone-900 block">Auto-Imprimir Comandas</span>
                      <span className="text-[11px] text-stone-500">Imprime o comprovante no momento em que o pedido é aceito.</span>
                    </div>
                    <button
                      type="button"
                      onClick={onToggleAutoPrint}
                      className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${autoPrint ? 'bg-emerald-600' : 'bg-stone-300'
                        }`}
                      role="switch"
                      aria-checked={autoPrint}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${autoPrint ? 'translate-x-5' : 'translate-x-0'
                          }`}
                      />
                    </button>
                  </div>
                )}

                <div>
                  <label className="text-xs font-semibold text-stone-700 block mb-1">Atraso antes do envio à impressora (ms)</label>
                  <p className="text-[11px] text-stone-500 mb-2">Permite que imagens e layout do cupom terminem de renderizar no navegador.</p>
                  <div className="flex items-center gap-2 max-w-xs">
                    <input
                      type="number"
                      value={printDelay}
                      onChange={e => setPrintDelay(e.target.value)}
                      className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-mono font-bold text-stone-900 focus:bg-white focus:border-[#083d07] outline-none"
                    />
                    <span className="text-xs font-mono text-stone-500">ms</span>
                  </div>
                </div>

                <div className="pt-4 border-t border-stone-100 flex items-center justify-between">
                  <button
                    onClick={handleTestPrint}
                    className="px-4 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-xl text-xs font-bold transition-colors inline-flex items-center gap-1.5 cursor-pointer border border-stone-200"
                  >
                    <Printer size={14} />
                    <span>Imprimir Cupom de Teste</span>
                  </button>

                  <button
                    onClick={handleSavePrintDelay}
                    disabled={savingPrint}
                    className="px-5 py-2.5 bg-[#083d07] hover:bg-[#0b520a] text-[#fdfbf7] font-bold rounded-xl text-xs flex items-center gap-1.5 transition-all shadow-xs border border-[#d5af7a]/60 cursor-pointer"
                  >
                    <Save size={14} />
                    <span>{savingPrint ? 'Salvando...' : 'Salvar Impressão'}</span>
                  </button>
                </div>
              </div>
            )}

            {/* ═══════════ 4. ENTREGAS & PRAZOS ═══════════ */}
            {activeTab === 'entregas' && (
              <div className="p-6 space-y-6">
                <div className="flex items-center gap-3 pb-4 border-b border-stone-100">
                  <div className="w-8 h-8 rounded-lg bg-orange-50 text-orange-700 flex items-center justify-center border border-orange-200">
                    <Truck size={16} />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-stone-900">Prazos & Taxas de Entrega</h2>
                    <p className="text-xs text-stone-500">Estimativas informadas diretamente aos clientes no cardápio online.</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-semibold text-stone-700 block mb-1">
                      Valor Mínimo para Entrega Grátis (R$)
                    </label>
                    <div className="relative max-w-xs">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 font-bold text-xs">R$</span>
                      <input
                        type="number"
                        step="0.50"
                        value={freeDeliveryThreshold}
                        onChange={e => setFreeDeliveryThreshold(e.target.value)}
                        className="w-full pl-7 pr-3 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-mono font-bold text-stone-900 focus:bg-white focus:border-[#083d07] outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-semibold text-stone-700 block mb-1">Tempo Estimado de Entrega</label>
                      <input
                        type="text"
                        value={deliveryTime}
                        onChange={e => setDeliveryTime(e.target.value)}
                        className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-medium text-stone-900 focus:bg-white focus:border-[#083d07] outline-none"
                        placeholder="Ex: 40 a 50 min"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-stone-700 block mb-1">Tempo Estimado para Retirada</label>
                      <input
                        type="text"
                        value={pickupTime}
                        onChange={e => setPickupTime(e.target.value)}
                        className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-medium text-stone-900 focus:bg-white focus:border-[#083d07] outline-none"
                        placeholder="Ex: 20 a 30 min"
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-stone-100 flex justify-end">
                  <button
                    onClick={handleSaveTimes}
                    disabled={savingTimes}
                    className="px-5 py-2.5 bg-[#083d07] hover:bg-[#0b520a] text-[#fdfbf7] font-bold rounded-xl text-xs flex items-center gap-1.5 transition-all shadow-xs border border-[#d5af7a]/60 cursor-pointer"
                  >
                    <Save size={14} />
                    <span>{savingTimes ? 'Salvando...' : 'Salvar Prazos & Frete'}</span>
                  </button>
                </div>
              </div>
            )}

            {/* ═══════════ 5. NOTIFICAÇÕES & SOM ═══════════ */}
            {activeTab === 'notificacoes' && (
              <div className="p-6 space-y-6">
                <div className="flex items-center gap-3 pb-4 border-b border-stone-100">
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-200">
                    <Bell size={16} />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-stone-900">Notificações & Alerta Sonoro</h2>
                    <p className="text-xs text-stone-500">Aviso sonoro no balcão e na cozinha ao entrar um pedido novo.</p>
                  </div>
                </div>

                {/* Toggle Padronizado de Som */}
                <div className="p-4 bg-stone-50 rounded-xl border border-stone-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={onToggleSound}
                      className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${soundEnabled ? 'bg-emerald-600' : 'bg-stone-300'
                        }`}
                      role="switch"
                      aria-checked={soundEnabled}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${soundEnabled ? 'translate-x-5' : 'translate-x-0'
                          }`}
                      />
                    </button>
                    <div>
                      <span className="text-xs font-bold text-stone-900 flex items-center gap-1.5">
                        {soundEnabled ? <><Bell size={13} className="text-emerald-600" /> Alerta Sonoro Ativo</> : <><BellOff size={13} className="text-stone-400" /> Som Mudo</>}
                      </span>
                      <span className="text-[11px] text-stone-500">Toca repetidamente até o operador abrir a comanda.</span>
                    </div>
                  </div>

                  {onTestSound && (
                    <button
                      type="button"
                      onClick={onTestSound}
                      className="px-3.5 py-2 bg-[#083d07] hover:bg-[#0b520a] text-[#d5af7a] text-xs font-bold rounded-xl transition-colors inline-flex items-center gap-1.5 cursor-pointer shadow-xs self-start sm:self-auto"
                    >
                      <Volume2 size={14} />
                      <span>Testar Toque</span>
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* ═══════════ 6. SEGURANÇA & BACKUP ═══════════ */}
            {activeTab === 'seguranca' && (
              <div className="p-6 space-y-6">
                <div className="flex items-center gap-3 pb-4 border-b border-stone-100">
                  <div className="w-8 h-8 rounded-lg bg-stone-100 text-stone-800 flex items-center justify-center border border-stone-200">
                    <Key size={16} />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-stone-900">Segurança & Exportação de Dados</h2>
                    <p className="text-xs text-stone-500">Credenciais administrativas e exportação contábil para planilhas.</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-4 bg-stone-50 rounded-xl border border-stone-200 flex flex-col justify-between">
                    <div>
                      <span className="text-xs font-bold text-stone-900 block mb-1">Senha de Administrador</span>
                      <span className="text-[11px] text-stone-500">Altere a senha mestre de acesso a este painel.</span>
                    </div>
                    <button
                      onClick={onChangePassword}
                      className="mt-4 w-full py-2.5 bg-[#083d07] hover:bg-[#0b520a] text-white rounded-xl text-xs font-bold transition-colors inline-flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                    >
                      <Key size={13} />
                      <span>Alterar Senha</span>
                    </button>
                  </div>

                  <div className="p-4 bg-stone-50 rounded-xl border border-stone-200 flex flex-col justify-between">
                    <div>
                      <span className="text-xs font-bold text-stone-900 block mb-1">Planilha de Pedidos</span>
                      <span className="text-[11px] text-stone-500">Baixe o histórico com clientes, totais e pagamentos.</span>
                    </div>
                    <button
                      onClick={onExportCSV}
                      className="mt-4 w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors inline-flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                    >
                      <FileSpreadsheet size={13} />
                      <span>Exportar CSV Excel</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

          </div>
        </main>

      </div>
    </div>
  );
}
