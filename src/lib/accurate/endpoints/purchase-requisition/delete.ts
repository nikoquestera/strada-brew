import { accurateClient } from '../../client';

/**
 * /api/purchase-requisition/delete.do
 * Menghapus data Permintaan Barang berdasarkan id tertentu
 */
export async function purchaseRequisitionDelete(params: any) {
  return accurateClient.delete('/api/purchase-requisition/delete.do', params);
}
