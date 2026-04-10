import { accurateClient } from '../../client';

/**
 * /api/unit/list.do
 * Melihat daftar data Satuan Barang, dengan filter yang sesuai
 */
export async function unitList(params: any) {
  return accurateClient.get('/api/unit/list.do', { params });
}
