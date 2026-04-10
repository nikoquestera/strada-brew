import { accurateClient } from '../../client';

/**
 * /api/sales-receipt/bulk-save.do
 * Membuat mengedit beberapa data Penerimaan Penjualan sekaligus (Max: 100 data dalam 1 kali request). Ganti nama parameter "[n]" dengan index data mulai dari nol (Cth: data[0], data[1], dst.) pada parameter request.
 */
export async function salesReceiptBulkSave(data: any) {
  return accurateClient.post('/api/sales-receipt/bulk-save.do', data);
}
