import { accurateClient } from '../../client';

/**
 * /api/customer-category/bulk-save.do
 * Membuat mengedit beberapa data Kategori Pelanggan sekaligus (Max: 100 data dalam 1 kali request). Ganti nama parameter "[n]" dengan index data mulai dari nol (Cth: data[0], data[1], dst.) pada parameter request.
 */
export async function customerCategoryBulkSave(data: any) {
  return accurateClient.post('/api/customer-category/bulk-save.do', data);
}
