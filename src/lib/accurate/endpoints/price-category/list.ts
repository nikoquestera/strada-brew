import { accurateClient } from '../../client';

/**
 * /api/price-category/list.do
 * Melihat daftar data Kategori Penjualan, dengan filter yang sesuai
 */
export async function priceCategoryList(params: any) {
  return accurateClient.get('/api/price-category/list.do', { params });
}
