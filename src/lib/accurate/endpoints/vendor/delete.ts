import { accurateClient } from '../../client';

/**
 * /api/vendor/delete.do
 * Melihat detil data Pemasok berdasarkan id atau identifier tertentu
 */
export async function vendorDelete(params: any) {
  return accurateClient.delete('/api/vendor/delete.do', params);
}
