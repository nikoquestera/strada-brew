import { accurateClient } from '../../client';

/**
 * /api/item/search-by-item-or-sn.do
 * Melihat daftar data Barang & Jasa, dengan filter yang sesuai
 */
export async function itemSearchByItemOrSn(params: any) {
  return accurateClient.get('/api/item/search-by-item-or-sn.do', { params });
}
