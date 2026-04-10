import { accurateClient } from '../../client';

/**
 * /api/receive-item/detail.do
 * Melihat detil data Penerimaan Barang berdasarkan id atau identifier tertentu
 */
export async function receiveItemDetail(params: any) {
  return accurateClient.get('/api/receive-item/detail.do', { params });
}
