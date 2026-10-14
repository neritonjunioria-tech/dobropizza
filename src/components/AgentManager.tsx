import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { 
  Bot, Power, Loader2, MessageSquare, 
  Send, User, Search, PauseCircle, PlayCircle, X,
  Image as ImageIcon, FileText, Music, ZoomIn, Download, ExternalLink, ShieldCheck, CheckCheck,
  Users, Clock, TrendingUp, Sparkles, ChevronDown, ChevronUp, RefreshCw, Trash2,
  CreditCard, Coins, CheckCircle2, ArrowUpRight, Copy, Check, ArrowLeft
} from 'lucide-react';

export interface ChatMessage {
  id: string;
  sender: 'client' | 'bot' | 'human';
  text: string;
  media_url?: string | null;
  media_type?: string | null;
  caption?: string | null;
  timestamp: string;
}

export interface ChatConversation {
  phone: string;
  name: string;
  paused: boolean;
  paused_at?: string | null;
  last_message?: string;
  last_sender?: 'client' | 'bot' | 'human';
  updated_at: string;
  messages: ChatMessage[];
}

export interface ParsedMessage {
  mediaType: 'image' | 'audio' | 'document' | 'sticker' | 'text';
  mediaUrl: string | null;
  caption: string | null;
  displayText: string;
  isReceipt: boolean;
}

export function parseMessageContent(text: string, mediaUrlProp?: string | null, mediaTypeProp?: string | null, captionProp?: string | null): ParsedMessage {
  const isReceiptPattern = /(?:comprovante|pix|mb\s*way|mbway|transfer[eê]ncia|paguei|pago|recibo)/i;

  if (mediaUrlProp) {
    const isImage = mediaTypeProp === 'image' || (!mediaTypeProp && (mediaUrlProp.startsWith('data:image') || /\.(jpg|jpeg|png|webp|gif)/i.test(mediaUrlProp)));
    const isSticker = mediaTypeProp === 'sticker' || (!mediaTypeProp && mediaUrlProp.startsWith('data:image/webp'));
    const isAudio = mediaTypeProp === 'audio' || (!mediaTypeProp && (mediaUrlProp.startsWith('data:audio') || /\.(mp3|ogg|wav|opus|m4a)/i.test(mediaUrlProp)));
    const isDoc = mediaTypeProp === 'document' || (!mediaTypeProp && /\.(pdf|docx?|xlsx?)/i.test(mediaUrlProp));
    const cap = captionProp || (text && !text.startsWith('[') ? text : null);
    const mType = isSticker ? 'sticker' : (isImage ? 'image' : (isAudio ? 'audio' : (isDoc ? 'document' : 'text')));

    return {
      mediaType: mType,
      mediaUrl: mediaUrlProp,
      caption: cap,
      displayText: cap || (isSticker ? 'Figurinha' : (isImage ? 'Foto / Comprovante' : (isAudio ? 'Mensagem de voz' : (isDoc ? 'Documento' : text)))),
      isReceipt: Boolean(cap && isReceiptPattern.test(cap))
    };
  }

  if (!text) return { mediaType: 'text', mediaUrl: null, caption: null, displayText: '', isReceipt: false };

  // 1. Detecta marcação [FOTO: URL] ou [IMAGEM: URL]
  const fotoMatch = text.match(/^\[(?:FOTO|IMAGEM):\s*([^\]]+)\]\s*(.*)$/is);
  if (fotoMatch) {
    const url = fotoMatch[1].trim();
    const cap = fotoMatch[2].trim() || null;
    return {
      mediaType: 'image',
      mediaUrl: url.length > 5 ? url : null,
      caption: cap,
      displayText: cap || 'Foto / Comprovante',
      isReceipt: Boolean(cap && isReceiptPattern.test(cap)) || (url.length > 5 && isReceiptPattern.test(text))
    };
  }

  // 2. Detecta marcação [AUDIO: URL]
  const audioMatch = text.match(/^\[AUDIO:\s*([^\]]+)\]\s*(.*)$/is);
  if (audioMatch) {
    const url = audioMatch[1].trim();
    return {
      mediaType: 'audio',
      mediaUrl: url.length > 5 ? url : null,
      caption: null,
      displayText: 'Mensagem de voz',
      isReceipt: false
    };
  }

  // 3. Detecta marcação [DOC: URL]
  const docMatch = text.match(/^\[DOC:\s*([^\]]+)\]\s*(.*)$/is);
  if (docMatch) {
    const url = docMatch[1].trim();
    const title = docMatch[2].trim() || 'Documento';
    return {
      mediaType: 'document',
      mediaUrl: url.length > 5 ? url : null,
      caption: title,
      displayText: title,
      isReceipt: isReceiptPattern.test(title)
    };
  }

  // 4. Detecta marcação [FIGURINHA: URL]
  const stickerMatch = text.match(/^\[FIGURINHA:\s*([^\]]+)\]/is);
  if (stickerMatch) {
    const url = stickerMatch[1].trim();
    return {
      mediaType: 'sticker',
      mediaUrl: url.length > 5 ? url : null,
      caption: null,
      displayText: 'Figurinha',
      isReceipt: false
    };
  }

  // 5. Fallbacks para figurinhas descritivas
  if (text.includes('[Figurinha') || text.includes('🏷️') || text.includes('[sticker')) {
    return {
      mediaType: 'sticker',
      mediaUrl: null,
      caption: null,
      displayText: 'Figurinha WhatsApp',
      isReceipt: false
    };
  }

  // 6. Fallbacks para áudios descritivos
  if (text.includes('[Mensagem de voz') || text.includes('[Áudio') || text.includes('[Audio') || text.includes('🎵')) {
    return {
      mediaType: 'audio',
      mediaUrl: null,
      caption: null,
      displayText: 'Mensagem de voz',
      isReceipt: false
    };
  }

  // 7. Fallback para fotos/comprovantes descritivos sem link
  if (text.includes('[Foto/Comprovante') || text.includes('[📷 Foto') || text.includes('[Arquivo/Midia]')) {
    return {
      mediaType: 'image',
      mediaUrl: null,
      caption: text.replace(/^\[(?:Foto\/Comprovante[^\]]*|📷 Foto[^\]]*|Arquivo\/Midia)\]\s*:?\s*/i, '').trim() || null,
      displayText: text,
      isReceipt: isReceiptPattern.test(text)
    };
  }

  return {
    mediaType: 'text',
    mediaUrl: null,
    caption: null,
    displayText: text,
    isReceipt: false
  };
}

// Atalhos de Respostas Rápidas para o Operador
const QUICK_RESPONSES = [
  { label: '🍕 No Forno', text: 'Seu pedido já está no forno e logo sai para entrega!' },
  { label: '🛵 Saiu p/ Entrega', text: 'Seu pedido acabou de sair com o entregador para entrega!' },
  { label: '🪙 Precisa de Troco?', text: 'Com certeza! Você tem o valor exato ou precisa de troco para alguma nota (ex: R$ 50, R$ 100)?' },
  { label: '✅ PIX Confirmado', text: 'Confirmamos o recebimento do seu PIX com sucesso! Muito obrigado!' },
  { label: '💳 Chave PIX', text: 'Nossa chave PIX (telefone) é: (41) 99598-4072' }
];

