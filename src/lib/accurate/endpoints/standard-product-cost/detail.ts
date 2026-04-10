import { accurateClient } from '../../client';

/**
 * /api/standard-product-cost/detail.do
 * Melihat detil data Standar Biaya Produksi berdasarkan id atau identifier tertentu
 */
export async function standardProductCostDetail(params: any) {
  return accurateClient.get('/api/standard-product-cost/detail.do', { params });
}
