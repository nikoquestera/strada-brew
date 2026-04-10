import { accurateClient } from '../../client';

/**
 * /api/purchase-order/detail.do
 * Melihat detil data Pesanan Pembelian berdasarkan id atau identifier tertentu
 */
export async function purchaseOrderDetail(params: any) {
  return accurateClient.get('/api/purchase-order/detail.do', { params });
}
