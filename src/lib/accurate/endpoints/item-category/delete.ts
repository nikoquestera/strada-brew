import { accurateClient } from '../../client';

/**
 * /api/item-category/delete.do
 * Menghapus data Kategori Barang berdasarkan id tertentu
 */
export async function itemCategoryDelete(params: any) {
  return accurateClient.delete('/api/item-category/delete.do', params);
}
