import { accurateClient } from '../../client';

/**
 * /api/department/detail.do
 * Melihat detil data Departemen berdasarkan id atau identifier tertentu
 */
export async function departmentDetail(params: any) {
  return accurateClient.get('/api/department/detail.do', { params });
}
