import { accurateClient } from '../../client';

/**
 * /api/standard-product-cost/list.do
 * Melihat daftar data Standar Biaya Produksi, dengan filter yang sesuai
 */
export async function standardProductCostList(params: any) {
  return accurateClient.get('/api/standard-product-cost/list.do', { params });
}
