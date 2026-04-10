import { accurateClient } from '../../client';

/**
 * /api/glaccount/get-pl-account-amount.do
 * Melihat saldo akun Laba Rugi dalam periode tertentu
 */
export async function glaccountGetPlAccountAmount(params: any) {
  return accurateClient.get('/api/glaccount/get-pl-account-amount.do', { params });
}
