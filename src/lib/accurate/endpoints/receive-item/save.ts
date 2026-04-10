import { accurateClient } from '../../client';

/**
 * /api/receive-item/save.do
 * Membuat data Penerimaan Barang baru atau mengedit data Penerimaan Barang yang sudah ada
 */
export async function receiveItemSave(data: any) {
  return accurateClient.post('/api/receive-item/save.do', data);
}
