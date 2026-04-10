import { accurateClient } from '../../client';

/**
 * /api/other-payment/delete.do
 * Menghapus data Pembayaran berdasarkan id tertentu
 */
export async function otherPaymentDelete(params: any) {
  return accurateClient.delete('/api/other-payment/delete.do', params);
}
