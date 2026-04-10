import { accurateClient } from '../../client';

/**
 * /api/access-privilege/detail.do
 * Melihat detil data Akses Grup berdasarkan id atau identifier tertentu
 */
export async function accessPrivilegeDetail(params: any) {
  return accurateClient.get('/api/access-privilege/detail.do', { params });
}
