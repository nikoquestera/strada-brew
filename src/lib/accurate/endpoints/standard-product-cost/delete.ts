import { accurateClient } from '../../client';

/**
 * /api/standard-product-cost/delete.do
 * Menghapus data Standar Biaya Produksi berdasarkan id tertentu
 */
export async function standardProductCostDelete(params: any) {
  return accurateClient.delete('/api/standard-product-cost/delete.do', params);
}
