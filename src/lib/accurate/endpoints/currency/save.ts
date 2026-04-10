import { accurateClient } from '../../client';

/**
 * /api/currency/save.do
 * Membuat data Mata Uang baru atau mengedit data Mata Uang yang sudah ada
 */
export async function currencySave(data: any) {
  return accurateClient.post('/api/currency/save.do', data);
}
