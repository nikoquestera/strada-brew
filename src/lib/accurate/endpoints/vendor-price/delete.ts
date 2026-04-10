import { accurateClient } from '../../client';

/**
 * /api/vendor-price/delete.do
 * Menghapus data Harga Pemasok berdasarkan id tertentu
 */
export async function vendorPriceDelete(params: any) {
  return accurateClient.delete('/api/vendor-price/delete.do', params);
}
