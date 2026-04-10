import { accurateClient } from '../../client';

/**
 * /api/auth-info.do
 * Informasi pengguna dari token yang sedang digunakan
 */
export async function authInfo(params: any) {
  return accurateClient.get('/api/auth-info.do', { params });
}
