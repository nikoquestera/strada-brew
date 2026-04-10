import { accurateClient } from '../../client';

/**
 * /api/vendor-claim/detail.do
 * Melihat detil data Klaim Pemasok berdasarkan id atau identifier tertentu
 */
export async function vendorClaimDetail(params: any) {
  return accurateClient.get('/api/vendor-claim/detail.do', { params });
}
