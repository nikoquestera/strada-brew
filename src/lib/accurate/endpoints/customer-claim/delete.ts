import { accurateClient } from '../../client';

/**
 * /api/customer-claim/delete.do
 * Menghapus data Klaim Pelanggan berdasarkan id tertentu
 */
export async function customerClaimDelete(params: any) {
  return accurateClient.delete('/api/customer-claim/delete.do', params);
}
