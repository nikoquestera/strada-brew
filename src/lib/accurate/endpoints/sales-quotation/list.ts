import { accurateClient } from '../../client';

/**
 * /api/sales-quotation/list.do
 * Melihat daftar data Penawaran Penjualan, dengan filter yang sesuai
 */
export async function salesQuotationList(params: any) {
  return accurateClient.get('/api/sales-quotation/list.do', { params });
}
