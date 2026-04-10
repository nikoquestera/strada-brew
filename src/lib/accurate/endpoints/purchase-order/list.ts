import { accurateClient } from '../../client';

/**
 * /api/purchase-order/list.do
 * Melihat daftar data Pesanan Pembelian, dengan filter yang sesuai
 */
export async function purchaseOrderList(params: any) {
  return accurateClient.get('/api/purchase-order/list.do', { params });
}
