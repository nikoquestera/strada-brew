import { accurateClient } from '../../client';

/**
 * /api/exchange-invoice/bulk-save.do
 * Membuat mengedit beberapa data Tukar Faktur sekaligus (Max: 100 data dalam 1 kali request). Ganti nama parameter "[n]" dengan index data mulai dari nol (Cth: data[0], data[1], dst.) pada parameter request.
 */
export async function exchangeInvoiceBulkSave(data: any) {
  return accurateClient.post('/api/exchange-invoice/bulk-save.do', data);
}
