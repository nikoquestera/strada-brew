import { accurateClient } from '../../client';

/**
 * /api/item-category/detail.do
 * Melihat detil data Kategori Barang berdasarkan id atau identifier tertentu
 */
export async function itemCategoryDetail(params: any) {
  return accurateClient.get('/api/item-category/detail.do', { params });
}
