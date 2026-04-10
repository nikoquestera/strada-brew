import { accurateClient } from '../../client';

/**
 * /api/finished-good-slip/detail.do
 * Melihat detil data Penyelesaian Barang Jadi berdasarkan id atau identifier tertentu
 */
export async function finishedGoodSlipDetail(params: any) {
  return accurateClient.get('/api/finished-good-slip/detail.do', { params });
}
