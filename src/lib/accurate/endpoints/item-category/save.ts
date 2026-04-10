import { accurateClient } from '../../client';

/**
 * /api/item-category/save.do
 * Membuat data Kategori Barang baru atau mengedit data Kategori Barang yang sudah ada
 */
export async function itemCategorySave(data: any) {
  return accurateClient.post('/api/item-category/save.do', data);
}
