import { accurateClient } from '../../client';

/**
 * /api/employee/delete.do
 * Menghapus data Karyawan berdasarkan id tertentu
 */
export async function employeeDelete(params: any) {
  return accurateClient.delete('/api/employee/delete.do', params);
}
