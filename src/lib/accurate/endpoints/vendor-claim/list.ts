import { accurateClient } from '../../client';

/**
 * /api/vendor-claim/list.do
 * Melihat daftar data Klaim Pemasok, dengan filter yang sesuai
 */
export async function vendorClaimList(params: any) {
  return accurateClient.get('/api/vendor-claim/list.do', { params });
}
