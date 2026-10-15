import { useState } from 'react';
import { supabase } from '../lib/supabase';

// Trata parâmetro de URL (?interno=1 para marcar aparelho da equipe, ?interno=0 para desmarcar)
export const checkInternalParam = () => {
  try {
    if (typeof window === 'undefined') return;
    const searchParams = new URLSearchParams(window.location.search);
    if (searchParams.get('interno') === '1') {
      localStorage.setItem('dobro_internal', '1');
      searchParams.delete('interno');
      const cleanUrl = window.location.pathname + (searchParams.toString() ? '?' + searchParams.toString() : '') + window.location.hash;
      window.history.replaceState({}, '', cleanUrl);
    } else if (searchParams.get('interno') === '0') {
      localStorage.removeItem('dobro_internal');
      searchParams.delete('interno');
      const cleanUrl = window.location.pathname + (searchParams.toString() ? '?' + searchParams.toString() : '') + window.location.hash;
      window.history.replaceState({}, '', cleanUrl);
    }
  } catch {}
};

// Executa verificação de URL de imediato
checkInternalParam();

// Retorna se o aparelho atual está marcado como interno (dono / equipe)
export const isInternalDevice = (): boolean => {
  try {
    return localStorage.getItem('dobro_internal') === '1';
  } catch {
    return false;
  }
};

// Permite ligar ou desligar a marcação manual do aparelho
export const setInternalDevice = (enabled: boolean): void => {
  try {
    if (enabled) {
      localStorage.setItem('dobro_internal', '1');
    } else {
      localStorage.removeItem('dobro_internal');
    }
  } catch {}
};

// Gera um ID de sessão simples para agrupar as ações do cliente
const getSessionId = () => {
  let sessionId = sessionStorage.getItem('analytics_session_id');
  if (!sessionId) {
    sessionId = Math.random().toString(36).substring(2) + Date.now().toString(36);
    sessionStorage.setItem('analytics_session_id', sessionId);
  }
  return sessionId;
};

// Only real visits count in the sales funnel: no local/test copies of the site, no internal team, no automated browsers or bots.
const isRealVisit = () => {
  try {
    // 1. Exclui acessos internos (dono e equipe com aparelho marcado)
    if (isInternalDevice()) return false;

    // 2. Exclui localhost e rede local
    const host = window.location.hostname;
    if (!host || host === 'localhost' || host.startsWith('127.') || host.startsWith('192.168.') || host.endsWith('.local')) return false;

    // 3. Exclui prévias de deploy do Netlify (ex: abc123--site.netlify.app)
    if (/--/.test(host)) return false;

    // 4. Exclui automações e robôs
    if ((navigator as any).webdriver) return false;
    if (/bot|crawler|spider|headless|lighthouse|preview|facebookexternalhit|whatsapp/i.test(navigator.userAgent)) return false;

    return true;
  } catch {
    return false;
  }
};

export function useAnalytics() {
  const [sessionId] = useState(getSessionId());

  const trackEvent = async (eventName: string, eventData: any = {}) => {
    try {
      checkInternalParam();
      if (!isRealVisit()) return;

      // One page_view per session, so reloading the page does not inflate the visitor count
      if (eventName === 'page_view') {
        if (sessionStorage.getItem('analytics_page_view_sent')) return;
        sessionStorage.setItem('analytics_page_view_sent', '1');
      }

      const payload = {
        event_name: eventName,
        session_id: sessionId,
        path: window.location.pathname,
        event_data: {
          ...eventData,
          host: window.location.hostname,
          referrer: document.referrer ? new URL(document.referrer).hostname : '',
        },
        created_at: new Date().toISOString()
      };

      const { error } = await supabase.from('analytics_events').insert([payload]);
      if (error) console.warn('Analytics error:', error.message);
    } catch (err) {
      console.warn('Analytics error:', err);
    }
  };

  return { trackEvent };
}
