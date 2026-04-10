import { accurateClient } from '../../client';

/**
 * /api/freeonboard/detail.do
 * Melihat detil data FOB berdasarkan id atau identifier tertentu
 */
export async function freeonboardDetail(params: any) {
  return accurateClient.get('/api/freeonboard/detail.do', { params });
}
