import { accurateClient } from '../../client';

/**
 * /api/item/save.do
 * Membuat data Barang & Jasa baru atau mengedit data Barang & Jasa yang sudah ada
 */
export async function itemSave(data: any) {
  return accurateClient.post('/api/item/save.do', data);
}
