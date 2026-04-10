import { accurateClient } from '../../client';

/**
 * /api/item-category/bulk-save.do
 * Membuat mengedit beberapa data Kategori Barang sekaligus (Max: 100 data dalam 1 kali request). Ganti nama parameter "[n]" dengan index data mulai dari nol (Cth: data[0], data[1], dst.) pada parameter request.
 */
export async function itemCategoryBulkSave(data: any) {
  return accurateClient.post('/api/item-category/bulk-save.do', data);
}
