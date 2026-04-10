import { accurateClient } from '../../client';

/**
 * /api/fob/save.do
 * Membuat data FOB baru atau mengedit data FOB yang sudah ada
 */
export async function fobSave(data: any) {
  return accurateClient.post('/api/fob/save.do', data);
}
