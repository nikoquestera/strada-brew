import { accurateClient } from '../../client';

/**
 * /api/currency/fiscal-rate.do
 * Melihat detil data Histori Kurs Pajak mata uang berdasarkan id atau identifier tertentu
 */
export async function currencyFiscalRate(params: any) {
  return accurateClient.get('/api/currency/fiscal-rate.do', { params });
}
