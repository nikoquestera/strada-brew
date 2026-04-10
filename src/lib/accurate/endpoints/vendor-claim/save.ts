import { accurateClient } from '../../client';

/**
 * /api/vendor-claim/save.do
 * Membuat data Klaim Pemasok baru atau mengedit data Klaim Pemasok yang sudah ada
 */
export async function vendorClaimSave(data: any) {
  return accurateClient.post('/api/vendor-claim/save.do', data);
}
