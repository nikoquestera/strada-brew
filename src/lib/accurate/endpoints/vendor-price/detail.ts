import { accurateClient } from '../../client';

/**
 * /api/vendor-price/detail.do
 * Melihat detil data Harga Pemasok berdasarkan id atau identifier tertentu
 */
export async function vendorPriceDetail(params: any) {
  return accurateClient.get('/api/vendor-price/detail.do', { params });
}
