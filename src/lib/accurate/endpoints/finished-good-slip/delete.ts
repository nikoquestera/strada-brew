import { accurateClient } from '../../client';

/**
 * /api/finished-good-slip/delete.do
 * Menghapus data Penyelesaian Barang Jadi berdasarkan id tertentu
 */
export async function finishedGoodSlipDelete(params: any) {
  return accurateClient.delete('/api/finished-good-slip/delete.do', params);
}
