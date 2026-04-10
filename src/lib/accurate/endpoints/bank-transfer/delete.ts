import { accurateClient } from '../../client';

/**
 * /api/bank-transfer/delete.do
 * Menghapus data Transfer Bank berdasarkan id tertentu
 */
export async function bankTransferDelete(params: any) {
  return accurateClient.delete('/api/bank-transfer/delete.do', params);
}
