import { accurateClient } from '../../client';

/**
 * /api/report/serial-number-mutation.do
 * Melihat daftar data No. Seri/Produksi, dengan filter yang sesuai
 */
export async function reportSerialNumberMutation(params: any) {
  return accurateClient.get('/api/report/serial-number-mutation.do', { params });
}
