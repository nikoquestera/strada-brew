import { accurateClient } from '../../client';

/**
 * /api/vendor-category/delete.do
 * Melihat detil data Kategori Pemasok berdasarkan id atau identifier tertentu
 */
export async function vendorCategoryDelete(params: any) {
  return accurateClient.delete('/api/vendor-category/delete.do', params);
}
