import { accurateClient } from '../../client';

/**
 * /api/wo-pic/list.do
 * Melihat daftar data Penanggung Jawab, dengan filter yang sesuai
 */
export async function woPicList(params: any) {
  return accurateClient.get('/api/wo-pic/list.do', { params });
}
