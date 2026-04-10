import { accurateClient } from '../../client';

/**
 * /api/vendor/bulk-save.do
 * Membuat mengedit beberapa data Pemasok sekaligus (Max: 100 data dalam 1 kali request). Ganti nama parameter "[n]" dengan index data mulai dari nol (Cth: data[0], data[1], dst.) pada parameter request.
 */
export async function vendorBulkSave(data: any) {
  return accurateClient.post('/api/vendor/bulk-save.do', data);
}
