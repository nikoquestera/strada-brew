import { accurateClient } from '../../client';

/**
 * /api/project/save.do
 * Membuat data Proyek baru atau mengedit data Proyek yang sudah ada
 */
export async function projectSave(data: any) {
  return accurateClient.post('/api/project/save.do', data);
}
