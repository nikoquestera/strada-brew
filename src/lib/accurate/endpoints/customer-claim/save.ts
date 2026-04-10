import { accurateClient } from '../../client';

/**
 * /api/customer-claim/save.do
 * Membuat data Klaim Pelanggan baru atau mengedit data Klaim Pelanggan yang sudah ada
 */
export async function customerClaimSave(data: any) {
  return accurateClient.post('/api/customer-claim/save.do', data);
}
