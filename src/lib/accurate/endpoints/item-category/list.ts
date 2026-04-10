import { accurateClient } from '../../client';

/**
 * /api/item-category/list.do
 * Melihat daftar data Kategori Barang, dengan filter yang sesuai
 */
export async function itemCategoryList(params: any) {
  return accurateClient.get('/api/item-category/list.do', { params });
}
