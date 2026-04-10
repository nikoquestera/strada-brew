import { accurateClient } from '../../client';

/**
 * /api/purchase-order/save.do
 * Membuat data Pesanan Pembelian baru atau mengedit data Pesanan Pembelian yang sudah ada
 */
export async function purchaseOrderSave(data: any) {
  return accurateClient.post('/api/purchase-order/save.do', data);
}
