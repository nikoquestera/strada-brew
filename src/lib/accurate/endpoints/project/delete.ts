import { accurateClient } from '../../client';

/**
 * /api/project/delete.do
 * Menghapus data Proyek berdasarkan id tertentu
 */
export async function projectDelete(params: any) {
  return accurateClient.delete('/api/project/delete.do', params);
}
