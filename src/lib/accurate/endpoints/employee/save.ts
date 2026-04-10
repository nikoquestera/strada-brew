import { accurateClient } from '../../client';

/**
 * /api/employee/save.do
 * Membuat data Karyawan baru atau mengedit data Karyawan yang sudah ada
 */
export async function employeeSave(data: any) {
  return accurateClient.post('/api/employee/save.do', data);
}
