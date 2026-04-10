import { accurateClient } from '../../client';

/**
 * /api/vendor-claim/delete.do
 * Menghapus data Klaim Pemasok berdasarkan id tertentu
 */
export async function vendorClaimDelete(params: any) {
  return accurateClient.delete('/api/vendor-claim/delete.do', params);
}
