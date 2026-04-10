import { accurateClient } from '../../client';

/**
 * /api/exchange-invoice/save.do
 * Membuat data Tukar Faktur baru atau mengedit data Tukar Faktur yang sudah ada
 */
export async function exchangeInvoiceSave(data: any) {
  return accurateClient.post('/api/exchange-invoice/save.do', data);
}
