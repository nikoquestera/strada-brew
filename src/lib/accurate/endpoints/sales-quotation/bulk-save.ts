import { accurateClient } from '../../client';

/**
 * /api/sales-quotation/bulk-save.do
 * Membuat mengedit beberapa data Penawaran Penjualan sekaligus (Max: 100 data dalam 1 kali request). Ganti nama parameter "[n]" dengan index data mulai dari nol (Cth: data[0], data[1], dst.) pada parameter request.
 */
export async function salesQuotationBulkSave(data: any) {
  return accurateClient.post('/api/sales-quotation/bulk-save.do', data);
}
