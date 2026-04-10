import { accurateClient } from '../../client';

/**
 * /api/manufacture-order/detail.do
 * Melihat detil data Rencana Produksi berdasarkan id atau identifier tertentu
 */
export async function manufactureOrderDetail(params: any) {
  return accurateClient.get('/api/manufacture-order/detail.do', { params });
}
