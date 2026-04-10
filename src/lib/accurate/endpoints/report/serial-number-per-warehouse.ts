import { accurateClient } from '../../client';

/**
 * /api/report/serial-number-per-warehouse.do
 * Melihat daftar data No. Seri/Produksi, dengan filter yang sesuai
 */
export async function reportSerialNumberPerWarehouse(params: any) {
  return accurateClient.get('/api/report/serial-number-per-warehouse.do', { params });
}
