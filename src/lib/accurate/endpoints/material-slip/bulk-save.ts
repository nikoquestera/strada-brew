import { accurateClient } from '../../client';

/**
 * /api/material-slip/bulk-save.do
 * Membuat mengedit beberapa data Pengambilan Bahan Baku sekaligus (Max: 100 data dalam 1 kali request). Ganti nama parameter "[n]" dengan index data mulai dari nol (Cth: data[0], data[1], dst.) pada parameter request.
 */
export async function materialSlipBulkSave(data: any) {
  return accurateClient.post('/api/material-slip/bulk-save.do', data);
}
