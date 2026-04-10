import { accurateClient } from '../../client';

/**
 * /api/receive-item/delete.do
 * Menghapus data Penerimaan Barang berdasarkan id tertentu
 */
export async function receiveItemDelete(params: any) {
  return accurateClient.delete('/api/receive-item/delete.do', params);
}
