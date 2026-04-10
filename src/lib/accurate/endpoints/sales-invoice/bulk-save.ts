import { accurateClient } from '../../client';

/**
 * /api/sales-invoice/bulk-save.do
 * Membuat mengedit beberapa data Faktur Penjualan sekaligus (Max: 100 data dalam 1 kali request). Ganti nama parameter "[n]" dengan index data mulai dari nol (Cth: data[0], data[1], dst.) pada parameter request.
 */
export async function salesInvoiceBulkSave(data: any) {
  return accurateClient.post('/api/sales-invoice/bulk-save.do', data);
}
