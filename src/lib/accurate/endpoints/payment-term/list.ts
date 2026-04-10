import { accurateClient } from '../../client';

/**
 * /api/payment-term/list.do
 * Melihat daftar data Syarat Pembayaran, dengan filter yang sesuai
 */
export async function paymentTermList(params: any) {
  return accurateClient.get('/api/payment-term/list.do', { params });
}
