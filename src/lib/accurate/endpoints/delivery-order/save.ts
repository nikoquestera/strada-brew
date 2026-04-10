import { accurateClient } from '../../client';

/**
 * /api/delivery-order/save.do
 * Membuat data Pengiriman Pesanan baru atau mengedit data Pengiriman Pesanan yang sudah ada
 */
export async function deliveryOrderSave(data: any) {
  return accurateClient.post('/api/delivery-order/save.do', data);
}
