import { accurateClient } from '../../client';

/**
 * /api/purchase-requisition/list.do
 * Melihat daftar data Permintaan Barang, dengan filter yang sesuai
 */
export async function purchaseRequisitionList(params: any) {
  return accurateClient.get('/api/purchase-requisition/list.do', { params });
}
