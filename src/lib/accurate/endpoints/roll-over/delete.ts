import { accurateClient } from '../../client';

/**
 * /api/roll-over/delete.do
 * Menghapus data Penyelesaian Pesanan berdasarkan id tertentu
 */
export async function rollOverDelete(params: any) {
  return accurateClient.delete('/api/roll-over/delete.do', params);
}
