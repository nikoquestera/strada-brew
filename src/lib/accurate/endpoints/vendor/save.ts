import { accurateClient } from '../../client';

/**
 * /api/vendor/save.do
 * Membuat data Pemasok baru atau mengedit data Pemasok yang sudah ada
 */
export async function vendorSave(data: any) {
  return accurateClient.post('/api/vendor/save.do', data);
}
