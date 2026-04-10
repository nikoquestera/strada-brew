import { accurateClient } from '../../client';

/**
 * /api/sellingprice-adjustment/delete.do
 * Menghapus data Penyesuaian Harga/Diskon berdasarkan id tertentu
 */
export async function sellingpriceAdjustmentDelete(params: any) {
  return accurateClient.delete('/api/sellingprice-adjustment/delete.do', params);
}
