import { accurateClient } from '../../client';

/**
 * /api/customer-category/list.do
 * Melihat daftar data Akun Perkiraan, dengan filter yang sesuai
 */
export async function customerCategoryList(params: any) {
  return accurateClient.get('/api/customer-category/list.do', { params });
}
