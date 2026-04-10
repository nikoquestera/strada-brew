import { accurateClient } from '../../client';

/**
 * /api/work-order/detail.do
 * Melihat detil data Perintah Kerja berdasarkan id atau identifier tertentu
 */
export async function workOrderDetail(params: any) {
  return accurateClient.get('/api/work-order/detail.do', { params });
}
