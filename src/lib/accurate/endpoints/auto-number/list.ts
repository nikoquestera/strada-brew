import { accurateClient } from '../../client';

/**
 * /api/auto-number/list.do
 * Melihat daftar data Penomoran, dengan filter yang sesuai
 */
export async function autoNumberList(params: any) {
  return accurateClient.get('/api/auto-number/list.do', { params });
}
