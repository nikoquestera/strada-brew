import { accurateClient } from '../../client';

/**
 * /api/glaccount/delete.do
 * Menghapus data Akun Perkiraan berdasarkan id tertentu
 */
export async function glaccountDelete(params: any) {
  return accurateClient.delete('/api/glaccount/delete.do', params);
}
