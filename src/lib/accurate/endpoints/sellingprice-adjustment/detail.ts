import { accurateClient } from '../../client';

/**
 * /api/sellingprice-adjustment/detail.do
 * Melihat detil data Penyesuaian Harga/Diskon berdasarkan id atau identifier tertentu
 */
export async function sellingpriceAdjustmentDetail(params: any) {
  return accurateClient.get('/api/sellingprice-adjustment/detail.do', { params });
}
