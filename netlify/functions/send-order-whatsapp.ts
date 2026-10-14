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

  try {
    const payload = await req.json();
    const orderId = payload.orderId;
    const message = String(payload.message || '').trim();
    const customerPhone = String(payload.customerPhone || '').replace(/\D/g, '');

    if (!message) {
      return new Response(JSON.stringify({ success: false, message: 'message é obrigatória' }), { status: 400, headers });
    }

    const evolutionUrl = process.env.EVOLUTION_API_URL || 'https://funnyeagle-evolution.cloudfy.live';
    const evolutionApiKey = process.env.EVOLUTION_API_KEY || '1E0FE7D2CCFB-4757-B948-F350F94E227F';
    const instanceName = process.env.EVOLUTION_INSTANCE_NAME || 'agente41menus';
    const pizzeriaPhone = '351938360931';

    // 1. Enviar para o número da pizzaria (garante que a pizzaria recebe o resumo inalterável)
    let puzzeriaResult = null;
    try {
      const evoPizzeriaRes = await fetch(`${evolutionUrl}/message/sendText/${instanceName}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': evolutionApiKey
        },
        body: JSON.stringify({
          number: pizzeriaPhone,
          text: message
        })
      });
      if (evoPizzeriaRes.ok) {
        puzzeriaResult = await evoPizzeriaRes.json();
      }
    } catch (e) {
      console.warn('[AutoSend] Falha ao enviar para o WhatsApp da pizzaria:', e);
    }

    // 2. Se o cliente informou telefone, enviar também para o WhatsApp do cliente
    let customerResult = null;
    let confirmationResult = null;
    let formattedCustomerPhone = customerPhone;
    if (customerPhone) {
      // Se for número de Portugal com 9 dígitos iniciando em 9 ou 2, adicionar DDI 351
      if (customerPhone.length === 9 && (customerPhone.startsWith('9') || customerPhone.startsWith('2'))) {
        formattedCustomerPhone = '351' + customerPhone;
      }

      if (formattedCustomerPhone !== pizzeriaPhone) {
        // 2a. Enviar o resumo do pedido para o cliente
        try {
          const evoCustRes = await fetch(`${evolutionUrl}/message/sendText/${instanceName}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'apikey': evolutionApiKey
            },
            body: JSON.stringify({
              number: formattedCustomerPhone,
              text: message
            })
          });
          if (evoCustRes.ok) {
            customerResult = await evoCustRes.json();
          }
        } catch (e) {
          console.warn('[AutoSend] Falha ao enviar para o WhatsApp do cliente:', e);
        }

        // 2b. Enviar mensagem de confirmação automática para o cliente (após o resumo)
        try {
          // Pequeno delay para garantir que a confirmação chegue após o resumo
          await new Promise(resolve => setTimeout(resolve, 1500));
          const confirmMsg = 'Pedido confirmado, já encaminhamos para cozinha. ✅🍕';
          const evoConfirmRes = await fetch(`${evolutionUrl}/message/sendText/${instanceName}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'apikey': evolutionApiKey
            },
            body: JSON.stringify({
              number: formattedCustomerPhone,
              text: confirmMsg
            })
          });
          if (evoConfirmRes.ok) {
            confirmationResult = await evoConfirmRes.json();
          }
        } catch (e) {
          console.warn('[AutoSend] Falha ao enviar confirmação automática para o cliente:', e);
        }
      }
    }

    return new Response(JSON.stringify({
      success: true,
      orderId,
      pizzeriaSent: !!puzzeriaResult,
      customerSent: !!customerResult,
      confirmationSent: !!confirmationResult,
      pizzeriaPhone,
      customerPhone: formattedCustomerPhone
    }), { status: 200, headers });

  } catch (error: any) {
    console.error('[AutoSend] Erro geral na função:', error);
    return new Response(JSON.stringify({ success: false, message: error.message }), { status: 500, headers });
  }
};

export const config = {
  path: '/.netlify/functions/send-order-whatsapp'
};
