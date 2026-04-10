import { accurateClient } from '../../client';

/**
 * /api/item-transfer/bulk-save.do
 * Membuat mengedit beberapa data Pemindahan Barang sekaligus (Max: 100 data dalam 1 kali request). Ganti nama parameter "[n]" dengan index data mulai dari nol (Cth: data[0], data[1], dst.) pada parameter request.
 */
export async function itemTransferBulkSave(data: any) {
  return accurateClient.post('/api/item-transfer/bulk-save.do', data);
}
