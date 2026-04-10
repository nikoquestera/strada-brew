import { accurateClient } from '../../client';

/**
 * /api/customer-claim/bulk-save.do
 * Membuat mengedit beberapa data Klaim Pelanggan sekaligus (Max: 100 data dalam 1 kali request). Ganti nama parameter "[n]" dengan index data mulai dari nol (Cth: data[0], data[1], dst.) pada parameter request.
 */
export async function customerClaimBulkSave(data: any) {
  return accurateClient.post('/api/customer-claim/bulk-save.do', data);
}
