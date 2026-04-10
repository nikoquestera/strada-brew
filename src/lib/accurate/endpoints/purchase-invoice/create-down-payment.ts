import { accurateClient } from '../../client';

/**
 * /api/purchase-invoice/create-down-payment.do
 * Membuat data Uang Muka Pembelian baru atau mengedit data Uang Muka Pembelian yang sudah ada
 */
export async function purchaseInvoiceCreateDownPayment(data: any) {
  return accurateClient.post('/api/purchase-invoice/create-down-payment.do', data);
}
