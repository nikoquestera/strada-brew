import { accurateClient } from '../../client';

/**
 * /api/sellingprice-adjustment/list.do
 * Melihat daftar data Penyesuaian Harga/Diskon, dengan filter yang sesuai
 */
export async function sellingpriceAdjustmentList(params: any) {
  return accurateClient.get('/api/sellingprice-adjustment/list.do', { params });
}
