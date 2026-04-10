import { accurateClient } from '../../client';

/**
 * /api/access-privilege/list.do
 * Melihat daftar data Akses Grup, dengan filter yang sesuai
 */
export async function accessPrivilegeList(params: any) {
  return accurateClient.get('/api/access-privilege/list.do', { params });
}
