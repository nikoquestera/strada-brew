import { accurateClient } from '../../client';

/**
 * /api/customer-category/detail.do
 * Melihat detil data Akun Perkiraan berdasarkan id atau identifier tertentu
 */
export async function customerCategoryDetail(params: any) {
  return accurateClient.get('/api/customer-category/detail.do', { params });
}
