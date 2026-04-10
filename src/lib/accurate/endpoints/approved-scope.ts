import { accurateClient } from '../../client';

/**
 * /api/approved-scope.do
 * Daftar scope OAuth2 yang telah disetujui oleh pengguna untuk token yang sedang digunakan
 */
export async function approvedScope(params: any) {
  return accurateClient.get('/api/approved-scope.do', { params });
}
