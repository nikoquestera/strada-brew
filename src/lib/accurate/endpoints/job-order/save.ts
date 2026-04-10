import { accurateClient } from '../../client';

/**
 * /api/job-order/save.do
 * Membuat data Pekerjaan Pesanan baru atau mengedit data Pekerjaan Pesanan yang sudah ada
 */
export async function jobOrderSave(data: any) {
  return accurateClient.post('/api/job-order/save.do', data);
}
