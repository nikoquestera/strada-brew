import { accurateClient } from '../../client';

/**
 * /api/customer/delete.do
 * Melihat detil data Pelanggan berdasarkan id atau identifier tertentu
 */
export async function customerDelete(params: any) {
  return accurateClient.delete('/api/customer/delete.do', params);
}
