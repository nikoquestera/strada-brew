import { accurateClient } from '../../client';

/**
 * /api/bill-of-material/save.do
 * Membuat data Formula Produksi baru atau mengedit data Formula Produksi yang sudah ada
 */
export async function billOfMaterialSave(data: any) {
  return accurateClient.post('/api/bill-of-material/save.do', data);
}
