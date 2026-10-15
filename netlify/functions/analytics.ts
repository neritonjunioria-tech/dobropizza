import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || 'https://yexlnjznkxthffklovql.supabase.co';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';

export default async (req: Request) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Authorization, Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (req.method === 'OPTIONS') {
    return new Response('', { status: 200, headers });
  }

  if (req.method !== 'GET') {
    return new Response(JSON.stringify({ available: false, message: 'Method Not Allowed' }), { status: 405, headers });
  }

  // 1. Exige autenticação de usuário logado (Supabase JWT) para o público não chamar a função
  const authHeader = req.headers.get('authorization') || req.headers.get('Authorization') || '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();

  if (!token) {
    return new Response(JSON.stringify({ available: false, message: 'Não autorizado. Token de sessão ausente.' }), { status: 401, headers });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false }
    });

    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError || !userData?.user) {
      return new Response(JSON.stringify({ available: false, message: 'Sessão inválida ou expirada. Faça login novamente.' }), { status: 401, headers });
    }
  } catch (err: any) {
    return new Response(JSON.stringify({ available: false, message: 'Erro na validação de usuário: ' + (err?.message || String(err)) }), { status: 401, headers });
  }

  // 2. Verifica token do Netlify Analytics
  const netlifyToken = process.env.NETLIFY_ANALYTICS_TOKEN;
  if (!netlifyToken) {
    return new Response(JSON.stringify({
      available: false,
      message: 'não disponível',
      reason: 'NETLIFY_ANALYTICS_TOKEN não configurado nas variáveis de ambiente do Netlify.'
    }), { status: 200, headers });
  }

  // 3. Obtém parâmetros de data (?from=...&to=...) em milissegundos
  const url = new URL(req.url);
  const now = Date.now();
  const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;
  const fromMs = Number(url.searchParams.get('from')) || thirtyDaysAgo;
  const toMs = Number(url.searchParams.get('to')) || now;

  let siteId = process.env.SITE_ID || process.env.NETLIFY_SITE_ID;

  // Se o SITE_ID não vier nas variáveis do Netlify, tenta descobrir pela API oficial
  if (!siteId) {
    try {
      const sitesRes = await fetch('https://api.netlify.com/api/v1/sites', {
        headers: { Authorization: `Bearer ${netlifyToken}` }
      });
      if (sitesRes.ok) {
        const sites = await sitesRes.json();
        const dobroSite = sites.find((s: any) => 
          s.name === 'dobropizzasdelivery' || 
          s.custom_domain === 'dobropizzasdelivery.netlify.app' ||
          (s.ssl_url && s.ssl_url.includes('dobropizzasdelivery'))
        );
        if (dobroSite?.id) {
          siteId = dobroSite.id;
        } else if (sites.length === 1) {
          siteId = sites[0].id;
        }
      }
    } catch (e) {
      console.warn('[Analytics Function] Não foi possível obter lista de sites:', e);
    }
  }

  if (!siteId) {
    return new Response(JSON.stringify({
      available: false,
      message: 'não disponível',
      reason: 'SITE_ID não identificado no ambiente Netlify.'
    }), { status: 200, headers });
  }

  // 4. Consulta os endpoints de analytics do Netlify
  try {
    const netlifyHeaders = {
      Authorization: `Bearer ${netlifyToken}`,
      'Content-Type': 'application/json'
    };

    const visitorsUrl = `https://analytics.services.netlify.com/v2/${siteId}/visitors?from=${fromMs}&to=${toMs}&timezone=-0300&resolution=range`;
    const pageviewsUrl = `https://analytics.services.netlify.com/v2/${siteId}/pageviews?from=${fromMs}&to=${toMs}&timezone=-0300&resolution=day`;

    const [visitorsRes, pageviewsRes] = await Promise.all([
      fetch(visitorsUrl, { headers: netlifyHeaders }),
      fetch(pageviewsUrl, { headers: netlifyHeaders })
    ]);

    if (!visitorsRes.ok || !pageviewsRes.ok) {
      const status = !visitorsRes.ok ? visitorsRes.status : pageviewsRes.status;
      return new Response(JSON.stringify({
        available: false,
        message: 'não disponível',
        reason: status === 404 || status === 403 
          ? 'Netlify Analytics não está ativo nesta conta (recurso adicional do Netlify).'
          : `Netlify Analytics retornou status ${status}.`
      }), { status: 200, headers });
    }

    const visitorsData = await visitorsRes.json();
    const pageviewsData = await pageviewsRes.json();

    // Interpreta formato retornado pelo Netlify Analytics
    let totalVisitors = 0;
    if (typeof visitorsData?.count === 'number') {
      totalVisitors = visitorsData.count;
    } else if (Array.isArray(visitorsData?.data)) {
      totalVisitors = visitorsData.data.reduce((acc: number, item: any) => {
        const val = Array.isArray(item) ? Number(item[1]) : Number(item?.count ?? 0);
        return acc + (isNaN(val) ? 0 : val);
      }, 0);
    }

    let totalPageviews = 0;
    if (typeof pageviewsData?.count === 'number') {
      totalPageviews = pageviewsData.count;
    } else if (Array.isArray(pageviewsData?.data)) {
      totalPageviews = pageviewsData.data.reduce((acc: number, item: any) => {
        const val = Array.isArray(item) ? Number(item[1]) : Number(item?.count ?? 0);
        return acc + (isNaN(val) ? 0 : val);
      }, 0);
    }

    return new Response(JSON.stringify({
      available: true,
      visitors: totalVisitors,
      pageviews: totalPageviews,
      from: fromMs,
      to: toMs
    }), { status: 200, headers });

  } catch (err: any) {
    return new Response(JSON.stringify({
      available: false,
      message: 'não disponível',
      reason: err?.message || 'Erro ao conectar à API do Netlify.'
    }), { status: 200, headers });
  }
};
