import { accurateClient } from '../../client';

/**
 * /api/glaccount/save.do
 * Membuat data Akun Perkiraan baru atau mengedit data Akun Perkiraan yang sudah ada
 */
export async function glaccountSave(data: any) {
  return accurateClient.post('/api/glaccount/save.do', data);
}
