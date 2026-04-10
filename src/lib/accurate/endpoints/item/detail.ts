import { accurateClient } from '../../client';

/**
 * /api/item/detail.do
 * Melihat detil data Barang & Jasa berdasarkan id atau identifier tertentu
 */
export async function itemDetail(params: any) {
  return accurateClient.get('/api/item/detail.do', { params });
}
