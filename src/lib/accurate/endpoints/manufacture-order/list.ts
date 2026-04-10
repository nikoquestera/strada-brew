import { accurateClient } from '../../client';

/**
 * /api/manufacture-order/list.do
 * Melihat daftar data Rencana Produksi, dengan filter yang sesuai
 */
export async function manufactureOrderList(params: any) {
  return accurateClient.get('/api/manufacture-order/list.do', { params });
}
