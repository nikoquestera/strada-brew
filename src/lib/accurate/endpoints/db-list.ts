import { accurateClient } from '../../client';

/**
 * /api/db-list.do
 * Daftar data usaha yang dapat diakses
 */
export async function dbList(params: any) {
  return accurateClient.get('/api/db-list.do', { params });
}
