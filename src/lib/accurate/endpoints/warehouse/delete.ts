import { accurateClient } from '../../client';

/**
 * /api/warehouse/delete.do
 * Melihat detil data Gudang berdasarkan id atau identifier tertentu
 */
export async function warehouseDelete(params: any) {
  return accurateClient.delete('/api/warehouse/delete.do', params);
}
