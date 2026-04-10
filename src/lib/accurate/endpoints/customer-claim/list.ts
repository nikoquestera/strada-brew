import { accurateClient } from '../../client';

/**
 * /api/customer-claim/list.do
 * Melihat daftar data Klaim Pelanggan, dengan filter yang sesuai
 */
export async function customerClaimList(params: any) {
  return accurateClient.get('/api/customer-claim/list.do', { params });
}
