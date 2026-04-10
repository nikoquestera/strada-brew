import { accurateClient } from '../../client';

/**
 * /api/delivery-order/detail.do
 * Melihat detil data Pengiriman Pesanan berdasarkan id atau identifier tertentu
 */
export async function deliveryOrderDetail(params: any) {
  return accurateClient.get('/api/delivery-order/detail.do', { params });
}
