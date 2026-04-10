import { accurateClient } from '../../client';

/**
 * /api/sales-order/list.do
 * Melihat daftar data Pesanan Penjualan, dengan filter yang sesuai
 */
export async function salesOrderList(params: any) {
  return accurateClient.get('/api/sales-order/list.do', { params });
}
