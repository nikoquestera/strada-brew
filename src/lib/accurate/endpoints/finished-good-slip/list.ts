import { accurateClient } from '../../client';

/**
 * /api/finished-good-slip/list.do
 * Melihat daftar data Penyelesaian Barang Jadi, dengan filter yang sesuai
 */
export async function finishedGoodSlipList(params: any) {
  return accurateClient.get('/api/finished-good-slip/list.do', { params });
}
