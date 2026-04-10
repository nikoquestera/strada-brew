import { accurateClient } from '../../client';

/**
 * /api/purchase-payment/list.do
 * Melihat daftar data Pembayaran Pembelian, dengan filter yang sesuai
 */
export async function purchasePaymentList(params: any) {
  return accurateClient.get('/api/purchase-payment/list.do', { params });
}
