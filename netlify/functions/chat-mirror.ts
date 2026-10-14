import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '',
  // Server key: this function writes chat history, which the public key can no longer do
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || ''
);

export default async (req: Request) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Authorization, Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (req.method === 'OPTIONS') {
    return new Response('', { status: 200, headers });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ success: false, message: 'Method Not Allowed' }), { status: 405, headers });
  }

  // Token de autenticação opcional / de segurança
  const authHeader = req.headers.get('authorization') || req.headers.get('Authorization');
  const SECRET_TOKEN = process.env.WHATSAPP_API_TOKEN;

  if (!SECRET_TOKEN || !authHeader || authHeader !== `Bearer ${SECRET_TOKEN}`) {
    return new Response(JSON.stringify({ success: false, message: 'Unauthorized. Invalid Token.' }), { status: 401, headers });
  }

  try {
    const payload = await req.json();
    const rawPhone = String(payload.phone || payload.customer_phone || '').replace(/\D/g, '');
    const name = String(payload.name || payload.customer_name || 'Cliente');
    const sender = (payload.sender === 'bot' || payload.sender === 'ai') ? 'bot' : (payload.sender === 'human' ? 'human' : 'client');
    const text = String(payload.text || payload.content || '').trim();

    if (!rawPhone || !text) {
      return new Response(JSON.stringify({ success: false, message: 'phone e text são obrigatórios' }), { status: 400, headers });
    }

    const convKey = `chat_conversation_${rawPhone}`;

    // 1. Gravar nas tabelas relacionais dedicadas (chat_conversations e chat_messages)
    try {
      const isAttendant = sender === 'human' || name.toLowerCase().includes('dobro pizza') || name.toLowerCase() === 'você';
      
      const convPayload: any = {
        phone: rawPhone,
        last_message: text,
        last_sender: sender,
        updated_at: new Date().toISOString()
      };

      // Só atualiza o nome se NÃO for atendente e se um nome real tiver sido enviado
      if (!isAttendant && name && name !== 'Cliente') {
        convPayload.name = name;
      }

      await supabase
        .from('chat_conversations')
        .upsert(convPayload, { onConflict: 'phone' });

      // Insert na mensagem individual
      await supabase
        .from('chat_messages')
        .insert({
          phone: rawPhone,
          sender,
          text
        });
    } catch (dbRelErr) {
      console.warn('Aviso tabelas relacionais (usando fallback):', dbRelErr);
    }

    // 2. Buscar histórico atual no settings (fallback de compatibilidade)
    const { data: currentSetting } = await supabase
      .from('settings')
      .select('value')
      .eq('key', convKey)
      .maybeSingle();

    const existingData = currentSetting?.value || {};
    const messages = Array.isArray(existingData.messages) ? existingData.messages : [];

    // Adiciona nova mensagem mantendo limite das últimas 100 mensagens
    const newMessage = {
      id: `${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      sender, // 'client' | 'bot' | 'human'
      text,
      timestamp: new Date().toISOString()
    };

    const updatedMessages = [...messages, newMessage].slice(-100);

    const updatedValue = {
      phone: rawPhone,
      name: existingData.name && existingData.name !== 'Cliente' && !existingData.name.toLowerCase().includes('dobro pizza') ? existingData.name : (!isAttendant && name && name !== 'Cliente' ? name : (existingData.name || 'Cliente')),
      paused: Boolean(existingData.paused ?? false),
      paused_at: existingData.paused_at ?? null,
      last_message: text,
      last_sender: sender,
      updated_at: new Date().toISOString(),
      messages: updatedMessages
    };

    const { error: upsertErr } = await supabase
      .from('settings')
      .upsert({
        key: convKey,
        value: updatedValue,
        updated_at: new Date().toISOString()
      }, { onConflict: 'key' });

    if (upsertErr) console.warn('Erro upsert settings fallback:', upsertErr);

    return new Response(JSON.stringify({
      success: true,
      phone: rawPhone,
      total_messages: updatedMessages.length
    }), { status: 200, headers });

  } catch (error: any) {
    console.error('Chat Mirror API Error:', error);
    return new Response(JSON.stringify({ success: false, message: error.message }), { status: 500, headers });
  }
};

export const config = {
  path: '/.netlify/functions/chat-mirror'
};
