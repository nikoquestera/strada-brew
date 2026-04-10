import { accurateClient } from '../../client';

/**
 * /api/fob/delete.do
 * Menghapus data FOB berdasarkan id tertentu
 */
export async function fobDelete(params: any) {
  return accurateClient.delete('/api/fob/delete.do', params);
}
