import { accurateClient } from '../../client';

/**
 * /api/glaccount/get-balance.do
 * Melihat nilai saldo Akun Perkiraan berdasarkan per Tgl
 */
export async function glaccountGetBalance(params: any) {
  return accurateClient.get('/api/glaccount/get-balance.do', { params });
}
