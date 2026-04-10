import { accurateClient } from '../../client';

/**
 * /api/open-db.do
 * Mengakses database
 */
export async function openDb(params: any) {
  return accurateClient.get('/api/open-db.do', { params });
}
