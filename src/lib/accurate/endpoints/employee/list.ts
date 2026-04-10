import { accurateClient } from '../../client';

/**
 * /api/employee/list.do
 * Melihat daftar data Karyawan, dengan filter yang sesuai
 */
export async function employeeList(params: any) {
  return accurateClient.get('/api/employee/list.do', { params });
}
