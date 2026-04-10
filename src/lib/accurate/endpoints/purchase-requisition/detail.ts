import { accurateClient } from '../../client';

/**
 * /api/purchase-requisition/detail.do
 * Melihat detil data Permintaan Barang berdasarkan id atau identifier tertentu
 */
export async function purchaseRequisitionDetail(params: any) {
  return accurateClient.get('/api/purchase-requisition/detail.do', { params });
}
