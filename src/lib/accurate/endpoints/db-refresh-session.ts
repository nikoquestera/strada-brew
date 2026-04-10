import { accurateClient } from '../../client';

/**
 * /api/db-refresh-session.do
 * Memeriksa dan mengganti Data Usaha session jika sudah tidak dapat digunakan
 */
export async function dbRefreshSession(params: any) {
  return accurateClient.get('/api/db-refresh-session.do', { params });
}
