import { accurateClient } from '../../client';

/**
 * /api/sales-receipt/list.do
 * Melihat daftar data Penerimaan Penjualan, dengan filter yang sesuai
 */
export async function salesReceiptList(params: any) {
  return accurateClient.get('/api/sales-receipt/list.do', { params });
}
