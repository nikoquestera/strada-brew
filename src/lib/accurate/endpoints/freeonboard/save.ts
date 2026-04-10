import { accurateClient } from '../../client';

/**
 * /api/freeonboard/save.do
 * Membuat data FOB baru atau mengedit data FOB yang sudah ada
 */
export async function freeonboardSave(data: any) {
  return accurateClient.post('/api/freeonboard/save.do', data);
}
