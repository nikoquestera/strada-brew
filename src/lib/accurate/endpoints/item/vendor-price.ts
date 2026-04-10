import { accurateClient } from '../../client';

/**
 * /api/item/vendor-price.do
 * Melihat harga beli terakhir dari suatu pemasok
 */
export async function itemVendorPrice(params: any) {
  return accurateClient.get('/api/item/vendor-price.do', { params });
}
