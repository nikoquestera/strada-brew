import { accurateClient } from '../../client';

/**
 * /api/glaccount/detail.do
 * Melihat detil data Akun Perkiraan berdasarkan id atau identifier tertentu
 */
export async function glaccountDetail(params: any) {
  return accurateClient.get('/api/glaccount/detail.do', { params });
}
