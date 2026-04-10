import { accurateClient } from '../../client';

/**
 * /api/unit/save.do
 * Membuat data Satuan Barang baru atau mengedit data Satuan Barang yang sudah ada
 */
export async function unitSave(data: any) {
  return accurateClient.post('/api/unit/save.do', data);
}
