import { accurateClient } from '../../client';

/**
 * /api/userinfo.do
 * Informasi OAuth2 Claim dari pengguna yang digunakan
 */
export async function userinfo(params: any) {
  return accurateClient.get('/api/userinfo.do', { params });
}
