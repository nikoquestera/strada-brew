import { accurateClient } from '../../client';

/**
 * /api/finished-good-slip/bulk-save.do
 * Membuat mengedit beberapa data Penyelesaian Barang Jadi sekaligus (Max: 100 data dalam 1 kali request). Ganti nama parameter "[n]" dengan index data mulai dari nol (Cth: data[0], data[1], dst.) pada parameter request.
 */
export async function finishedGoodSlipBulkSave(data: any) {
  return accurateClient.post('/api/finished-good-slip/bulk-save.do', data);
}
