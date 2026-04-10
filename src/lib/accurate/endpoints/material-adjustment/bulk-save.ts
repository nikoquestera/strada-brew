import { accurateClient } from '../../client';

/**
 * /api/material-adjustment/bulk-save.do
 * Membuat mengedit beberapa data Penambahan Bahan Baku sekaligus (Max: 100 data dalam 1 kali request). Ganti nama parameter "[n]" dengan index data mulai dari nol (Cth: data[0], data[1], dst.) pada parameter request.
 */
export async function materialAdjustmentBulkSave(data: any) {
  return accurateClient.post('/api/material-adjustment/bulk-save.do', data);
}
