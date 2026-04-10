import { accurateClient } from '../../client';

/**
 * /api/glaccount/get-bs-account-amount.do
 * Melihat saldo akun Neraca per tanggal tertentu
 */
export async function glaccountGetBsAccountAmount(params: any) {
  return accurateClient.get('/api/glaccount/get-bs-account-amount.do', { params });
}