export default function AgentManager() {
  const [isActive, setIsActive] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string>('');
  const [copiedPhone, setCopiedPhone] = useState(false);
  const [conversationFilter, setConversationFilter] = useState<'all' | 'ai' | 'manual'>('all');
  const [activePixKey, setActivePixKey] = useState<string>('(41) 99598-4072');
  const [savingPix, setSavingPix] = useState(false);

  const handleCopyPhone = useCallback((phone: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(phone);
    setCopiedPhone(true);
    setTimeout(() => setCopiedPhone(false), 2000);
  }, []);

  // Estado das Conversas (Espelho WhatsApp Relacional)
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [loadingConversations, setLoadingConversations] = useState(false);
  const [selectedPhone, setSelectedPhone] = useState<string | null>(null);
  const selectedPhoneRef = useRef<string | null>(null);

  // Mensagens da conversa atualmente aberta (limite de 20)
  const [activeMessages, setActiveMessages] = useState<ChatMessage[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);

  const [searchTerm, setSearchTerm] = useState('');
  const [manualMessage, setManualMessage] = useState('');
  const [sendingManual, setSendingManual] = useState(false);
  const [togglingChatPause, setTogglingChatPause] = useState(false);
  const [selectedImage, setSelectedImage] = useState<{ url: string; caption?: string; sender?: string; timestamp?: string } | null>(null);
  const [deletingAll, setDeletingAll] = useState(false);

  // Métricas do Dia (Cockpit de Atendimento)
  const [showMetricsDashboard, setShowMetricsDashboard] = useState(true);
  const [showLearningDrawer, setShowLearningDrawer] = useState(false);
  const [loadingMetrics, setLoadingMetrics] = useState(false);
  const [metrics, setMetrics] = useState({
    totalConversationsToday: 0,
    aiHandledConversations: 0,
    humanHandledConversations: 0,
    totalClientMessages: 0,
    totalBotMessages: 0,
    totalHumanMessages: 0,
    avgResponseTimeSec: 0
  });

  const fetchDailyMetrics = async () => {
    setLoadingMetrics(true);
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayIso = today.toISOString();

      const { data: allMsgs } = await supabase
        .from('chat_messages')
        .select('phone, sender, created_at')
        .gte('created_at', todayIso);

      const msgs = allMsgs || [];

      let clientMsgs = 0;
      let botMsgs = 0;
      let humanMsgs = 0;
      const activePhones = new Set<string>();
      const aiPhones = new Set<string>();
      const humanPhones = new Set<string>();
      const responseTimes: number[] = [];
      const phoneGroups: Record<string, any[]> = {};

      for (const m of msgs) {
        if (m.phone) activePhones.add(m.phone);
        if (m.sender === 'client') {
          clientMsgs++;
        } else if (m.sender === 'bot') {
          botMsgs++;
          if (m.phone) aiPhones.add(m.phone);
        } else if (m.sender === 'human') {
          humanMsgs++;
          if (m.phone) humanPhones.add(m.phone);
        }

        if (m.phone) {
          if (!phoneGroups[m.phone]) phoneGroups[m.phone] = [];
          phoneGroups[m.phone].push(m);
        }
      }

      for (const list of Object.values(phoneGroups)) {
        list.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        let lastClientTime = 0;
        for (const m of list) {
          if (m.sender === 'client') {
            lastClientTime = new Date(m.created_at).getTime();
          } else if (lastClientTime > 0) {
            const diffSec = (new Date(m.created_at).getTime() - lastClientTime) / 1000;
            if (diffSec >= 0 && diffSec < 400) {
              responseTimes.push(diffSec);
            }
            lastClientTime = 0;
          }
        }
      }

      const avgSec = responseTimes.length > 0
        ? Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length)
        : (botMsgs > 0 ? 4 : 0);

      setMetrics({
        totalConversationsToday: activePhones.size || conversations.length,
        aiHandledConversations: aiPhones.size,
        humanHandledConversations: humanPhones.size || conversations.filter(c => c.paused).length,
        totalClientMessages: clientMsgs,
        totalBotMessages: botMsgs,
        totalHumanMessages: humanMsgs,
        avgResponseTimeSec: avgSec
      });
    } catch (err) {
      console.warn('Erro ao carregar métricas:', err);
    } finally {
      setLoadingMetrics(false);
    }
  };

  // Fecha o modal de imagem ao pressionar Esc
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSelectedImage(null);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Mantém a ref sincronizada com o estado para o listener do Realtime
  useEffect(() => {
    selectedPhoneRef.current = selectedPhone;
  }, [selectedPhone]);

  useEffect(() => {
    fetchBotStatus();
    loadConversations();
    fetchDailyMetrics();
    
    // Inscrever-se para atualizações em tempo real (Settings, Conversas e Mensagens)
    const subscription = supabase
      .channel('chat_agent_realtime_v2')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'settings' }, (payload) => {
        const item = (payload.new || payload.old) as any;
        if (!item || !item.key) return;

        // Status geral do bot
        if (item.key === 'bot_active') {
          setIsActive(Boolean(item.value));
          if (item.updated_at) {
            setLastUpdated(new Date(item.updated_at).toLocaleTimeString('pt-BR'));
          }
        }

        // Espelho de conversas via settings (fallback)
        if (typeof item.key === 'string' && item.key.startsWith('chat_conversation_')) {
          if (payload.eventType === 'DELETE') {
            const rawPhone = item.key.replace('chat_conversation_', '');
            setConversations(prev => prev.filter(c => c.phone !== rawPhone));
          } else if (item.value) {
            const conv = item.value as ChatConversation;
            setConversations(prev => {
              const exists = prev.some(c => c.phone === conv.phone);
              if (exists) {
                return prev.map(c => c.phone === conv.phone ? { ...c, ...conv } : c)
                  .sort((a, b) => new Date(b.updated_at || 0).getTime() - new Date(a.updated_at || 0).getTime());
              }
              return [conv, ...prev];
            });

            if (selectedPhoneRef.current === conv.phone && Array.isArray(conv.messages)) {
              setActiveMessages(conv.messages.slice(-100));
            }
          }
        }
      })
      // Ouvinte na tabela relacional de conversas
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_conversations' }, (payload) => {
        if (payload.eventType === 'DELETE') {
          const deletedPhone = (payload.old as any)?.phone;
          if (deletedPhone) {
            setConversations(prev => prev.filter(c => c.phone !== deletedPhone));
            if (selectedPhoneRef.current === deletedPhone) {
              setSelectedPhone(null);
              setActiveMessages([]);
            }
          }
        } else if (payload.new) {
          const newConv = payload.new as any;
          setConversations(prev => {
            const exists = prev.some(c => c.phone === newConv.phone);
            if (exists) {
              return prev.map(c => c.phone === newConv.phone ? {
                ...c,
                name: newConv.name || c.name,
                paused: Boolean(newConv.paused),
                paused_at: newConv.paused_at,
                last_message: newConv.last_message || c.last_message,
                last_sender: newConv.last_sender || c.last_sender,
                updated_at: newConv.updated_at || new Date().toISOString()
              } : c).sort((a, b) => new Date(b.updated_at || 0).getTime() - new Date(a.updated_at || 0).getTime());
            }
            return [{
              phone: newConv.phone,
              name: newConv.name || 'Cliente',
              paused: Boolean(newConv.paused),
              paused_at: newConv.paused_at,
              last_message: newConv.last_message,
              last_sender: newConv.last_sender,
              updated_at: newConv.updated_at || new Date().toISOString(),
              messages: []
            }, ...prev];
          });
        }
      })
      // Ouvinte na tabela relacional de mensagens (Histórico contínuo sem sobrescrever)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages' }, (payload) => {
        const newMsg = payload.new as any;
        if (!newMsg) return;

        // Se for da conversa aberta na tela, adiciona imediatamente
        if (selectedPhoneRef.current === newMsg.phone) {
          setActiveMessages(prev => {
            if (prev.some(m => m.id === newMsg.id)) return prev;
            return [...prev, {
              id: newMsg.id,
              sender: newMsg.sender as 'client' | 'bot' | 'human',
              text: newMsg.text,
              media_url: newMsg.media_url || null,
              media_type: newMsg.media_type || null,
              caption: newMsg.caption || null,
              timestamp: newMsg.created_at || new Date().toISOString()
            }].slice(-100);
          });
        }

        // Atualiza prévia e sobe a conversa para o topo da barra lateral
        setConversations(prev => {
          return prev.map(c => c.phone === newMsg.phone ? {
            ...c,
            last_message: newMsg.text,
            last_sender: newMsg.sender,
            updated_at: newMsg.created_at || new Date().toISOString()
          } : c).sort((a, b) => new Date(b.updated_at || 0).getTime() - new Date(a.updated_at || 0).getTime());
        });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, []);

  // Carrega as últimas 20 mensagens quando uma conversa é selecionada
  useEffect(() => {
    if (selectedPhone) {
      loadMessagesForPhone(selectedPhone);
    } else {
      setActiveMessages([]);
    }
  }, [selectedPhone]);

  const prevPhoneRef = useRef<string | null>(null);

  // Auto-scroll ao receber nova mensagem ou trocar de conversa
  useEffect(() => {
    if (selectedPhone && messagesEndRef.current) {
      const isSwitchingPhone = prevPhoneRef.current !== selectedPhone;
      prevPhoneRef.current = selectedPhone;
      messagesEndRef.current.scrollIntoView({ 
        behavior: isSwitchingPhone ? 'auto' : 'smooth',
        block: 'nearest'
      });
    }
  }, [selectedPhone, activeMessages]);

  const fetchBotStatus = async () => {
    try {
      const { data: settingsData, error } = await supabase
        .from('settings')
        .select('key, value, updated_at')
        .in('key', ['bot_active', 'active_mbway_key']);
      
      if (error) {
        console.error('Erro ao buscar status do bot:', error);
        setIsActive(true);
      } else if (settingsData) {
        const botSetting = settingsData.find(s => s.key === 'bot_active');
        if (botSetting) {
          setIsActive(Boolean(botSetting.value));
          if (botSetting.updated_at) {
            setLastUpdated(new Date(botSetting.updated_at).toLocaleTimeString('pt-BR'));
          }
        } else {
          setIsActive(true);
        }

        const pixSetting = settingsData.find(s => s.key === 'active_pix_key' || s.key === 'active_mbway_key' || s.key === 'pix_key_phone');
        if (pixSetting && pixSetting.value) {
          setActivePixKey(String(pixSetting.value));
        }
      } else {
        setIsActive(true);
      }
    } catch (err) {
      console.error('Exceção ao buscar status:', err);
      setIsActive(true);
    } finally {
      setLoading(false);
    }
  };

  const loadConversations = async () => {
    setLoadingConversations(true);
    try {
      // 1. Tenta carregar da tabela relacional chat_conversations
      const { data: convData, error: convErr } = await supabase
        .from('chat_conversations')
        .select('*')
        .order('updated_at', { ascending: false });

      if (!convErr && convData && convData.length > 0) {
        const parsed: ChatConversation[] = convData.map(c => ({
          phone: c.phone,
          name: c.name || 'Cliente',
          paused: Boolean(c.paused),
          paused_at: c.paused_at,
          last_message: c.last_message,
          last_sender: c.last_sender,
          updated_at: c.updated_at,
          messages: []
        }));

        setConversations(parsed);
        if (!selectedPhone && parsed.length > 0) {
          setSelectedPhone(parsed[0].phone);
        }
        return;
      }

      // 2. Fallback: carregar da tabela settings
      const { data: settingsData, error: settingsErr } = await supabase
        .from('settings')
        .select('key, value, updated_at')
        .like('key', 'chat_conversation_%');

      if (settingsErr) throw settingsErr;

      if (settingsData) {
        const parsed: ChatConversation[] = settingsData
          .map(d => d.value)
          .filter(Boolean)
          .sort((a, b) => new Date(b.updated_at || 0).getTime() - new Date(a.updated_at || 0).getTime());

        setConversations(parsed);
        if (parsed.length > 0 && !selectedPhone) {
          setSelectedPhone(parsed[0].phone);
        }
      }
    } catch (err) {
      console.error('Erro ao carregar conversas do espelho:', err);
    } finally {
      setLoadingConversations(false);
    }
  };

  const loadMessagesForPhone = async (phone: string) => {
    if (!phone) return;
    setLoadingMessages(true);
    try {
      // 1. Carrega histórico da tabela relacional chat_messages (até 100 mensagens)
      const { data: msgData, error: msgErr } = await supabase
        .from('chat_messages')
        .select('id, sender, text, created_at')
        .eq('phone', phone)
        .order('created_at', { ascending: false })
        .limit(100);

      if (!msgErr && msgData && msgData.length > 0) {
        // Inverter para ordem cronológica (mais antiga -> mais nova)
        const chronMsgs: ChatMessage[] = msgData.reverse().map((m: any) => ({
          id: m.id,
          sender: m.sender as 'client' | 'bot' | 'human',
          text: m.text,
          media_url: m.media_url || null,
          media_type: m.media_type || null,
          caption: m.caption || null,
          timestamp: m.created_at
        }));
        setActiveMessages(chronMsgs);
        return;
      }

      // 2. Fallback: carregar do array salvo no settings
      const conv = conversations.find(c => c.phone === phone);
      if (conv && Array.isArray(conv.messages) && conv.messages.length > 0) {
        setActiveMessages(conv.messages.slice(-100));
      } else {
        setActiveMessages([]);
      }
    } catch (err) {
      console.error('Erro ao carregar mensagens:', err);
    } finally {
      setLoadingMessages(false);
    }
  };

  const toggleBot = async () => {
    if (isActive === null) return;
    
    setUpdating(true);
    const newStatus = !isActive;
    const nowIso = new Date().toISOString();
    
    try {
      const { error } = await supabase
        .from('settings')
        .upsert({ 
          key: 'bot_active', 
          value: newStatus, 
          updated_at: nowIso
        }, { onConflict: 'key' });
        
      if (error) throw error;
      
      setIsActive(newStatus);
      setLastUpdated(new Date(nowIso).toLocaleTimeString('pt-BR'));
    } catch (err) {
      console.error('Erro ao alternar bot:', err);
      alert('Não foi possível alterar o status do agente no banco de dados.');
    } finally {
      setUpdating(false);
    }
  };

  const handleSelectPix = async (newKey: string) => {
    if (newKey === activePixKey || savingPix) return;
    setSavingPix(true);
    try {
      const nowIso = new Date().toISOString();
      const { error } = await supabase
        .from('settings')
        .upsert({ 
          key: 'active_pix_key', 
          value: newKey, 
          updated_at: nowIso 
        }, { onConflict: 'key' });
        
      if (!error) {
        setActivePixKey(newKey);
      }
    } catch (err) {
      console.error('Erro ao alternar chave PIX:', err);
    } finally {
      setSavingPix(false);
    }
  };

  const formattedActivePix = activePixKey === '41995984072' ? '(41) 99598-4072' : (activePixKey || '(41) 99598-4072');

  const toggleChatPause = async (phone: string, currentPaused: boolean) => {
    setTogglingChatPause(true);
    const newPaused = !currentPaused;
    const nowIso = new Date().toISOString();

    try {
      // 1. Tenta atualizar na tabela relacional chat_conversations
      try {
        await supabase
          .from('chat_conversations')
          .update({
            paused: newPaused,
            paused_at: newPaused ? nowIso : null,
            updated_at: nowIso
          })
          .eq('phone', phone);
      } catch (e) {
        console.warn('Aviso relacional toggle:', e);
      }

      // 2. Atualiza settings (fallback)
      const convKey = `chat_conversation_${phone}`;
      const conv = conversations.find(c => c.phone === phone);
      if (conv) {
        const updatedValue: ChatConversation = {
          ...conv,
          paused: newPaused,
          paused_at: newPaused ? nowIso : null,
          updated_at: nowIso
        };

        await supabase
          .from('settings')
          .upsert({
            key: convKey,
            value: updatedValue,
            updated_at: nowIso
          }, { onConflict: 'key' });

        setConversations(prev => prev.map(c => c.phone === phone ? updatedValue : c));
      }
    } catch (err) {
      console.error('Erro ao alternar pausa do chat:', err);
      alert('Erro ao atualizar pausa deste chat.');
    } finally {
      setTogglingChatPause(false);
    }
  };

  const sendManualMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!selectedPhone || !manualMessage.trim() || sendingManual) return;

    const messageText = manualMessage.trim();
    setSendingManual(true);
    setManualMessage('');
    const nowIso = new Date().toISOString();

    const optimisticMsg: ChatMessage = {
      id: `temp_${Date.now()}`,
      sender: 'human',
      text: messageText,
      timestamp: nowIso
    };

    // Atualização otimista na tela (mantendo limite de 100)
    setActiveMessages(prev => [...prev, optimisticMsg].slice(-100));

    try {
      // 1. Grava na tabela relacional chat_messages e chat_conversations
      try {
        await supabase
          .from('chat_messages')
          .insert({
            phone: selectedPhone,
            sender: 'human',
            text: messageText
          });

        await supabase
          .from('chat_conversations')
          .upsert({
            phone: selectedPhone,
            last_message: messageText,
            last_sender: 'human',
            paused: true,
            paused_at: nowIso,
            updated_at: nowIso
          }, { onConflict: 'phone' });
      } catch (relErr) {
        console.warn('Aviso gravação relacional manual:', relErr);
      }

      // 2. Grava no settings (fallback de compatibilidade)
      const conv = conversations.find(c => c.phone === selectedPhone);
      const convKey = `chat_conversation_${selectedPhone}`;
      const updatedMessages = [...(conv?.messages || []), optimisticMsg].slice(-100);

      const updatedConv: ChatConversation = {
        phone: selectedPhone,
        name: conv?.name || 'Cliente',
        paused: true,
        paused_at: conv?.paused ? conv.paused_at : nowIso,
        last_message: messageText,
        last_sender: 'human',
        updated_at: nowIso,
        messages: updatedMessages
      };

      await supabase
        .from('settings')
        .upsert({
          key: convKey,
          value: updatedConv,
          updated_at: nowIso
        }, { onConflict: 'key' });

      setConversations(prev => prev.map(c => c.phone === selectedPhone ? updatedConv : c)
        .sort((a, b) => new Date(b.updated_at || 0).getTime() - new Date(a.updated_at || 0).getTime()));

      // 3. Dispara envio real para o WhatsApp via Netlify Function
      fetch('/.netlify/functions/whatsapp-send-manual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: selectedPhone,
          message: messageText
        })
      }).catch(err => console.warn('Aviso envio WhatsApp:', err));

    } catch (err) {
      console.error('Erro ao enviar mensagem manual:', err);
      alert('Falha ao registrar mensagem manual.');
    } finally {
      setSendingManual(false);
    }
  };

  const deleteConversation = async (e: React.MouseEvent, phone: string) => {
    e.stopPropagation();
    
    if (!window.confirm('Tem certeza que deseja excluir esta conversa?')) return;

    try {
      // 1. Exclui de chat_conversations e chat_messages
      try {
        await supabase.from('chat_conversations').delete().eq('phone', phone);
        await supabase.from('chat_messages').delete().eq('phone', phone);
      } catch (relErr) {
        console.warn('Aviso delete relacional:', relErr);
      }

      // 2. Exclui de settings (fallback)
      const convKey = `chat_conversation_${phone}`;
      await supabase
        .from('settings')
        .delete()
        .eq('key', convKey);

      setConversations(prev => prev.filter(c => c.phone !== phone));
      
      if (selectedPhone === phone) {
        setSelectedPhone(null);
        setActiveMessages([]);
      }
    } catch (err) {
      console.error('Erro ao excluir conversa:', err);
      alert('Erro ao excluir a conversa.');
    }
  };

  const deleteAllConversations = async () => {
    if (conversations.length === 0) return;

    const confirmed = window.confirm(
      `ATENÇÃO: Deseja realmente excluir TODAS as ${conversations.length} conversas e o histórico de mensagens?\n\nEsta ação apagará todo o histórico e não poderá ser desfeita.`
    );
    if (!confirmed) return;

    setDeletingAll(true);
    try {
      const phones = conversations.map(c => c.phone).filter(Boolean);

      // 1. Exclui de chat_conversations e chat_messages (relacional)
      try {
        if (phones.length > 0) {
          await supabase.from('chat_conversations').delete().in('phone', phones);
          await supabase.from('chat_messages').delete().in('phone', phones);
        }
        await supabase.from('chat_conversations').delete().neq('phone', '');
        await supabase.from('chat_messages').delete().neq('phone', '');
      } catch (relErr) {
        console.warn('Aviso delete all relacional:', relErr);
      }

      // 2. Exclui de settings (fallback)
      try {
        if (phones.length > 0) {
          const settingsKeys = phones.map(p => `chat_conversation_${p}`);
          await supabase.from('settings').delete().in('key', settingsKeys);
        }
        await supabase.from('settings').delete().like('key', 'chat_conversation_%');
      } catch (setErr) {
        console.warn('Aviso delete all settings:', setErr);
      }

      // 3. Limpa estados locais
      setConversations([]);
      setSelectedPhone(null);
      setActiveMessages([]);

      // 4. Recalcula métricas
      fetchDailyMetrics();
    } catch (err) {
      console.error('Erro ao excluir todas as conversas:', err);
      alert('Erro ao excluir todas as conversas.');
    } finally {
      setDeletingAll(false);
    }
  };

  const selectedConversation = useMemo(() => {
    return conversations.find(c => c.phone === selectedPhone);
  }, [conversations, selectedPhone]);

  const filteredConversations = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    return conversations.filter(c => {
      const matchesSearch = !term || (c.name || '').toLowerCase().includes(term) || (c.phone || '').includes(term);
      if (!matchesSearch) return false;
      if (conversationFilter === 'manual') return c.paused;
      if (conversationFilter === 'ai') return !c.paused;
      return true;
    });
  }, [conversations, searchTerm, conversationFilter]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3">
        <Loader2 className="w-7 h-7 animate-spin text-amber-500" />
        <span className="text-xs font-mono text-stone-500">Sincronizando com a Jéssica...</span>
      </div>
    );
  }

  return (
    <div className="space-y-2.5 max-w-7xl">
      {/* Topo / Painel de Comando da Atendente Virtual */}
      <div className="bg-white rounded-xl border border-stone-200/90 shadow-2xs px-4 py-2.5 sm:px-5 sm:py-3 flex flex-wrap items-center justify-between gap-3">
        {/* Identificação de Alto Impacto da IA */}
        <div className="flex items-center gap-3">
          <div className={`relative w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center shrink-0 transition-all ${
            isActive 
              ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/30 ring-2 ring-emerald-500/10' 
              : 'bg-amber-500/10 text-amber-600 border border-amber-500/30 ring-2 ring-amber-500/10'
          }`}>
            <Bot size={22} className={updating ? "animate-pulse" : ""} />
            <span 
              className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full ring-2 ring-white flex items-center justify-center ${
                isActive ? 'bg-emerald-500' : 'bg-amber-500'
              }`} 
              title={isActive ? "IA Conectada e Operando" : "IA Pausada"}
            >
              {isActive && (
                <span className="w-full h-full rounded-full bg-emerald-400 animate-ping opacity-75" />
              )}
            </span>
          </div>

          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-base sm:text-lg font-black text-stone-900 tracking-tight leading-none font-sans">
                Jéssica
              </h2>
              <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full border transition-all ${
                isActive 
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300' 
                  : 'bg-amber-50 text-amber-900 border-amber-300'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
                {isActive ? 'Operação Ativa' : 'Pausada • Modo Manual'}
              </span>
            </div>
            <p className="text-[11px] text-stone-500 mt-1 flex flex-wrap items-center gap-1.5 font-sans">
              <span>Atendente Virtual Oficial do WhatsApp</span>
              <span className="text-stone-300">•</span>
              <span className="font-mono text-stone-600 font-medium">{conversations.length} {conversations.length === 1 ? 'conversa' : 'conversas'}</span>
              {lastUpdated && (
                <>
                  <span className="text-stone-300">•</span>
                  <span className="text-stone-400 font-mono text-[10px]">Sincronizado às {lastUpdated}</span>
                </>
              )}
            </p>
          </div>
        </div>

        {/* Controles de Autoridade */}
        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <button
            type="button"
            onClick={() => setShowMetricsDashboard(prev => !prev)}
            className={`min-h-[34px] px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer border ${
              showMetricsDashboard
                ? 'bg-[#083d07] text-white border-[#083d07] shadow-2xs'
                : 'bg-stone-50 hover:bg-stone-100 text-stone-700 border-stone-200'
            }`}
            title="Exibir ou ocultar telemetria de atendimento"
          >
            <TrendingUp size={14} className={showMetricsDashboard ? "text-amber-400" : "text-stone-500"} />
            <span>Telemetria</span>
            {showMetricsDashboard ? <ChevronUp size={13} className="text-stone-400" /> : <ChevronDown size={13} className="text-stone-400" />}
          </button>

          <button
            type="button"
            onClick={toggleBot}
            disabled={updating}
            className={`min-h-[34px] px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs disabled:opacity-60 ${
              isActive 
                ? 'bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200/90 hover:border-rose-300' 
                : 'bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-600 text-white shadow-emerald-600/25 shadow-xs ring-2 ring-emerald-500/20'
            }`}
          >
            <Power size={14} className={updating ? "animate-spin" : ""} />
            {updating 
              ? 'Gravando...' 
              : (isActive ? 'Pausar Atendimento' : 'Ativar Atendimento')}
          </button>
        </div>
      </div>

      {/* Seletor da Chave PIX Ativa no Atendimento */}
      <div className="bg-white rounded-xl border border-stone-200/90 shadow-2xs p-3 sm:p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#E8D8D1] border border-[#D5AF7A]/60 text-[#083D07] flex items-center justify-center shrink-0">
            <CreditCard size={16} />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-stone-900 font-sans">Chave PIX Oficial do Atendimento</span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#F6E3DF] text-[#44210F] border border-[#E4C5B9] font-semibold">
                Enviada nos Pedidos
              </span>
            </div>
            <p className="text-[11px] text-stone-500">
              Chave PIX cadastrada: Telefone da pizzaria para pagamentos no WhatsApp.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="flex-1 sm:flex-initial px-4 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-2 bg-[#E8D8D1] text-[#083D07] border border-[#D5AF7A] shadow-2xs font-bold">
            <span className="w-2 h-2 rounded-full bg-[#083D07] animate-pulse" />
            <span>Chave PIX (Telefone): (41) 99598-4072</span>
          </div>
        </div>
      </div>

      {/* Telemetria de Atendimento e Desempenho Hoje */}
      {showMetricsDashboard && (
        <div className="bg-white rounded-xl border border-stone-200/90 shadow-2xs p-3 sm:p-3.5 space-y-2.5 animate-in fade-in duration-200">
          <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-stone-100">
            <div className="flex items-center gap-1.5">
              <Sparkles size={14} className="text-amber-500 shrink-0" />
              <h3 className="font-bold text-[11px] uppercase tracking-wider text-stone-800 font-sans">
                Telemetria de Atendimento no WhatsApp
              </h3>
              <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-300/80">
                Hoje
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setShowLearningDrawer(prev => !prev)}
                className={`text-[11px] font-semibold flex items-center gap-1 px-2.5 py-1 rounded-md border transition-all cursor-pointer ${
                  showLearningDrawer
                    ? 'bg-amber-500 text-stone-950 border-amber-500 shadow-2xs font-bold'
                    : 'bg-stone-50 hover:bg-amber-50/80 text-stone-700 hover:text-amber-900 border-stone-200'
                }`}
              >
                <span>💡 Regras ({showLearningDrawer ? 'Ocultar' : 'Ver'})</span>
              </button>
              <button
                type="button"
                onClick={fetchDailyMetrics}
                disabled={loadingMetrics}
                className="text-[11px] font-medium text-stone-600 hover:text-stone-900 flex items-center gap-1 px-2 py-1 rounded-md border border-stone-200 hover:bg-stone-50 transition-colors cursor-pointer"
                title="Recalcular métricas de hoje"
              >
                <RefreshCw size={11} className={loadingMetrics ? "animate-spin text-amber-600" : "text-stone-500"} />
                <span>Atualizar</span>
              </button>
            </div>
          </div>

          {/* Grid de 3 Métricas Bolder de Alto Contraste */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3 divide-y sm:divide-y-0 sm:divide-x divide-stone-100">
            {/* Métrica 1: Clientes Hoje */}
            <div className="pt-0.5 sm:pt-0 sm:px-2.5 first:pl-0">
              <div className="flex items-center justify-between text-stone-500 text-xs mb-0.5">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-stone-500 font-sans">Clientes Atendidos</span>
                <Users size={14} className="text-stone-400" />
              </div>
              <div className="text-lg sm:text-xl font-bold font-sans text-stone-900 tracking-tight leading-none mt-0.5">
                {metrics.totalConversationsToday}
              </div>
              <div className="text-xs text-stone-500 mt-1 flex flex-wrap items-center gap-1 font-sans">
                <span className="inline-flex items-center gap-0.5 font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200/80 px-1.5 py-0.5 rounded text-[10px]">
                  <Bot size={10} className="text-emerald-600" /> {metrics.aiHandledConversations} pela IA
                </span>
                <span className="inline-flex items-center gap-0.5 font-semibold text-amber-800 bg-amber-50 border border-amber-200/80 px-1.5 py-0.5 rounded text-[10px]">
                  <User size={10} className="text-amber-600" /> {metrics.humanHandledConversations} manual
                </span>
              </div>
            </div>

            {/* Métrica 2: Mensagens Trocadas */}
            <div className="pt-2 sm:pt-0 sm:px-2.5">
              <div className="flex items-center justify-between text-stone-500 text-xs mb-0.5">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-stone-500 font-sans">Volume de Mensagens</span>
                <MessageSquare size={14} className="text-stone-400" />
              </div>
              <div className="text-lg sm:text-xl font-bold font-sans text-stone-900 tracking-tight leading-none mt-0.5">
                {metrics.totalClientMessages + metrics.totalBotMessages + metrics.totalHumanMessages}
              </div>
              <div className="text-xs text-stone-500 mt-1 flex flex-wrap items-center gap-1 font-sans">
                <span className="inline-flex items-center gap-0.5 font-semibold text-sky-800 bg-sky-50 border border-sky-200/80 px-1.5 py-0.5 rounded text-[10px]">
                  {metrics.totalClientMessages} de clientes
                </span>
                <span className="inline-flex items-center gap-0.5 font-semibold text-stone-700 bg-stone-100 border border-stone-200/80 px-1.5 py-0.5 rounded text-[10px]">
                  {metrics.totalBotMessages + metrics.totalHumanMessages} da pizzaria
                </span>
              </div>
            </div>

            {/* Métrica 3: Agilidade */}
            <div className="pt-2 sm:pt-0 sm:px-2.5">
              <div className="flex items-center justify-between text-stone-500 text-xs mb-0.5">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-stone-500 font-sans">Agilidade da Resposta</span>
                <Clock size={14} className="text-emerald-500" />
              </div>
              <div className="text-lg sm:text-xl font-bold font-sans text-emerald-600 tracking-tight leading-none mt-0.5">
                {metrics.avgResponseTimeSec > 0 ? `${metrics.avgResponseTimeSec}s` : '< 5s'}
              </div>
              <div className="text-xs text-stone-500 mt-1 flex items-center gap-1 font-sans">
                <span className="inline-flex items-center gap-0.5 font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200/80 px-1.5 py-0.5 rounded text-[10px]">
                  ⚡ Resposta Instantânea
                </span>
              </div>
            </div>
          </div>

          {/* Drawer de Diretrizes Oficiais (Cromaticamente Estruturado) */}
          {showLearningDrawer && (
            <div className="bg-amber-500/5 rounded-xl p-3 border border-amber-500/20 space-y-2 animate-in fade-in duration-150 max-h-48 overflow-y-auto">
              <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900 uppercase tracking-wide">
                <Sparkles size={13} className="text-amber-600" />
                <span>Diretrizes e Regras Operacionais da Jéssica</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-stone-700">
                <div className="p-2.5 rounded-lg bg-[#F6E3DF]/60 border border-[#E4C5B9] shadow-2xs flex gap-2.5 text-stone-700">
                  <div className="w-7 h-7 rounded-md bg-[#E8D8D1] text-[#083D07] border border-[#D5AF7A]/60 flex items-center justify-center shrink-0 shadow-2xs">
                    <CreditCard size={14} />
                  </div>
                  <div>
                    <span className="font-bold text-emerald-950 block mb-0.5 text-[11px]">Pagamento Oficial</span>
                    <p className="text-[11px] leading-snug">Aceitar exclusivamente <strong>PIX ({formattedActivePix})</strong>, <strong>Cartão (Débito/Crédito)</strong> ou <strong>Dinheiro</strong>.</p>
                  </div>
                </div>

                <div className="p-2.5 rounded-lg bg-amber-50/70 border border-amber-200/90 shadow-2xs flex gap-2.5 text-stone-700">
                  <div className="w-7 h-7 rounded-md bg-amber-500 text-stone-950 flex items-center justify-center shrink-0 shadow-2xs font-bold">
                    <Coins size={14} />
                  </div>
                  <div>
                    <span className="font-bold text-amber-950 block mb-0.5 text-[11px]">Troco Inteligente em Dinheiro</span>
                    <p className="text-[11px] leading-snug">Ao optar por dinheiro, a IA sempre questiona se o cliente tem o valor exato ou precisa de troco para nota específica (ex: R$ 50, R$ 100).</p>
                  </div>
                </div>

                <div className="p-2.5 rounded-lg bg-sky-50/70 border border-sky-200/90 shadow-2xs flex gap-2.5 text-stone-700">
                  <div className="w-7 h-7 rounded-md bg-sky-600 text-white flex items-center justify-center shrink-0 shadow-2xs">
                    <CheckCircle2 size={14} />
                  </div>
                  <div>
                    <span className="font-bold text-sky-950 block mb-0.5 text-[11px]">Cardápio & Bebidas</span>
                    <p className="text-[11px] leading-snug">Disponíveis Coca-Cola 1L (Normal e Zero), sucos, refrigerantes e águas.</p>
                  </div>
                </div>

                <div className="p-2.5 rounded-lg bg-purple-50/70 border border-purple-200/90 shadow-2xs flex gap-2.5 text-stone-700">
                  <div className="w-7 h-7 rounded-md bg-purple-600 text-white flex items-center justify-center shrink-0 shadow-2xs">
                    <Clock size={14} />
                  </div>
                  <div>
                    <span className="font-bold text-purple-950 block mb-0.5 text-[11px]">Prazos de Entrega</span>
                    <p className="text-[11px] leading-snug">Avisar prontamente o cliente assim que o pedido entrar no forno ou sair para entrega (prazo estimado: até 60min).</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Espelho de Conversas estilo WhatsApp Command Center */}
      <div className="bg-white rounded-xl border border-stone-200 shadow-2xs overflow-hidden flex flex-col md:flex-row h-[520px] sm:h-[550px] lg:h-[570px] xl:h-[600px] min-h-[460px]">
        {/* Coluna Esquerda: Lista de Conversas (Em mobile, oculta quando conversa está aberta) */}
        <div className={`w-full md:w-60 lg:w-64 xl:w-72 shrink-0 border-r border-stone-200 flex-col h-full bg-stone-50/40 ${selectedPhone ? 'hidden md:flex' : 'flex'}`}>
          {/* Busca & Filtros com Layout Estruturado */}
          <div className="p-2.5 border-b border-stone-200 bg-white shrink-0 space-y-1.5">
            <div className="relative">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-stone-400" />
              <input
                type="text"
                placeholder="Buscar cliente ou telefone..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-7 pr-7 py-1.5 text-xs bg-stone-100/80 rounded-lg border border-transparent focus:border-amber-400 focus:ring-2 focus:ring-amber-500/20 focus:bg-white focus:outline-none transition-all placeholder:text-stone-400 font-sans"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 p-0.5 rounded-full hover:bg-stone-200 transition-colors cursor-pointer"
                  title="Limpar busca"
                >
                  <X size={12} />
                </button>
              )}
            </div>

            {/* Filtros Segmentados de Conversas */}
            <div className="flex items-center gap-0.5 p-0.5 bg-stone-100/80 rounded-lg">
              <button
                type="button"
                onClick={() => setConversationFilter('all')}
                className={`flex-1 py-0.5 px-1 rounded text-[10px] sm:text-[11px] font-semibold transition-all cursor-pointer ${
                  conversationFilter === 'all'
                    ? 'bg-white text-stone-900 shadow-2xs font-bold'
                    : 'text-stone-500 hover:text-stone-800'
                }`}
              >
                Todas ({conversations.length})
              </button>
              <button
                type="button"
                onClick={() => setConversationFilter('ai')}
                className={`flex-1 py-0.5 px-1 rounded text-[10px] sm:text-[11px] font-semibold transition-all cursor-pointer ${
                  conversationFilter === 'ai'
                    ? 'bg-white text-emerald-800 shadow-2xs font-bold'
                    : 'text-stone-500 hover:text-stone-800'
                }`}
              >
                IA ({conversations.filter(c => !c.paused).length})
              </button>
              <button
                type="button"
                onClick={() => setConversationFilter('manual')}
                className={`flex-1 py-0.5 px-1 rounded text-[10px] sm:text-[11px] font-semibold transition-all cursor-pointer ${
                  conversationFilter === 'manual'
                    ? 'bg-white text-amber-900 shadow-2xs font-bold'
                    : 'text-stone-500 hover:text-stone-800'
                }`}
              >
                Manual ({conversations.filter(c => c.paused).length})
              </button>
            </div>

            <div className="flex items-center justify-between px-0.5">
              <span className="text-[10px] font-medium text-stone-500">
                {filteredConversations.length} {filteredConversations.length === 1 ? 'conversa' : 'conversas'}
              </span>
              {conversations.length > 0 && (
                <button
                  type="button"
                  onClick={deleteAllConversations}
                  disabled={deletingAll}
                  className="text-[10px] font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 px-1.5 py-0.5 rounded flex items-center gap-1 transition-colors cursor-pointer disabled:opacity-50"
                  title="Excluir todas as conversas do histórico"
                >
                  <Trash2 size={10} className={deletingAll ? "animate-spin" : ""} />
                  <span>{deletingAll ? 'Excluindo...' : 'Limpar'}</span>
                </button>
              )}
            </div>
          </div>

          {/* Lista de Contatos com Destaque de Estados */}
          <div className="flex-1 overflow-y-auto divide-y divide-stone-100">
            {loadingConversations ? (
              <div className="p-8 text-center text-xs font-mono text-stone-400 flex flex-col items-center gap-2">
                <Loader2 size={18} className="animate-spin text-amber-500" />
                Sincronizando conversas...
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="p-8 text-center text-xs text-stone-400">
                Nenhuma conversa encontrada.
              </div>
            ) : (
              filteredConversations.map(c => {
                const isSelected = selectedPhone === c.phone;
                const isPizzeriaName = c.name && c.name.toLowerCase().includes("dobro pizza");
                const displayName = (!c.name || isPizzeriaName) ? (c.phone || 'Cliente') : c.name;
                return (
                  <button
                    key={c.phone}
                    onClick={() => setSelectedPhone(c.phone)}
                    className={`w-full text-left p-2.5 transition-all flex items-start gap-2.5 cursor-pointer ${
                      isSelected 
                        ? 'bg-amber-500/10 border-l-4 border-amber-500 shadow-2xs' 
                        : 'hover:bg-stone-100/60 bg-white'
                    }`}
                  >
                    <div className="relative w-8 h-8 rounded-full bg-stone-100 text-stone-700 flex items-center justify-center font-bold text-xs shrink-0 border border-stone-200 mt-0.5">
                      {displayName ? displayName.charAt(0).toUpperCase() : <User size={13} />}
                      <span 
                        className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full ring-2 ring-white ${c.paused ? 'bg-amber-500' : 'bg-emerald-500'}`} 
                        title={c.paused ? "IA Pausada neste chat (Intervenção Manual)" : "IA Respondendo"}
                      />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <span className="font-bold text-xs text-stone-900 truncate">
                          {displayName}
                        </span>
                        <div className="flex items-center gap-1 shrink-0">
                          <span className="text-[10px] font-mono text-stone-400">
                            {c.updated_at ? new Date(c.updated_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : ''}
                          </span>
                          <button
                            type="button"
                            onClick={(e) => deleteConversation(e, c.phone)}
                            className="text-stone-300 hover:text-rose-500 hover:bg-rose-50 p-1 rounded transition-colors"
                            title="Excluir conversa"
                          >
                            <X size={12} />
                          </button>
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-2">
                        <div className="text-xs text-stone-500 truncate leading-snug flex items-center gap-1 min-w-0">
                          {c.last_sender === 'bot' && <span className="text-emerald-700 font-bold shrink-0">IA: </span>}
                          {c.last_sender === 'human' && <span className="text-sky-700 font-bold shrink-0">Você: </span>}
                          {c.last_message && (c.last_message.startsWith('📷') || c.last_message.includes('[FOTO:') || c.last_message.includes('[Foto')) ? (
                            <span className="inline-flex items-center gap-1 text-emerald-800 bg-emerald-50/80 px-1.5 py-0.5 rounded border border-emerald-200/50 text-[11px] font-medium truncate">
                              <ImageIcon size={11} className="shrink-0 text-emerald-600" />
                              <span className="truncate">{c.last_message.replace(/^\[(?:FOTO:[^\]]+\]\s*|Foto\/Comprovante[^\]]*\]\s*)/i, '').trim() || 'Foto / Comprovante'}</span>
                            </span>
                          ) : c.last_message && (c.last_message.startsWith('🎵') || c.last_message.includes('[AUDIO:') || c.last_message.includes('voz]')) ? (
                            <span className="inline-flex items-center gap-1 text-amber-800 bg-amber-50/80 px-1.5 py-0.5 rounded border border-amber-200/50 text-[11px] font-medium truncate">
                              <Music size={11} className="shrink-0 text-amber-600" />
                              <span className="truncate">Mensagem de voz</span>
                            </span>
                          ) : c.last_message && (c.last_message.startsWith('🎭') || c.last_message.startsWith('🏷️') || c.last_message.includes('[FIGURINHA:') || c.last_message.includes('Figurinha')) ? (
                            <span className="inline-flex items-center gap-1 text-purple-800 bg-purple-50/80 px-1.5 py-0.5 rounded border border-purple-200/50 text-[11px] font-medium truncate">
                              <span className="text-xs shrink-0">🎭</span>
                              <span className="truncate">Figurinha</span>
                            </span>
                          ) : c.last_message && (c.last_message.startsWith('📄') || c.last_message.includes('[DOC:')) ? (
                            <span className="inline-flex items-center gap-1 text-sky-800 bg-sky-50/80 px-1.5 py-0.5 rounded border border-sky-200/50 text-[11px] font-medium truncate">
                              <FileText size={11} className="shrink-0 text-sky-600" />
                              <span className="truncate">Documento</span>
                            </span>
                          ) : (
                            <span className="truncate">{c.last_message || 'Iniciou conversa'}</span>
                          )}
                        </div>
                        {c.paused && (
                          <span className="shrink-0 text-[10px] font-sans font-bold px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-900 border border-amber-400/40">
                            Manual
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Coluna Direita: Painel do Chat ou Empty State Produtivo */}
        {selectedConversation ? (
          <div className={`flex-1 flex-col h-full min-w-0 bg-[#efeae2] ${selectedPhone ? 'flex' : 'hidden md:flex'}`}>
            {/* Topo do Chat Selecionado com Controle Imediato */}
            {(() => {
              const isHeaderPizzeriaName = selectedConversation.name && selectedConversation.name.toLowerCase().includes("dobro pizza");
              const headerDisplayName = (!selectedConversation.name || isHeaderPizzeriaName) ? (selectedConversation.phone || 'Cliente') : selectedConversation.name;
              return (
                <div className="px-3 sm:px-4 py-3 bg-white border-b border-stone-200 flex items-center justify-between gap-2 sm:gap-3 shrink-0">
                  <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                    {/* Botão de Retorno Mobile */}
                    <button
                      type="button"
                      onClick={() => setSelectedPhone(null)}
                      className="md:hidden p-2 -ml-1 text-stone-600 hover:text-stone-900 hover:bg-stone-100 rounded-xl transition-colors cursor-pointer shrink-0 active:scale-95"
                      title="Voltar para a lista de conversas"
                    >
                      <ArrowLeft size={18} />
                    </button>
                    <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-stone-100 text-stone-700 flex items-center justify-center font-bold text-xs shrink-0 border border-stone-200">
                      {headerDisplayName ? headerDisplayName.charAt(0).toUpperCase() : <User size={14} />}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <h3 className="font-bold text-sm text-stone-900 truncate">
                          {headerDisplayName}
                        </h3>
                        <div className="flex items-center gap-1.5">
                          <a
                            href={`https://wa.me/${selectedConversation.phone.replace(/\D/g, '')}`}
                            target="_blank"
                            rel="noreferrer"
                            className="text-xs font-mono font-medium text-emerald-800 hover:text-emerald-950 bg-emerald-50 hover:bg-emerald-100/80 border border-emerald-200/80 px-2 py-0.5 rounded-md flex items-center gap-1 transition-colors"
                            title="Abrir no WhatsApp Web"
                          >
                            <span>{selectedConversation.phone}</span>
                            <ArrowUpRight size={11} />
                          </a>
                          <button
                            type="button"
                            onClick={(e) => handleCopyPhone(selectedConversation.phone, e)}
                            className="text-xs font-mono font-medium text-stone-600 hover:text-stone-900 bg-stone-100 hover:bg-stone-200/80 border border-stone-200 px-2 py-0.5 rounded-md flex items-center gap-1 transition-colors cursor-pointer"
                            title="Copiar número de telefone"
                          >
                            {copiedPhone ? (
                              <>
                                <Check size={11} className="text-emerald-600" />
                                <span className="text-emerald-700 font-semibold">Copiado!</span>
                              </>
                            ) : (
                              <>
                                <Copy size={11} className="text-stone-500" />
                                <span>Copiar</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                      {selectedConversation.paused && (
                        <div className="flex items-center gap-1.5 text-xs text-amber-800">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                          <span className="font-semibold text-[11px]">Atendimento Manual Ativo</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Botão de Alternância de Pausa com Convencimento */}
                  <button
                    type="button"
                    onClick={() => toggleChatPause(selectedConversation.phone, Boolean(selectedConversation.paused))}
                    disabled={togglingChatPause}
                    className={`min-h-[36px] px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs ${
                      selectedConversation.paused
                        ? 'bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-600 text-white shadow-emerald-600/20'
                        : 'bg-stone-100 hover:bg-amber-50 text-stone-700 hover:text-amber-900 border border-stone-200 hover:border-amber-300'
                    }`}
                    title={selectedConversation.paused ? "Retomar respostas automáticas da IA neste chat" : "Pausar IA neste chat para intervir manualmente"}
                  >
                    {selectedConversation.paused ? (
                      <>
                        <PlayCircle size={15} className="text-white shrink-0" />
                        <span>Retomar IA</span>
                      </>
                    ) : (
                      <>
                        <PauseCircle size={15} className="text-stone-500 shrink-0" />
                        <span>Pausar IA (Intervir)</span>
                      </>
                    )}
                  </button>
                </div>
              );
            })()}

            {/* Mensagens com Balões Padrão WhatsApp (Compacto & Legível) */}
            <div className="flex-1 p-3.5 sm:p-4 overflow-y-auto space-y-2 relative" style={{ backgroundImage: 'url("https://web.whatsapp.com/img/bg-chat-tile-dark_a4be512e7195b6b733d9110b408f075d.png")', opacity: 0.95 }}>
              {loadingMessages ? (
                <div className="h-full flex flex-col items-center justify-center gap-2 text-stone-400 relative z-10">
                  <Loader2 size={20} className="animate-spin text-amber-500" />
                  <span className="text-xs font-mono">Carregando mensagens...</span>
                </div>
              ) : activeMessages && activeMessages.length > 0 ? (
                activeMessages.map((m, idx) => {
                  const isClient = m.sender === 'client';
                  const isBot = m.sender === 'bot';
                  const isHuman = m.sender === 'human';
                  const parsed = parseMessageContent(m.text, m.media_url, m.media_type, m.caption);
                  const isSticker = parsed.mediaType === 'sticker';

                  return (
                    <div
                      key={m.id || idx}
                      className={`flex flex-col ${isClient ? 'items-start' : 'items-end'}`}
                    >
                      <div
                        className={`relative max-w-[88%] sm:max-w-[72%] lg:max-w-[65%] ${
                          isSticker
                            ? 'bg-transparent shadow-none p-0'
                            : `rounded-xl px-3.5 pt-2 pb-1.5 text-xs sm:text-[13px] leading-relaxed shadow-xs ${
                                isClient
                                  ? 'bg-white text-stone-900 rounded-tl-xs border border-stone-200/60 shadow-xs'
                                  : (isHuman 
                                      ? 'bg-[#e0f2fe] text-stone-950 rounded-tr-xs border border-sky-200/70 shadow-xs'
                                      : 'bg-[#dcf8c6] text-stone-950 rounded-tr-xs border border-emerald-200/60 shadow-xs')
                              }`
                        }`}
                      >
                        {/* Nome do remetente interno */}
                        {!isClient && !isSticker && (
                          <div className={`text-[11px] font-bold mb-1 leading-none ${isBot ? 'text-emerald-700' : 'text-sky-700'}`}>
                            {isBot ? 'Jéssica' : 'Você (Atendente)'}
                          </div>
                        )}
                        {isClient && !isSticker && selectedConversation.name && (
                          <div className="text-[11px] font-bold mb-1 leading-none text-[#a80076]">
                            {selectedConversation.name}
                          </div>
                        )}

                        {/* Selo especial para comprovantes de pagamento / PIX */}
                        {parsed.isReceipt && (
                          <div className="inline-flex items-center gap-1.5 px-3 py-1 mb-2 rounded-lg bg-[#E8D8D1] text-[#083D07] border border-[#D5AF7A] text-xs font-bold shadow-xs">
                            <ShieldCheck size={14} className="text-white shrink-0" />
                            <span>Comprovante de Pagamento PIX</span>
                          </div>
                        )}

                        {/* Renderização de Imagem / Foto / Comprovante */}
                        {parsed.mediaType === 'image' && (
                          <div className="my-1">
                            {parsed.mediaUrl ? (
                              <div 
                                onClick={() => setSelectedImage({
                                  url: parsed.mediaUrl!,
                                  caption: parsed.caption || undefined,
                                  sender: isClient ? (selectedConversation.name || 'Cliente') : (isBot ? 'Jéssica' : 'Você'),
                                  timestamp: m.timestamp
                                })}
                                className="group relative rounded-lg overflow-hidden cursor-pointer border border-stone-200 bg-stone-100 hover:shadow-md transition-all max-w-[280px]"
                              >
                                <img
                                  src={parsed.mediaUrl}
                                  alt={parsed.caption || "Foto recebida"}
                                  className="w-full max-h-60 object-cover select-none group-hover:scale-[1.02] transition-transform duration-200"
                                  loading="lazy"
                                  decoding="async"
                                />
                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                                  <span className="opacity-0 group-hover:opacity-100 transition-opacity bg-black/75 text-white text-xs font-semibold px-2.5 py-1 rounded-full flex items-center gap-1.5 shadow-sm backdrop-blur-xs">
                                    <ZoomIn size={12} />
                                    Ver comprovante
                                  </span>
                                </div>
                              </div>
                            ) : (
                              <div className="p-3 rounded-lg bg-stone-50 border border-stone-200 flex items-center gap-2.5 text-stone-600 text-xs">
                                <ImageIcon size={20} className="text-stone-400 shrink-0" />
                                <div>
                                  <div className="font-bold text-xs text-stone-700">Foto / Comprovante</div>
                                  <div className="text-[11px] text-stone-400">Recebido via WhatsApp</div>
                                </div>
                              </div>
                            )}

                            {/* Legenda da imagem se houver */}
                            {parsed.caption && (
                              <div className="mt-1.5 text-xs whitespace-pre-wrap leading-relaxed text-stone-800">
                                {parsed.caption}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Renderização de Áudio / Mensagem de Voz */}
                        {parsed.mediaType === 'audio' && (
                          <div className="my-1 p-2.5 rounded-xl bg-emerald-50 border border-emerald-200/80 flex flex-col gap-1.5 min-w-[240px] max-w-full shadow-2xs">
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-2xs">
                                <Music size={14} />
                              </div>
                              <span className="text-xs font-bold text-emerald-900">Mensagem de voz</span>
                            </div>
                            {parsed.mediaUrl ? (
                              <audio controls preload="metadata" className="w-full h-8 mt-1 accent-emerald-600" src={parsed.mediaUrl} />
                            ) : (
                              <span className="text-xs text-stone-500 italic">Áudio recebido via WhatsApp</span>
                            )}
                          </div>
                        )}

                        {/* Renderização de Documento / PDF */}
                        {parsed.mediaType === 'document' && (
                          <div className="my-1 p-2.5 rounded-lg bg-stone-50 border border-stone-200 flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2 min-w-0">
                              <FileText size={20} className="text-sky-600 shrink-0" />
                              <span className="text-xs font-medium text-stone-800 truncate">{parsed.displayText}</span>
                            </div>
                            {parsed.mediaUrl && (
                              <a
                                href={parsed.mediaUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="text-sky-700 hover:text-sky-900 p-1.5 hover:bg-sky-50 rounded-lg transition-colors"
                                title="Baixar documento"
                              >
                                <Download size={14} />
                              </a>
                            )}
                          </div>
                        )}

                        {/* Renderização de Figurinha (Sticker) */}
                        {parsed.mediaType === 'sticker' && (
                          <div className="relative group my-0.5">
                            {parsed.mediaUrl ? (
                              <img 
                                src={parsed.mediaUrl} 
                                alt="Figurinha" 
                                className="w-28 h-28 sm:w-32 sm:h-32 object-contain select-none drop-shadow-md hover:scale-105 transition-transform" 
                                loading="lazy"
                              />
                            ) : (
                              <div className="p-3 rounded-xl bg-white border border-stone-200 flex items-center gap-2 shadow-xs">
                                <span className="text-base">🎭</span>
                                <span className="text-xs font-medium text-stone-700">Figurinha WhatsApp</span>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Renderização de Texto Simples */}
                        {parsed.mediaType === 'text' && (
                          <div className="whitespace-pre-wrap">{parsed.displayText}</div>
                        )}

                        {/* Horário e Confirmação de Leitura */}
                        <div className={`text-[10px] text-stone-500 text-right mt-1 -mb-0.5 flex items-center justify-end gap-1 ${
                          isSticker
                            ? 'bg-white/90 backdrop-blur-xs px-2 py-0.5 rounded-full shadow-2xs font-mono ml-auto'
                            : (parsed.displayText.length < 24 && parsed.mediaType === 'text' ? 'inline-block ml-3 translate-y-0.5' : 'block')
                        }`}>
                          <span>{m.timestamp ? new Date(m.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : ''}</span>
                          {!isClient && (
                            <CheckCheck size={13} className="text-emerald-600 inline shrink-0 -translate-y-0.2" />
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="h-full flex items-center justify-center relative z-10">
                  <div className="bg-white/95 text-stone-700 border border-stone-200 px-4 py-3 rounded-xl text-xs shadow-xs max-w-sm text-center">
                    Nenhuma mensagem registrada. As mensagens enviadas ou recebidas para este contato aparecerão aqui em tempo real.
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Barra de Respostas Rápidas de 1 Clique (Compacta sem rolagem lateral) */}
            <div className="px-3 py-1.5 bg-stone-50 border-t border-stone-200 flex items-center gap-1 sm:gap-1.5 flex-wrap shrink-0">
              <span className="text-[10px] font-bold text-stone-500 uppercase tracking-wider shrink-0 mr-0.5 flex items-center gap-1 font-sans">
                <Sparkles size={11} className="text-amber-500" /> Rápidas:
              </span>
              {[
                { label: '🍕 No Forno', text: 'Seu pedido já está no forno e logo sai para entrega!' },
                { label: '🛵 Saiu p/ Entrega', text: 'Seu pedido acabou de sair com o estafeta para entrega!' },
                { label: '🪙 Precisa de Troco?', text: 'Com certeza! Você tem o valor exato ou precisa de troco para alguma nota (ex: € 20, € 50)?' },
                { label: '✅ PIX Confirmado', text: 'Confirmamos o recebimento do seu PIX com sucesso! Muito obrigado!' },
                { label: '💳 Chave PIX', text: `Nossa chave PIX oficial (telefone) é: ${formattedActivePix}` }
              ].map((qr, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setManualMessage(qr.text)}
                  className="px-2 py-0.5 rounded-md text-[10.5px] font-medium bg-white hover:bg-amber-50 hover:text-amber-900 hover:border-amber-300 text-stone-700 border border-stone-200 transition-all cursor-pointer active:scale-95 shadow-2xs font-sans whitespace-nowrap"
                  title={`Inserir no campo: "${qr.text}"`}
                >
                  {qr.label}
                </button>
              ))}
            </div>

            {/* Input de Envio de Mensagem Manual */}
            <form onSubmit={sendManualMessage} className="p-3 bg-white border-t border-stone-100 flex items-center gap-2 sm:gap-2.5 shrink-0">
              <input
                type="text"
                placeholder={selectedConversation.paused 
                  ? "Digite uma resposta manual para o cliente..." 
                  : "Digite uma resposta (isso pausará a IA)..."}
                value={manualMessage}
                onChange={e => setManualMessage(e.target.value)}
                className="flex-1 px-3.5 sm:px-4 py-2.5 text-base sm:text-xs md:text-sm bg-stone-50 rounded-xl border border-stone-200 focus:border-amber-400 focus:ring-2 focus:ring-amber-500/20 focus:bg-white focus:outline-none transition-all font-sans placeholder:text-stone-400"
              />
              <button
                type="submit"
                disabled={!manualMessage.trim() || sendingManual}
                className="min-h-[42px] px-3.5 sm:px-5 py-2.5 bg-[#083d07] hover:bg-amber-600 text-white rounded-xl text-xs sm:text-sm font-bold flex items-center gap-1.5 sm:gap-2 transition-all disabled:opacity-40 cursor-pointer shadow-xs shrink-0 active:scale-95"
              >
                {sendingManual ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                <span>Enviar</span>
              </button>
            </form>
          </div>
        ) : (
          <div className={`flex-1 flex-col items-center justify-center p-6 sm:p-8 text-center bg-stone-50/40 ${selectedPhone ? 'hidden md:flex' : 'flex'}`}>
            <div className="max-w-md p-8 rounded-2xl bg-white border border-stone-200/90 shadow-xs flex flex-col items-center text-center">
              <div className="w-14 h-14 rounded-2xl bg-amber-500/10 text-amber-600 border border-amber-500/20 flex items-center justify-center mb-4 ring-4 ring-amber-500/5">
                <Bot size={28} />
              </div>
              <h3 className="text-base font-bold text-stone-900 tracking-tight mb-1.5 font-sans">
                Central de Atendimento no WhatsApp
              </h3>
              <p className="text-xs text-stone-500 leading-relaxed mb-5">
                A Jéssica atende clientes, tira dúvidas sobre o cardápio e lança pedidos diretamente no sistema. Selecione qualquer conversa na lista lateral para acompanhar o diálogo em tempo real ou intervir com atendimento manual.
              </p>
              <div className="w-full grid grid-cols-2 gap-2 text-left mb-4">
                <div className="p-3 rounded-xl bg-stone-50 border border-stone-200/80">
                  <span className="text-[10px] font-semibold uppercase text-stone-400 block font-sans">Status Geral</span>
                  <span className="text-xs font-bold text-stone-800 flex items-center gap-1.5 mt-0.5 font-sans">
                    <span className={`w-2 h-2 rounded-full ${isActive ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
                    {isActive ? 'Operação Ativa' : 'Pausada'}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-stone-50 border border-stone-200/80">
                  <span className="text-[10px] font-semibold uppercase text-stone-400 block font-sans">Conversas</span>
                  <span className="text-xs font-bold text-stone-800 mt-0.5 block font-sans">
                    {conversations.length} registradas
                  </span>
                </div>
              </div>

              {/* Dicas de Operação para Picos de Atendimento */}
              <div className="w-full text-left p-3.5 rounded-xl bg-amber-50/50 border border-amber-200/60 text-xs text-stone-600 space-y-1.5">
                <div className="font-bold text-amber-950 flex items-center gap-1.5 text-[11px] uppercase tracking-wide">
                  <Sparkles size={12} className="text-amber-600" />
                  <span>Dicas para o Horário de Pico</span>
                </div>
                <ul className="space-y-1 text-[11px] leading-relaxed text-stone-600 list-disc list-inside">
                  <li><strong>Intervenção rápida:</strong> Digitar e enviar uma mensagem pausa a IA automaticamente.</li>
                  <li><strong>Respostas em 1 clique:</strong> Use os atalhos rápidos de forno, entrega e troco.</li>
                  <li><strong>Comprovantes:</strong> Fotos e PDFs com menção a PIX ganham selo verde destacado.</li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modal Lightbox de Imagem / Comprovante em Tela Cheia */}
      {selectedImage && (
        <div 
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-xs flex flex-col items-center justify-center p-4 transition-all"
          onClick={() => setSelectedImage(null)}
        >
          {/* Barra Superior do Modal */}
          <div 
            className="w-full max-w-4xl flex items-center justify-between text-white pb-3 px-2 shrink-0"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center gap-2 min-w-0">
              <ImageIcon size={18} className="text-emerald-400 shrink-0" />
              <span className="text-sm font-semibold truncate">
                {selectedImage.caption || 'Foto / Comprovante do WhatsApp'}
              </span>
              <span className="text-xs text-stone-400 font-mono shrink-0">
                ({selectedImage.sender} • {selectedImage.timestamp ? new Date(selectedImage.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : ''})
              </span>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {selectedImage.url && !selectedImage.url.startsWith('data:') && (
                <a
                  href={selectedImage.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1.5 rounded-md bg-[#0b520a] hover:bg-stone-700 text-stone-200 hover:text-white transition-colors flex items-center gap-1 text-xs"
                  title="Abrir em nova aba"
                >
                  <ExternalLink size={14} />
                  <span className="hidden sm:inline">Nova Aba</span>
                </a>
              )}
              {selectedImage.url && (
                <a
                  href={selectedImage.url}
                  download={`comprovante_${Date.now()}.jpg`}
                  className="p-1.5 rounded-md bg-[#0b520a] hover:bg-stone-700 text-stone-200 hover:text-white transition-colors flex items-center gap-1 text-xs"
                  title="Baixar imagem"
                >
                  <Download size={14} />
                  <span className="hidden sm:inline">Baixar</span>
                </a>
              )}
              <button
                onClick={() => setSelectedImage(null)}
                className="p-1.5 rounded-md bg-[#0b520a] hover:bg-red-900/80 text-stone-300 hover:text-white transition-colors cursor-pointer"
                title="Fechar (Esc)"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Imagem Ampliada */}
          <div 
            className="relative max-w-4xl max-h-[80vh] flex items-center justify-center overflow-hidden rounded-lg bg-stone-900/45 p-1 border border-[#d3c8bb] shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <img
              src={selectedImage.url}
              alt={selectedImage.caption || "Imagem em tela cheia"}
              className="max-h-[78vh] max-w-full object-contain rounded select-none"
            />
          </div>

          {/* Legenda Inferior */}
          {selectedImage.caption && (
            <div 
              className="mt-3 px-4 py-1.5 bg-[#083d07]/90 text-stone-200 text-xs rounded-full max-w-xl text-center truncate border border-[#0b520a]"
              onClick={e => e.stopPropagation()}
            >
              {selectedImage.caption}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
