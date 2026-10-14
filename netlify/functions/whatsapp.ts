import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '',
  // Server key: this function creates orders and updates customers, which the public key can no longer do
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || ''
);

export default async (req, context) => {
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

  // Validação de Segurança (Bearer Token)
  const authHeader = req.headers.get('authorization') || req.headers.get('Authorization');
  const SECRET_TOKEN = process.env.WHATSAPP_API_TOKEN;

  if (!SECRET_TOKEN || !authHeader || authHeader !== `Bearer ${SECRET_TOKEN}`) {
    return new Response(JSON.stringify({ success: false, message: 'Unauthorized. Invalid Token.' }), { status: 401, headers });
  }

  try {
    const payload = await req.json();

    // 🛡️ Trava Anti-Duplicação Estrita (Idempotência de 10 minutos - Padrão iFood / Multipedidos):
    // Impede que retentativas de webhook, cliques múltiplos ou chamadas repetidas da IA criem comandas duplicadas
    if (payload.customer_phone) {
      const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
      const rawDigits = String(payload.customer_phone).replace(/\D/g, '');
      const lastDigits = rawDigits.length >= 8 ? rawDigits.slice(-8) : rawDigits;

      if (lastDigits.length >= 8) {
        const { data: recentOrders, error: recentErr } = await supabase
          .from('orders')
          .select('id, tracking_code, customer_phone, total_amount, status, created_at')
          .gte('created_at', tenMinutesAgo)
          .order('created_at', { ascending: false })
          .limit(10);

        if (!recentErr && recentOrders && recentOrders.length > 0) {
          const duplicateOrder = recentOrders.find(o => {
            const oDigits = String(o.customer_phone || '').replace(/\D/g, '');
            const samePhone = oDigits.endsWith(lastDigits) || oDigits.includes(lastDigits);
            const st = String(o.status || '').toLowerCase().trim();
            // Qualquer status de pedido ativo não finalizado
            const isActiveOrder = ['pendente', 'preparando', 'em preparo', 'recebido', 'pronto', 'entrega', 'saiu para entrega'].includes(st);
            // Ou se for exatamente o mesmo valor total nos últimos 10 minutos
            const sameAmount = Math.abs((Number(o.total_amount) || 0) - (Number(payload.total_amount) || 0)) < 0.05;
            return samePhone && (isActiveOrder || sameAmount);
          });

          if (duplicateOrder) {
            console.warn(`[Anti-Duplicação 10min] Pedido recente já existente (#${duplicateOrder.id}) para cliente ${payload.customer_phone}. Evitando duplicação.`);
            return new Response(JSON.stringify({
              success: true,
              order_id: duplicateOrder.id,
              tracking_code: duplicateOrder.tracking_code,
              duplicate_prevented: true,
              message: 'Pedido já registrado no gestor com sucesso (proteção anti-duplicação de 10 minutos ativa).'
            }), { status: 200, headers });
          }
        }
      }
    }

    // Buscar sessão de caixa ativa se houver
    const { data: activeSession } = await supabase
      .from('cash_sessions')
      .select('id')
      .eq('status', 'aberto')
      .order('opened_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    // Inserção Direta: Isolada do resto do sistema
    const { data, error } = await supabase.from('orders').insert([{
      cash_session_id: activeSession ? activeSession.id : null,
      customer_name: payload.customer_name,
      customer_phone: payload.customer_phone,
      order_type: payload.order_type,
      payment_method: payload.payment_method,
      status: 'Pendente',
      total_amount: payload.total_amount,
      delivery_address: payload.delivery_address || null,
      delivery_zone: payload.delivery_zone || null,
      change_for: payload.change_for || null,
      notes: payload.notes || null,
      items: payload.items
    }]).select();

    if (error) throw error;

    const newOrder = data?.[0];

    // Atualiza CRM
    if (newOrder && payload.customer_phone) {
      const { data: existingCustomer } = await supabase
        .from('customers')
        .select('id, total_orders, total_spent')
        .eq('phone', payload.customer_phone)
        .maybeSingle();

      if (existingCustomer) {
        await supabase.from('customers').update({
          name: payload.customer_name,
          total_orders: (existingCustomer.total_orders || 0) + 1,
          total_spent: (Number(existingCustomer.total_spent) || 0) + payload.total_amount,
          last_order_at: new Date().toISOString(),
        }).eq('id', existingCustomer.id);
      } else {
        await supabase.from('customers').insert([{
          phone: payload.customer_phone,
          name: payload.customer_name,
          total_orders: 1,
          total_spent: payload.total_amount,
          last_order_at: new Date().toISOString(),
        }]);
      }
    }

    return new Response(JSON.stringify({
      success: true,
      order_id: newOrder.id,
      tracking_code: newOrder.tracking_code
    }), { status: 200, headers });

  } catch (error) {
    console.error('API Error:', error);
    return new Response(JSON.stringify({ success: false, message: error.message }), { status: 500, headers });
  }
};

export const config = {
  path: '/.netlify/functions/whatsapp'
};
