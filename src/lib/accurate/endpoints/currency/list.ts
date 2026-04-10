import { accurateClient } from '../../client';

/**
 * /api/currency/list.do
 * Melihat daftar data Mata Uang, dengan filter yang sesuai
 */
export async function currencyList(params: any) {
  return accurateClient.get('/api/currency/list.do', { params });
}
