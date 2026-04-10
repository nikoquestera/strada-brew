import { accurateClient } from '../../client';

/**
 * /api/exchange-invoice/list.do
 * Melihat daftar data Tukar Faktur, dengan filter yang sesuai
 */
export async function exchangeInvoiceList(params: any) {
  return accurateClient.get('/api/exchange-invoice/list.do', { params });
}
