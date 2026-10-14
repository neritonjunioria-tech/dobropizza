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
    const phone = String(payload.phone || '').replace(/\D/g, '');
    const message = String(payload.message || '').trim();

    if (!phone || !message) {
      return new Response(JSON.stringify({ success: false, message: 'phone e message são obrigatórios' }), { status: 400, headers });
    }

    // Dispara para webhook ou Evolution API
    // Se a Evolution API URL estiver configurada:
    // Only DOBRO's own WhatsApp robot (Netlify env). No fallback to any other client's server.
    const evolutionUrl = process.env.EVOLUTION_API_URL;
    const evolutionApiKey = process.env.EVOLUTION_API_KEY;
    const instanceName = process.env.EVOLUTION_INSTANCE_NAME;
    if (!evolutionUrl || !evolutionApiKey || !instanceName) {
      return new Response(JSON.stringify({ success: false, skipped: true, message: 'Envio de WhatsApp não configurado' }), { status: 200, headers });
    }

    let evolutionResult = null;
    try {
      const evoRes = await fetch(`${evolutionUrl}/message/sendText/${instanceName}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': evolutionApiKey
        },
        body: JSON.stringify({
          number: phone,
          text: message
        })
      });
      if (evoRes.ok) {
        evolutionResult = await evoRes.json();
      }
    } catch (e) {
      console.warn('Aviso ao enviar direto na Evolution API:', e);
    }

    return new Response(JSON.stringify({
      success: true,
      phone,
      message,
      evolution: evolutionResult
    }), { status: 200, headers });

  } catch (error: any) {
    console.error('Manual Send API Error:', error);
    return new Response(JSON.stringify({ success: false, message: error.message }), { status: 500, headers });
  }
};

export const config = {
  path: '/.netlify/functions/whatsapp-send-manual'
};
