import { accurateClient } from '../../client';

/**
 * /api/item/list.do
 * Melihat daftar data Barang & Jasa, dengan filter yang sesuai
 */
export async function itemList(params: any) {
  return accurateClient.get('/api/item/list.do', { params });
}
