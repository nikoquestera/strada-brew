import { accurateClient } from '../../client';

/**
 * /api/vendor-category/detail.do
 * Melihat detil data Kategori Pemasok berdasarkan id atau identifier tertentu
 */
export async function vendorCategoryDetail(params: any) {
  return accurateClient.get('/api/vendor-category/detail.do', { params });
}
