import { accurateClient } from '../../client';

/**
 * /api/branch/detail.do
 * Melihat detil data Cabang berdasarkan id atau identifier tertentu
 */
export async function branchDetail(params: any) {
  return accurateClient.get('/api/branch/detail.do', { params });
}
