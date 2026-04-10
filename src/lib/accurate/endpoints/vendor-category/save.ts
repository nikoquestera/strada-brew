import { accurateClient } from '../../client';

/**
 * /api/vendor-category/save.do
 * Membuat data Kategori Pemasok baru atau mengedit data Kategori Pemasok yang sudah ada
 */
export async function vendorCategorySave(data: any) {
  return accurateClient.post('/api/vendor-category/save.do', data);
}
