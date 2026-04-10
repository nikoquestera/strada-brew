import { accurateClient } from '../../client';

/**
 * /api/data-classification/save.do
 * Membuat data Kategori Keuangan baru atau mengedit data Kategori Keuangan yang sudah ada
 */
export async function dataClassificationSave(data: any) {
  return accurateClient.post('/api/data-classification/save.do', data);
}
