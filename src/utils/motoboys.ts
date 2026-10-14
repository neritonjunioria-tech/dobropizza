/**
 * Tipos e helpers do controle de motoboys / entregas.
 */

export type DeliveryProvider = 'proprio' | 'uber' | 'ifood';

export interface Motoboy {
  id: string;
  name: string;
  phone: string | null;
  default_fee: number;
  is_active: boolean;
  notes?: string | null;
  created_at?: string;
}

export const PROVIDER_LABELS: Record<DeliveryProvider, string> = {
  proprio: 'Motoboy próprio',
  uber: 'Uber',
  ifood: 'iFood',
};

export const DELIVERY_PLATFORMS: DeliveryProvider[] = ['uber', 'ifood'];

/**
 * Diferente de normalizeOrderType, não assume "entrega" para valores vazios/desconhecidos.
 */
export function isDeliveryOrderType(type?: string | null): boolean {
  const clean = (type || '').trim().toLowerCase();
  return clean === 'entrega' || clean === 'delivery';
}

/**
 * Nome de quem fez a entrega: o motoboy próprio ou a plataforma.
 */
export function getDeliveryResponsibleLabel(
  provider: DeliveryProvider | null | undefined,
  motoboyId: string | null | undefined,
  motoboys: Motoboy[]
): string | null {
  if (!provider) return null;
  if (provider !== 'proprio') return PROVIDER_LABELS[provider] || provider;
  return motoboys.find(m => m.id === motoboyId)?.name || 'Motoboy próprio';
}

/**
 * Erros do Supabase que indicam que a migration de motoboys ainda não foi aplicada.
 */
export function isMotoboySchemaMissing(error: any): boolean {
  if (!error) return false;
  const code = String(error.code || '');
  return code === '42P01' || code === '42703' || code === 'PGRST204' || code === 'PGRST205';
}
