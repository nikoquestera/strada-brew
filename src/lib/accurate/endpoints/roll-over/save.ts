import { accurateClient } from '../../client';

/**
 * /api/roll-over/save.do
 * Membuat data Penyelesaian Pesanan baru atau mengedit data Penyelesaian Pesanan yang sudah ada
 */
export async function rollOverSave(data: any) {
  return accurateClient.post('/api/roll-over/save.do', data);
}
