import { accurateClient } from '../../client';

/**
 * /api/customer/detail.do
 * Melihat detil data Pelanggan berdasarkan id atau identifier tertentu
 */
export async function customerDetail(params: any) {
  return accurateClient.get('/api/customer/detail.do', { params });
}
