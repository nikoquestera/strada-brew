import { accurateClient } from '../../client';

/**
 * /api/wo-pic/delete.do
 * Menghapus data Penanggung Jawab berdasarkan id tertentu
 */
export async function woPicDelete(params: any) {
  return accurateClient.delete('/api/wo-pic/delete.do', params);
}
