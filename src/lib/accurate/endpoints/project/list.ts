import { accurateClient } from '../../client';

/**
 * /api/project/list.do
 * Melihat daftar data Proyek, dengan filter yang sesuai
 */
export async function projectList(params: any) {
  return accurateClient.get('/api/project/list.do', { params });
}
