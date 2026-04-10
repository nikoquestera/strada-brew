import { accurateClient } from '../../client';

/**
 * /api/fob/detail.do
 * Melihat detil data FOB berdasarkan id atau identifier tertentu
 */
export async function fobDetail(params: any) {
  return accurateClient.get('/api/fob/detail.do', { params });
}
