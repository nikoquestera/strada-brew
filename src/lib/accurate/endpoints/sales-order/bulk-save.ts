import { accurateClient } from '../../client';

/**
 * /api/sales-order/bulk-save.do
 * Membuat mengedit beberapa data Pesanan Penjualan sekaligus (Max: 100 data dalam 1 kali request). Ganti nama parameter "[n]" dengan index data mulai dari nol (Cth: data[0], data[1], dst.) pada parameter request.
 */
export async function salesOrderBulkSave(data: any) {
  return accurateClient.post('/api/sales-order/bulk-save.do', data);
}
