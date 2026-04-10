import { accurateClient } from '../../client';

/**
 * /api/tax/list.do
 * Melihat daftar data Pajak, dengan filter yang sesuai
 */
export async function taxList(params: any) {
  return accurateClient.get('/api/tax/list.do', { params });
}
