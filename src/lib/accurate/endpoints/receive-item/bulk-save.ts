import { accurateClient } from '../../client';

/**
 * /api/receive-item/bulk-save.do
 * Membuat mengedit beberapa data Penerimaan Barang sekaligus (Max: 100 data dalam 1 kali request). Ganti nama parameter "[n]" dengan index data mulai dari nol (Cth: data[0], data[1], dst.) pada parameter request.
 */
export async function receiveItemBulkSave(data: any) {
  return accurateClient.post('/api/receive-item/bulk-save.do', data);
}
