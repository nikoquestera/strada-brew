import { accurateClient } from '../../client';

/**
 * /api/payment-term/detail.do
 * Melihat detil data Syarat Pembayaran berdasarkan id atau identifier tertentu
 */
export async function paymentTermDetail(params: any) {
  return accurateClient.get('/api/payment-term/detail.do', { params });
}
