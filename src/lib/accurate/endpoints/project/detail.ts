import { accurateClient } from '../../client';

/**
 * /api/project/detail.do
 * Melihat detil data Proyek berdasarkan id atau identifier tertentu
 */
export async function projectDetail(params: any) {
  return accurateClient.get('/api/project/detail.do', { params });
}
