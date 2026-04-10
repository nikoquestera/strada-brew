import { accurateClient } from '../../client';

/**
 * /api/freeonboard/list.do
 * Melihat daftar data FOB, dengan filter yang sesuai
 */
export async function freeonboardList(params: any) {
  return accurateClient.get('/api/freeonboard/list.do', { params });
}
