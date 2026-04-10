import { accurateClient } from '../../client';

/**
 * /api/glaccount/list.do
 * Melihat daftar data Akun Perkiraan, dengan filter yang sesuai
 */
export async function glaccountList(params: any) {
  return accurateClient.get('/api/glaccount/list.do', { params });
}
