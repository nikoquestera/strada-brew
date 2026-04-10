import { accurateClient } from '../../client';

/**
 * /api/fob/bulk-save.do
 * Membuat mengedit beberapa data FOB sekaligus (Max: 100 data dalam 1 kali request). Ganti nama parameter "[n]" dengan index data mulai dari nol (Cth: data[0], data[1], dst.) pada parameter request.
 */
export async function fobBulkSave(data: any) {
  return accurateClient.post('/api/fob/bulk-save.do', data);
}
