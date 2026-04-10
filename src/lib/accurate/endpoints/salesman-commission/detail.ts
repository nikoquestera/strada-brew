import { accurateClient } from '../../client';

/**
 * /api/salesman-commission/detail.do
 * Melihat detil data Komisi Penjual berdasarkan id atau identifier tertentu
 */
export async function salesmanCommissionDetail(params: any) {
  return accurateClient.get('/api/salesman-commission/detail.do', { params });
}
