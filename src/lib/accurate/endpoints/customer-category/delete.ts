import { accurateClient } from '../../client';

/**
 * /api/customer-category/delete.do
 * Menghapus data Kategori Pelanggan berdasarkan id tertentu
 */
export async function customerCategoryDelete(params: any) {
  return accurateClient.delete('/api/customer-category/delete.do', params);
}
