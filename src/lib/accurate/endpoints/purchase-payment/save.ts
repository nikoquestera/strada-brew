import { accurateClient } from '../../client';

/**
 * /api/purchase-payment/save.do
 * Membuat data Pembayaran Pembelian baru atau mengedit data Pembayaran Pembelian yang sudah ada
 */
export async function purchasePaymentSave(data: any) {
  return accurateClient.post('/api/purchase-payment/save.do', data);
}
