import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export interface ScheduleDay {
  dayOfWeek: number;
  dayName: string;
  isClosed: boolean;
  opensAt: string;
  closesAt: string;
  label: string;
  isToday: boolean;
}

export interface BusinessHoursStatus {
  isOpen: boolean;
  loading: boolean;
  todayLabel: string;
  reason: 'loading' | 'closed_today' | 'outside_hours' | 'open' | 'manual_closed' | 'paused' | 'blocked';
  subscriptionStatus: string;
  schedule: ScheduleDay[];
}

const DAY_NAMES = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];

export function useBusinessHours(): BusinessHoursStatus {
  const [status, setStatus] = useState<BusinessHoursStatus>({
    isOpen: true,
    loading: true,
    todayLabel: '',
    reason: 'loading',
    subscriptionStatus: 'active',
    schedule: [],
  });

  const checkStatus = async () => {
    try {
      const [settingsRes, hoursRes] = await Promise.all([
        supabase.from('settings').select('key, value').in('key', ['manual_store_closed', 'store_status', 'paused_until', 'subscription_status']),
        supabase.from('business_hours').select('*').order('day_of_week')
      ]);

      const settingsData = settingsRes.data;
      const data = hoursRes.data || [];

      // Cálculo estrito e 100% referenciado no HORÁRIO DE BRASÍLIA (America/Sao_Paulo)
      const dtf = new Intl.DateTimeFormat('en-US', {
        timeZone: 'America/Sao_Paulo',
        hour12: false,
        weekday: 'short',
        hour: 'numeric',
        minute: 'numeric'
      });
      const parts = dtf.formatToParts(new Date());
      const getVal = (type: string) => parts.find(p => p.type === type)?.value;
      const weekdayMap: Record<string, number> = {
        'Sun': 0, 'Mon': 1, 'Tue': 2, 'Wed': 3, 'Thu': 4, 'Fri': 5, 'Sat': 6
      };
      const dayOfWeek = weekdayMap[getVal('weekday') || 'Sun'] ?? 0;
      let hours = parseInt(getVal('hour') || '0', 10);
      if (hours === 24) hours = 0;
      const minutes = parseInt(getVal('minute') || '0', 10);
      const nowMinutes = hours * 60 + minutes;

      // Monta grade semanal ordenada de Segunda a Domingo
      const schedule: ScheduleDay[] = [1, 2, 3, 4, 5, 6, 0].map(dow => {
        const row = data.find((d: any) => d.day_of_week === dow);
        const isClosed = !row || !!row.is_closed || !row.opens_at || !row.closes_at;
        const opensAt = (row?.opens_at || '').slice(0, 5);
        const closesAt = (row?.closes_at || '').slice(0, 5);
        return {
          dayOfWeek: dow,
          dayName: DAY_NAMES[dow],
          isClosed,
          opensAt,
          closesAt,
          label: isClosed ? 'Fechado' : `${opensAt} às ${closesAt}`,
          isToday: dow === dayOfWeek
        };
      });

      const getSetting = (k: string) => settingsData?.find(s => s.key === k)?.value;
      
      const manualClosed = getSetting('manual_store_closed') === true;
      const storeStatus = getSetting('store_status');
      const pausedUntil = getSetting('paused_until');
      const subscriptionStatus = getSetting('subscription_status') || 'active';

      if (subscriptionStatus === 'blocked') {
        setStatus({ isOpen: false, loading: false, todayLabel: '', reason: 'blocked', subscriptionStatus, schedule });
        return;
      }

      if (manualClosed || storeStatus === 'closed') {
        setStatus({ isOpen: false, loading: false, todayLabel: 'Fechado temporariamente', reason: 'manual_closed', subscriptionStatus, schedule });
        return;
      }

      if (storeStatus === 'paused' && pausedUntil) {
        const pauseEnd = new Date(pausedUntil);
        if (new Date() < pauseEnd) {
           const timeStr = pauseEnd.toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'});
           setStatus({ isOpen: false, loading: false, todayLabel: `Volta às ${timeStr}`, reason: 'paused', subscriptionStatus, schedule });
           return;
        }
      }

      if (data.length === 0) {
        setStatus({ isOpen: true, loading: false, todayLabel: '', reason: 'open', subscriptionStatus, schedule });
        return;
      }

      // 1. Verifica se estamos nos minutos finais da madrugada do turno de ontem (ex: aberto das 18h30 às 00h30 ou 01h00)
      if (hours < 6) {
        const yesterdayDay = (dayOfWeek + 6) % 7;
        const yesterdayRecord = data.find((d: any) => d.day_of_week === yesterdayDay);
        if (yesterdayRecord && !yesterdayRecord.is_closed && yesterdayRecord.opens_at && yesterdayRecord.closes_at) {
          const yOpenParts = yesterdayRecord.opens_at.split(':').map(Number);
          const yCloseParts = yesterdayRecord.closes_at.split(':').map(Number);
          const yOpenM = (yOpenParts[0] || 0) * 60 + (yOpenParts[1] || 0);
          const yCloseM = (yCloseParts[0] || 0) * 60 + (yCloseParts[1] || 0);

          // Se fechava na madrugada seguinte (ex: fecha às 00:30 ou 01:00)
          if (yCloseM > 0 && yCloseM <= yOpenM && nowMinutes < yCloseM) {
            setStatus({
              isOpen: true,
              loading: false,
              todayLabel: `${yesterdayRecord.opens_at.slice(0, 5)} às ${yesterdayRecord.closes_at.slice(0, 5)}`,
              reason: 'open',
              subscriptionStatus,
              schedule
            });
            return;
          }
        }
      }

      // 2. Verifica o turno oficial de hoje (Horário de Brasília)
      const today = data.find((d: any) => d.day_of_week === dayOfWeek);

      if (!today || today.is_closed || !today.opens_at || !today.closes_at || typeof today.opens_at !== 'string' || typeof today.closes_at !== 'string') {
        setStatus({
          isOpen: false,
          loading: false,
          todayLabel: DAY_NAMES[dayOfWeek] || 'Fechado',
          reason: 'closed_today',
          subscriptionStatus,
          schedule
        });
        return;
      }

      const openParts = today.opens_at.split(':').map(Number);
      const closeParts = today.closes_at.split(':').map(Number);
      const openH = openParts[0] || 0;
      const openM = openParts[1] || 0;
      const closeH = closeParts[0] || 0;
      const closeM = closeParts[1] || 0;

      const openMinutes = openH * 60 + openM;
      let closeMinutes = closeH * 60 + closeM;

      // Se fecha à meia-noite (00:00) ou na madrugada seguinte
      let isOpen = false;
      if (closeMinutes <= openMinutes) {
        // Ex: 18:30 às 00:00 (closeMinutes = 0) ou 18:30 às 01:00 (closeMinutes = 60)
        // Durante a noite de hoje, está aberto de openMinutes até 23:59 (1440)
        isOpen = nowMinutes >= openMinutes && nowMinutes < 1440;
      } else {
        // Ex: 12:00 às 23:00
        isOpen = nowMinutes >= openMinutes && nowMinutes < closeMinutes;
      }

      setStatus({
        isOpen,
        loading: false,
        todayLabel: `${today.opens_at.slice(0, 5)} às ${today.closes_at.slice(0, 5)}`,
        reason: isOpen ? 'open' : 'outside_hours',
        subscriptionStatus,
        schedule
      });
    } catch (err) {
      console.warn('[useBusinessHours] Não foi possível verificar o horário, assumindo loja aberta.', err);
      setStatus({ isOpen: true, loading: false, todayLabel: '', reason: 'open', subscriptionStatus: 'active', schedule: [] });
    }
  };

  useEffect(() => {
    checkStatus();
    const interval = setInterval(checkStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  return status;
}
