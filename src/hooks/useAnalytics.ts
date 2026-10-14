import { useEffect, useState } from 'react';
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

export function useAnalytics() {
  const [sessionId] = useState(getSessionId());

  const trackEvent = async (eventName: string, eventData: any = {}) => {
    try {
      const path = window.location.pathname;
      const payload = {
        event_name: eventName,
        session_id: sessionId,
        path: path,
        event_data: eventData,
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
