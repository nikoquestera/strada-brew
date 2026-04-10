import { accurateClient } from '../../client';

/**
 * /api/customer/save.do
 * Membuat data Pelanggan baru atau mengedit data Pelanggan yang sudah ada
 */
export async function customerSave(data: any) {
  return accurateClient.post('/api/customer/save.do', data);
}
