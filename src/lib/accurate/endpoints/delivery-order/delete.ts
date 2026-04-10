import { accurateClient } from '../../client';

/**
 * /api/delivery-order/delete.do
 * Menghapus data Pengiriman Pesanan berdasarkan id tertentu
 */
export async function deliveryOrderDelete(params: any) {
  return accurateClient.delete('/api/delivery-order/delete.do', params);
}
