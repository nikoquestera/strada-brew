import { accurateClient } from '../../client';

/**
 * /api/roll-over/bulk-save.do
 * Membuat mengedit beberapa data Penyelesaian Pesanan sekaligus (Max: 100 data dalam 1 kali request). Ganti nama parameter "[n]" dengan index data mulai dari nol (Cth: data[0], data[1], dst.) pada parameter request.
 */
export async function rollOverBulkSave(data: any) {
  return accurateClient.post('/api/roll-over/bulk-save.do', data);
}
