import { accurateClient } from '../../client';

/**
 * /api/other-payment/detail.do
 * Melihat detil data Pembayaran berdasarkan id atau identifier tertentu
 */
export async function otherPaymentDetail(params: any) {
  return accurateClient.get('/api/other-payment/detail.do', { params });
}
