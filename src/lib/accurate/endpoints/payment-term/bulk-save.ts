import { accurateClient } from '../../client';

/**
 * /api/payment-term/bulk-save.do
 * Membuat mengedit beberapa data Syarat Pembayaran sekaligus (Max: 100 data dalam 1 kali request). Ganti nama parameter "[n]" dengan index data mulai dari nol (Cth: data[0], data[1], dst.) pada parameter request.
 */
export async function paymentTermBulkSave(data: any) {
  return accurateClient.post('/api/payment-term/bulk-save.do', data);
}
