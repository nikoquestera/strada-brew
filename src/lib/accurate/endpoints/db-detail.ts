import { accurateClient } from '../client';

/**
 * /api/db-detail.do
 * Detil informasi database
 */
export async function dbDetail(params: any) {
  return accurateClient.get('/api/db-detail.do', { params });
}
