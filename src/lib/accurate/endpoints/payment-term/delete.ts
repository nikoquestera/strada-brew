import { accurateClient } from '../../client';

/**
 * /api/payment-term/delete.do
 * Menghapus data Syarat Pembayaran berdasarkan id tertentu
 */
export async function paymentTermDelete(params: any) {
  return accurateClient.delete('/api/payment-term/delete.do', params);
}
