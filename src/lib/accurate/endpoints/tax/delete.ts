import { accurateClient } from '../../client';

/**
 * /api/tax/delete.do
 * Menghapus data Pajak berdasarkan id tertentu
 */
export async function taxDelete(params: any) {
  return accurateClient.delete('/api/tax/delete.do', params);
}
