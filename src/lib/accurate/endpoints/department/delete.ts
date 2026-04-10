import { accurateClient } from '../../client';

/**
 * /api/department/delete.do
 * Menghapus data Departemen berdasarkan id tertentu
 */
export async function departmentDelete(params: any) {
  return accurateClient.delete('/api/department/delete.do', params);
}
