import { accurateClient } from '../../client';

/**
 * /api/fob/list.do
 * Melihat daftar data FOB, dengan filter yang sesuai
 */
export async function fobList(params: any) {
  return accurateClient.get('/api/fob/list.do', { params });
}
