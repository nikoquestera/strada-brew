import { accurateClient } from '../../client';

/**
 * /api/currency/exchange-rate.do
 * Melihat detil data Histori Kurs mata uang berdasarkan id atau identifier tertentu
 */
export async function currencyExchangeRate(params: any) {
  return accurateClient.get('/api/currency/exchange-rate.do', { params });
}
