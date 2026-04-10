import { accurateClient } from '../../client';

/**
 * /api/work-order/save.do
 * Membuat data Perintah Kerja baru atau mengedit data Perintah Kerja yang sudah ada
 */
export async function workOrderSave(data: any) {
  return accurateClient.post('/api/work-order/save.do', data);
}
