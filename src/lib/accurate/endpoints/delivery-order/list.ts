import { accurateClient } from '../../client';

/**
 * /api/delivery-order/list.do
 * Melihat daftar data Pengiriman Pesanan, dengan filter yang sesuai
 */
export async function deliveryOrderList(params: any) {
  return accurateClient.get('/api/delivery-order/list.do', { params });
}
