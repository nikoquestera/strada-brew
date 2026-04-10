import { accurateClient } from '../../client';

/**
 * /api/vendor-price/list.do
 * Melihat daftar data Harga Pemasok, dengan filter yang sesuai
 */
export async function vendorPriceList(params: any) {
  return accurateClient.get('/api/vendor-price/list.do', { params });
}
