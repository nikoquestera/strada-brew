import { accurateClient } from '../../client';

/**
 * /api/department/save.do
 * Membuat data Departemen baru atau mengedit data Departemen yang sudah ada
 */
export async function departmentSave(data: any) {
  return accurateClient.post('/api/department/save.do', data);
}
