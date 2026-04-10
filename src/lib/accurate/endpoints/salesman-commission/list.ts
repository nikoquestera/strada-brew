import { accurateClient } from '../../client';

/**
 * /api/salesman-commission/list.do
 * Melihat daftar data Komisi Penjual, dengan filter yang sesuai
 */
export async function salesmanCommissionList(params: any) {
  return accurateClient.get('/api/salesman-commission/list.do', { params });
}
