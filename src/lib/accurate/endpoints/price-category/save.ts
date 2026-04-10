import { accurateClient } from '../../client';

/**
 * /api/price-category/save.do
 * Membuat data Kategori Penjualan baru atau mengedit data Kategori Penjualan yang sudah ada
 */
export async function priceCategorySave(data: any) {
  return accurateClient.post('/api/price-category/save.do', data);
}
