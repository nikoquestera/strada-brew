import { accurateClient } from '../../client';

/**
 * /api/db-status.do
 * Memeriksa status database
 */
export async function dbStatus(params: any) {
  return accurateClient.get('/api/db-status.do', { params });
}
