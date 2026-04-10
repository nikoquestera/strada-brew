import { accurateClient } from '../../client';

/**
 * /api/vendor/detail.do
 * Melihat detil data Pemasok berdasarkan id atau identifier tertentu
 */
export async function vendorDetail(params: any) {
  return accurateClient.get('/api/vendor/detail.do', { params });
}
