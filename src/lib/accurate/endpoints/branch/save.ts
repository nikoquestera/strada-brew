import { accurateClient } from '../../client';

/**
 * /api/branch/save.do
 * Membuat data Cabang baru atau mengedit data Cabang yang sudah ada
 */
export async function branchSave(data: any) {
  return accurateClient.post('/api/branch/save.do', data);
}
