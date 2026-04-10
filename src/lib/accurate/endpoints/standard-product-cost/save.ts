import { accurateClient } from '../../client';

/**
 * /api/standard-product-cost/save.do
 * Membuat data Standar Biaya Produksi baru atau mengedit data Standar Biaya Produksi yang sudah ada
 */
export async function standardProductCostSave(data: any) {
  return accurateClient.post('/api/standard-product-cost/save.do', data);
}
