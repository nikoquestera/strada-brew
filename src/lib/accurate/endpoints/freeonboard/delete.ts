import { accurateClient } from '../../client';

/**
 * /api/freeonboard/delete.do
 * Menghapus data FOB berdasarkan id tertentu
 */
export async function freeonboardDelete(params: any) {
  return accurateClient.delete('/api/freeonboard/delete.do', params);
}
