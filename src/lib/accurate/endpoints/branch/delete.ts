import { accurateClient } from '../../client';

/**
 * /api/branch/delete.do
 * Menghapus data Cabang berdasarkan id tertentu
 */
export async function branchDelete(params: any) {
  return accurateClient.delete('/api/branch/delete.do', params);
}
