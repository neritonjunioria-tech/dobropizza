import QRCode from 'qrcode';
import { PIX_CONFIG } from '../config/pixConfig';

/**
 * Utilitários para geração de PIX no padrão oficial BR Code (Banco Central do Brasil / EMVCo).
 */

/**
 * Formata um campo no padrão TLV (Tag-Length-Value).
 * ID: 2 dígitos
 * Length: 2 dígitos
 * Value: string de conteúdo
 */
export function formatTLV(id: string, value: string): string {
  const len = value.length.toString().padStart(2, '0');
  return `${id}${len}${value}`;
}

/**
 * Remove acentos e caracteres especiais, converte para maiúsculas e limita o comprimento.
 * Necessário para conformidade estrita com o padrão EMVCo do BACEN.
 */
export function sanitizePixText(text: string, maxLen: number): string {
  if (!text) return '';
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Za-z0-9 ]/g, '')
    .trim()
    .toUpperCase()
    .slice(0, maxLen);
}

/**
 * Cálculo oficial do CRC16-CCITT-FALSE (polinômio 0x1021, valor inicial 0xFFFF).
 */
export function calculateCRC16(payload: string): string {
  let crc = 0xFFFF;
  for (let i = 0; i < payload.length; i++) {
    crc ^= (payload.charCodeAt(i) << 8);
    for (let j = 0; j < 8; j++) {
      if ((crc & 0x8000) !== 0) {
        crc = ((crc << 1) ^ 0x1021) & 0xFFFF;
      } else {
        crc = (crc << 1) & 0xFFFF;
      }
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

export interface GeneratePixPayloadOptions {
  key?: string;
  name?: string;
  city?: string;
  amount: number;
  txid?: string;
}

/**
 * Gera a string Pix Copia e Cola (BR Code) completa com valor, chave e CRC16.
 */
export function generatePixPayload(options: GeneratePixPayloadOptions): string {
  const key = (options.key || PIX_CONFIG.chave || '').replace(/[^0-9a-zA-Z@.+_-]/g, '');
  const name = sanitizePixText(options.name || PIX_CONFIG.nomeRecebedor || 'DOBRO PIZZAS', 25);
  const city = sanitizePixText(options.city || PIX_CONFIG.cidadeRecebedor || 'SAO JOSE PINHAI', 15);
  
  // txid: até 25 caracteres alfanuméricos sem espaços; padrão BACEN para não específico é '***'
  const rawTxid = (options.txid || PIX_CONFIG.identificadorPadrao || '***')
    .replace(/[^0-9a-zA-Z]/g, '')
    .slice(0, 25);
  const txid = rawTxid.length > 0 ? rawTxid : '***';

  // Subtags da Conta do Recebedor (Tag 26)
  const merchantAccountInfo = 
    formatTLV('00', 'br.gov.bcb.pix') +
    formatTLV('01', key);

  // Subtag do Identificador da Transação (Tag 62)
  const additionalDataField = formatTLV('05', txid);

  // Montagem sequencial das tags EMVCo
  let raw = 
    formatTLV('00', '01') +                                   // Payload Format Indicator
    formatTLV('01', '12') +                                   // Point of Initiation Method (12 = uso único com valor)
    formatTLV('26', merchantAccountInfo) +                     // Informações da conta Pix
    formatTLV('52', '0000') +                                 // Merchant Category Code
    formatTLV('53', '986') +                                  // Moeda BRL (986)
    (options.amount > 0 ? formatTLV('54', Number(options.amount).toFixed(2)) : '') + // Valor do pedido
    formatTLV('58', 'BR') +                                   // País
    formatTLV('59', name) +                                   // Nome do recebedor
    formatTLV('60', city) +                                   // Cidade do recebedor
    formatTLV('62', additionalDataField) +                    // Campo adicional com txid
    '6304';                                                   // Tag CRC16 + tamanho de 4 dígitos

  const crc = calculateCRC16(raw);
  return `${raw}${crc}`;
}

/**
 * Gera um Data URL (PNG em base64) contendo o QR Code a partir do código Pix Copia e Cola.
 * Execução 100% local no navegador, sem chamadas a servidores externos.
 */
export async function generatePixQrCodeDataUrl(payload: string): Promise<string> {
  return QRCode.toDataURL(payload, {
    width: 320,
    margin: 2,
    color: {
      dark: '#083d07', // Verde escuro da identidade Dobro Pizzas com alto contraste
      light: '#ffffff'
    },
    errorCorrectionLevel: 'M'
  });
}

/**
 * Gera o QR Code em formato SVG puro (vetorial).
 * 100% à prova de falhas em qualquer navegador, sem depender de canvas ou APIs externas.
 */
export async function generatePixQrCodeSvg(payload: string): Promise<string> {
  return QRCode.toString(payload, {
    type: 'svg',
    margin: 2,
    color: {
      dark: '#083d07',
      light: '#ffffff'
    },
    errorCorrectionLevel: 'M'
  });
}
