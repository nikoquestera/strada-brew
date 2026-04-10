import { accurateClient } from '../../client';

/**
 * /api/vendor-category/list.do
 * Melihat daftar data Kategori Pemasok, dengan filter yang sesuai
 */
export async function vendorCategoryList(params: any) {
  return accurateClient.get('/api/vendor-category/list.do', { params });
}
