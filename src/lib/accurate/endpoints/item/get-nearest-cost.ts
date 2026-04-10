import { accurateClient } from '../../client';

/**
 * /api/item/get-nearest-cost.do
 * Melihat HPP barang pada tanggal tertentu
 */
export async function itemGetNearestCost(params: any) {
  return accurateClient.get('/api/item/get-nearest-cost.do', { params });
}
