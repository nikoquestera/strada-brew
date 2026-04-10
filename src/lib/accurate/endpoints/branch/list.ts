import { accurateClient } from '../../client';

/**
 * /api/branch/list.do
 * Melihat daftar data Cabang, dengan filter yang sesuai
 */
export async function branchList(params: any) {
  return accurateClient.get('/api/branch/list.do', { params });
}
