import { accurateClient } from '../../client';

/**
 * /api/work-order/list.do
 * Melihat daftar data Perintah Kerja, dengan filter yang sesuai
 */
export async function workOrderList(params: any) {
  return accurateClient.get('/api/work-order/list.do', { params });
}
