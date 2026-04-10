import { accurateClient } from '../../client';

/**
 * /api/customer-category/save.do
 * Membuat data Kategori Pelanggan baru atau mengedit data Kategori Pelanggan yang sudah ada
 */
export async function customerCategorySave(data: any) {
  return accurateClient.post('/api/customer-category/save.do', data);
}
