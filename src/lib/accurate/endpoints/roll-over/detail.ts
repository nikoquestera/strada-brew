import { accurateClient } from '../../client';

/**
 * /api/roll-over/detail.do
 * Melihat detil data Penyelesaian Pesanan berdasarkan id atau identifier tertentu
 */
export async function rollOverDetail(params: any) {
  return accurateClient.get('/api/roll-over/detail.do', { params });
}
