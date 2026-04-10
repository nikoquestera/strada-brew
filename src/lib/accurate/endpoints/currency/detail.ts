import { accurateClient } from '../../client';

/**
 * /api/currency/detail.do
 * Melihat detil data Mata Uang berdasarkan id atau identifier tertentu
 */
export async function currencyDetail(params: any) {
  return accurateClient.get('/api/currency/detail.do', { params });
}
