import { accurateClient } from '../../client';

/**
 * /api/customer-claim/detail.do
 * Melihat detil data Klaim Pelanggan berdasarkan id atau identifier tertentu
 */
export async function customerClaimDetail(params: any) {
  return accurateClient.get('/api/customer-claim/detail.do', { params });
}
