import { accurateClient } from '../../client';

/**
 * /api/wo-pic/save.do
 * Membuat data Penanggung Jawab baru atau mengedit data Penanggung Jawab yang sudah ada
 */
export async function woPicSave(data: any) {
  return accurateClient.post('/api/wo-pic/save.do', data);
}
