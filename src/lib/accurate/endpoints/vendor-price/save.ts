import { accurateClient } from '../../client';

/**
 * /api/vendor-price/save.do
 * Membuat data Harga Pemasok baru atau mengedit data Harga Pemasok yang sudah ada
 */
export async function vendorPriceSave(data: any) {
  return accurateClient.post('/api/vendor-price/save.do', data);
}
