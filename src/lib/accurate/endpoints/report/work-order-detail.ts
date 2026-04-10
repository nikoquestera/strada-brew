import { accurateClient } from '../../client';

/**
 * /api/report/work-order-detail.do
 * Melihat daftar data Perintah Kerja, dengan filter yang sesuai
 */
export async function reportWorkOrderDetail(params: any) {
  return accurateClient.get('/api/report/work-order-detail.do', { params });
}
