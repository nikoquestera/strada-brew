import { accurateClient } from '../../client';

/**
 * /api/exchange-invoice/delete.do
 * Menghapus data Tukar Faktur berdasarkan id tertentu
 */
export async function exchangeInvoiceDelete(params: any) {
  return accurateClient.delete('/api/exchange-invoice/delete.do', params);
}
