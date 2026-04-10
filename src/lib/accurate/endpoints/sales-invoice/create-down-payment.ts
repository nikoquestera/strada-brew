import { accurateClient } from '../../client';

/**
 * /api/sales-invoice/create-down-payment.do
 * Membuat data Uang Muka Penjualan baru atau mengedit data Uang Muka Penjualan yang sudah ada
 */
export async function salesInvoiceCreateDownPayment(data: any) {
  return accurateClient.post('/api/sales-invoice/create-down-payment.do', data);
}
