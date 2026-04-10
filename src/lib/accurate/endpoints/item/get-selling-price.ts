import { accurateClient } from '../../client';

/**
 * /api/item/get-selling-price.do
 * Melihat Harga dan Diskon barang
 */
export async function itemGetSellingPrice(params: any) {
  return accurateClient.get('/api/item/get-selling-price.do', { params });
}
