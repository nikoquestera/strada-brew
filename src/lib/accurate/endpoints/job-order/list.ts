import { accurateClient } from '../../client';

/**
 * /api/job-order/list.do
 * Melihat daftar data Pekerjaan Pesanan, dengan filter yang sesuai
 */
export async function jobOrderList(params: any) {
  return accurateClient.get('/api/job-order/list.do', { params });
}
