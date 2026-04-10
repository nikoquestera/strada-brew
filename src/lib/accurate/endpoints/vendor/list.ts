import { accurateClient } from '../../client';

/**
 * /api/vendor/list.do
 * Melihat daftar data Pemasok, dengan filter yang sesuai
 */
export async function vendorList(params: any) {
  return accurateClient.get('/api/vendor/list.do', { params });
}
