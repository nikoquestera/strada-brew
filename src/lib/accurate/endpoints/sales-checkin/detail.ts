import { accurateClient } from '../../client';

/**
 * /api/sales-checkin/detail.do
 * Melihat daftar data sales-checkin.module_name, dengan filter yang sesuai
 */
export async function salesCheckinDetail(params: any) {
  return accurateClient.get('/api/sales-checkin/detail.do', { params });
}
