import { useState } from 'react';
import { supabase } from '../lib/supabase';

// Gera um ID de sessão simples para agrupar as ações do cliente
const getSessionId = () => {
  let sessionId = sessionStorage.getItem('analytics_session_id');
  if (!sessionId) {
    sessionId = Math.random().toString(36).substring(2) + Date.now().toString(36);
    sessionStorage.setItem('analytics_session_id', sessionId);
  }
  return sessionId;
};

// Only real visits count in the sales funnel: no local/test copies of the site, no automated browsers or bots.
const isRealVisit = () => {
  try {
    const host = window.location.hostname;
    if (!host || host === 'localhost' || host.startsWith('127.') || host.startsWith('192.168.') || host.endsWith('.local')) return false;
    if (/--/.test(host)) return false; // Netlify deploy previews (e.g. abc123--site.netlify.app)
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
