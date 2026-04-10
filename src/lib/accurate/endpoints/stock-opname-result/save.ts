import { accurateClient } from '../../client';

/**
 * /api/stock-opname-result/save.do
 * Membuat data Hasil Stok Opname baru atau mengedit data Hasil Stok Opname yang sudah ada
 */
export async function stockOpnameResultSave(data: any) {
  return accurateClient.post('/api/stock-opname-result/save.do', data);
}
