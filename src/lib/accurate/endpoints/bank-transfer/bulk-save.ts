import { accurateClient } from '../../client';

/**
 * /api/bank-transfer/bulk-save.do
 * Membuat mengedit beberapa data Transfer Bank sekaligus (Max: 100 data dalam 1 kali request). Ganti nama parameter "[n]" dengan index data mulai dari nol (Cth: data[0], data[1], dst.) pada parameter request.
 */
export async function bankTransferBulkSave(data: any) {
  return accurateClient.post('/api/bank-transfer/bulk-save.do', data);
}
