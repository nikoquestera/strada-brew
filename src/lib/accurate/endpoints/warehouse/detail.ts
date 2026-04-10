import { accurateClient } from '../../client';

/**
 * /api/warehouse/detail.do
 * Melihat detil data Gudang berdasarkan id atau identifier tertentu
 */
export async function warehouseDetail(params: any) {
  return accurateClient.get('/api/warehouse/detail.do', { params });
}
