import { accurateClient } from '../../client';

/**
 * /api/price-category/detail.do
 * Melihat detil data Kategori Penjualan berdasarkan id atau identifier tertentu
 */
export async function priceCategoryDetail(params: any) {
  return accurateClient.get('/api/price-category/detail.do', { params });
}
