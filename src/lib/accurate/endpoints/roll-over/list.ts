import { accurateClient } from '../../client';

/**
 * /api/roll-over/list.do
 * Melihat daftar data Penyelesaian Pesanan, dengan filter yang sesuai
 */
export async function rollOverList(params: any) {
  return accurateClient.get('/api/roll-over/list.do', { params });
}
