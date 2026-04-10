import { accurateClient } from '../../client';

/**
 * /api/exchange-invoice/detail.do
 * Melihat detil data Tukar Faktur berdasarkan id atau identifier tertentu
 */
export async function exchangeInvoiceDetail(params: any) {
  return accurateClient.get('/api/exchange-invoice/detail.do', { params });
}
