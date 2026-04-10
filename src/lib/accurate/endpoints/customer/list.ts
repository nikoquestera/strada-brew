import { accurateClient } from '../../client';

/**
 * /api/customer/list.do
 * Melihat daftar data Pelanggan, dengan filter yang sesuai
 */
export async function customerList(params: any) {
  return accurateClient.get('/api/customer/list.do', { params });
}
