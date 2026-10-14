/**
 * Helpers para normalização e consistência de formas de pagamento,
 * tipos de pedidos e filtros financeiros em todo o sistema.
 */

export type CanonicalPaymentMethod = 
  | 'Numerário' 
  | 'Dinheiro'
  | 'MB Way' 
  | 'Pix' 
  | 'Cartão de Crédito' 
  | 'Cartão de Débito' 
  | 'Cartão' 
  | 'Outros';
export type CanonicalOrderType = 'entrega' | 'retirada' | 'mesa' | 'balcao';

/**
 * Normaliza qualquer variação de forma de pagamento vinda do cardápio do cliente,
 * do PDV, da edição de pedido ou de integrações externas.
 */
export function normalizePaymentMethod(method?: string | null): CanonicalPaymentMethod {
  if (!method) return 'Outros';

  const clean = method.trim().toLowerCase();

  if (
    clean === 'numerário' ||
    clean === 'numerario' ||
    clean === 'dinheiro' ||
    clean === 'cash'
  ) {
    return 'Numerário';
  }

  if (
    clean === 'mb way' ||
    clean === 'mbway' ||
    clean === 'mb_way' ||
    clean === 'pix'
  ) {
    return 'Pix';
  }

  if (
    clean.includes('crédito') ||
    clean.includes('credito') ||
    clean === 'credit'
  ) {
    return 'Cartão de Crédito';
  }

  if (
    clean.includes('débito') ||
    clean.includes('debito') ||
    clean === 'debit'
  ) {
    return 'Cartão de Débito';
  }

  if (
    clean === 'cartão' ||
    clean === 'cartao' ||
    clean === 'multibanco' ||
    clean === 'tpa' ||
    clean === 'card'
  ) {
    return 'Cartão';
  }

  return 'Outros';
}

/**
 * Nome exibido na tela para cada forma de pagamento (padrão brasileiro).
 * 'Numerário' continua sendo a chave interna de dinheiro; na tela aparece "Dinheiro".
 */
export function paymentLabel(method?: string | null): string {
  const canonical = normalizePaymentMethod(method);
  if (canonical === 'Numerário' || canonical === 'Dinheiro') return 'Dinheiro';
  if (canonical === 'MB Way') return 'Pix';
  return canonical;
}

/**
 * Normaliza o tipo de atendimento (Delivery vs Entrega, Takeaway vs Retirada, Mesa, Balcão).
 */
export function normalizeOrderType(type?: string | null): CanonicalOrderType {
  if (!type) return 'entrega';

  const clean = type.trim().toLowerCase();

  if (clean === 'delivery' || clean === 'entrega') {
    return 'entrega';
  }

  if (clean === 'takeaway' || clean === 'retirada' || clean === 'recolha') {
    return 'retirada';
  }

  if (clean === 'mesa') {
    return 'mesa';
  }

  if (clean === 'balcao' || clean === 'balcão') {
    return 'balcao';
  }

  return 'entrega';
}

/**
 * Retorna se um pedido está ativo para fins de relatórios e faturamento.
 * Pedidos com status "Cancelado" são desconsiderados dos cálculos financeiros.
 */
export function isOrderActive(orderOrStatus?: any): boolean {
  if (!orderOrStatus) return false;
  const status = typeof orderOrStatus === 'string' ? orderOrStatus : orderOrStatus.status;
  if (!status) return true;
  return status.trim().toLowerCase() !== 'cancelado';
}
