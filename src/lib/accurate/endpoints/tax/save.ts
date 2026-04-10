import { accurateClient } from '../../client';

/**
 * /api/tax/save.do
 * Membuat data Pajak baru atau mengedit data Pajak yang sudah ada
 */
export async function taxSave(data: any) {
  return accurateClient.post('/api/tax/save.do', data);
}
