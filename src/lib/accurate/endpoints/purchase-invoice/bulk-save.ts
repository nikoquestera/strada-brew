import { accurateClient } from '../../client';

/**
 * /api/purchase-invoice/bulk-save.do
 * Membuat mengedit beberapa data Faktur Pembelian sekaligus (Max: 100 data dalam 1 kali request). Ganti nama parameter "[n]" dengan index data mulai dari nol (Cth: data[0], data[1], dst.) pada parameter request.
 */
export async function purchaseInvoiceBulkSave(data: any) {
  return accurateClient.post('/api/purchase-invoice/bulk-save.do', data);
}
