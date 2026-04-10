import { accurateClient } from '../../client';

/**
 * /api/job-order/detail.do
 * Melihat detil data Pekerjaan Pesanan berdasarkan id atau identifier tertentu
 */
export async function jobOrderDetail(params: any) {
  return accurateClient.get('/api/job-order/detail.do', { params });
}
