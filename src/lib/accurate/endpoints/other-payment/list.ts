import { accurateClient } from '../../client';

/**
 * /api/other-payment/list.do
 * Melihat daftar data Pembayaran, dengan filter yang sesuai
 */
export async function otherPaymentList(params: any) {
  return accurateClient.get('/api/other-payment/list.do', { params });
}
