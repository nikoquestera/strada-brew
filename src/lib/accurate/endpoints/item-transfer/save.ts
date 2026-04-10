import { accurateClient } from '../../client';

/**
 * /api/item-transfer/save.do
 * Membuat data Pemindahan Barang baru atau mengedit data Pemindahan Barang yang sudah ada
 */
export async function itemTransferSave(data: any) {
  return accurateClient.post('/api/item-transfer/save.do', data);
}
