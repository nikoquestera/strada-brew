import { accurateClient } from '../../client';

/**
 * /api/other-deposit/delete.do
 * Menghapus data Penerimaan berdasarkan id tertentu
 */
export async function otherDepositDelete(params: any) {
  return accurateClient.delete('/api/other-deposit/delete.do', params);
}
