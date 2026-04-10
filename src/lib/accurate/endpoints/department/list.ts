import { accurateClient } from '../../client';

/**
 * /api/department/list.do
 * Melihat daftar data Departemen, dengan filter yang sesuai
 */
export async function departmentList(params: any) {
  return accurateClient.get('/api/department/list.do', { params });
}
