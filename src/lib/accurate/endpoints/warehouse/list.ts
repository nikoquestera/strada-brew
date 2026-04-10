import { accurateClient } from '../../client';

/**
 * /api/warehouse/list.do
 * Melihat daftar data Gudang, dengan filter yang sesuai
 */
export async function warehouseList(params: any) {
  return accurateClient.get('/api/warehouse/list.do', { params });
}
