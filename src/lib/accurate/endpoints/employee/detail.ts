import { accurateClient } from '../../client';

/**
 * /api/employee/detail.do
 * Melihat detil data Karyawan berdasarkan id atau identifier tertentu
 */
export async function employeeDetail(params: any) {
  return accurateClient.get('/api/employee/detail.do', { params });
}
