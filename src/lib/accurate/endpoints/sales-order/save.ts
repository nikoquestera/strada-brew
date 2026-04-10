import { accurateClient } from '../../client';

/**
 * /api/sales-order/save.do
 * Membuat data Pesanan Penjualan baru atau mengedit data Pesanan Penjualan yang sudah ada
 */
export async function salesOrderSave(data: any) {
  return accurateClient.post('/api/sales-order/save.do', data);
}
