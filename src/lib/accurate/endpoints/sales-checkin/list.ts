import { accurateClient } from '../../client';

/**
 * /api/sales-checkin/list.do
 * Melihat daftar data Check In, dengan filter yang sesuai
 */
export async function salesCheckinList(params: any) {
  return accurateClient.get('/api/sales-checkin/list.do', { params });
}
