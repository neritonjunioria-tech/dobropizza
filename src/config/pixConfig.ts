/**
 * CONFIGURAÇÃO DA CHAVE PIX - DOBRO PIZZAS
 * 
 * As configurações abaixo são utilizadas para gerar o payload oficial do BR Code (EMVCo / Banco Central do Brasil)
 * e o QR Code PIX com o valor exato do pedido.
 * 
 * -------------------------------------------------------------------------------------------------
 * CAMPOS A CONFIRMAR PELO ADMINISTRADOR / TITULAR DA CONTA:
 * 1. chave: Chave PIX cadastrada (atualmente: CNPJ 56116831000188).
 * 2. tipoChave: 'CNPJ'.
 * 3. nomeRecebedor: Razão Social ou Nome do Titular registrado na conta bancária (máx 25 caracteres, sem acentos).
 *    -> Configure exatamente como consta no extrato/comprovante do banco onde a chave está cadastrada.
 * 4. cidadeRecebedor: Cidade da agência bancária recebedora (máx 15 caracteres, sem acentos).
 * -------------------------------------------------------------------------------------------------
 */

export interface PixConfig {
  chave: string;
  tipoChave: 'CNPJ' | 'CPF' | 'EMAIL' | 'TELEFONE' | 'ALEATORIA';
  nomeRecebedor: string;
  cidadeRecebedor: string;
  identificadorPadrao: string;
}

export const PIX_CONFIG: PixConfig = {
  // Chave PIX do recebedor (CNPJ)
  chave: '56116831000188',
  tipoChave: 'CNPJ',

  // Nome do recebedor (titular da conta bancária) - Máx 25 caracteres, sem acentos
  // Caso o nome registrado no banco seja diferente da Razão Social comercial, altere aqui:
  nomeRecebedor: 'DOBRO PIZZAS',

  // Cidade da conta recebedora - Máx 15 caracteres, sem acentos
  cidadeRecebedor: 'SAO JOSE PINHAIS',

  // Identificador padrão no BR Code (txid)
  identificadorPadrao: 'DOBRO'
};
