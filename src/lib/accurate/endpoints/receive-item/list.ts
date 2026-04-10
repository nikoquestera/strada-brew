import { accurateClient } from '../../client';

/**
 * /api/receive-item/list.do
 * Melihat daftar data Penerimaan Barang, dengan filter yang sesuai
 */
export async function receiveItemList(params: any) {
  return accurateClient.get('/api/receive-item/list.do', { params });
}
