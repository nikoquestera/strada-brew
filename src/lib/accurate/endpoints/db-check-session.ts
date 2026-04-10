import { accurateClient } from '../../client';

/**
 * /api/db-check-session.do
 * Memeriksa apakah Data Usaha session masih dapat digunakan
 */
export async function dbCheckSession(params: any) {
  return accurateClient.get('/api/db-check-session.do', { params });
}
