import { apiRequest } from './auth';

export type Supplier = {
  id: number;
  name: string;
  contact_name: string;
  email: string;
  phone: string;
  address: string;
  is_active: boolean;
};

export type PurchaseOrderLine = {
  id: number;
  variant_id: number;
  variant_sku: string;
  quantity_ordered: number;
  quantity_received: number;
  unit_cost: string;
};

export type PurchaseOrder = {
  id: number;
  order_number: string;
  supplier_id: number;
  supplier_name: string;
  location_id: number;
  location_name: string;
  status: 'draft' | 'ordered' | 'partially_received' | 'received' | 'cancelled';
  expected_date: string | null;
  cancellation_reason: string;
  lines: PurchaseOrderLine[];
  created_at: string;
};

export async function fetchSuppliers(): Promise<Supplier[]> {
  const response = await apiRequest<{ results: Supplier[] }>('/purchasing/suppliers/');
  return response.results;
}

export async function createSupplier(name: string, phone: string): Promise<Supplier> {
  return apiRequest<Supplier>('/purchasing/suppliers/', {
    method: 'POST',
    body: JSON.stringify({ name, phone }),
  });
}

export async function fetchPurchaseOrders(): Promise<PurchaseOrder[]> {
  const response = await apiRequest<{ results: PurchaseOrder[] }>('/purchasing/orders/');
  return response.results;
}

export async function createPurchaseOrder(payload: {
  supplier_id: number;
  location_id: number;
  idempotency_key: string;
  lines: { variant_id: number; quantity_ordered: number; unit_cost: string }[];
}): Promise<PurchaseOrder> {
  return apiRequest<PurchaseOrder>('/purchasing/orders/', { method: 'POST', body: JSON.stringify(payload) });
}

export async function placePurchaseOrder(id: number): Promise<PurchaseOrder> {
  return apiRequest<PurchaseOrder>(`/purchasing/orders/${id}/place/`, { method: 'POST', body: JSON.stringify({}) });
}

export async function receivePurchaseOrderLine(id: number, payload: {
  line_id: number;
  quantity: number;
  batch_number: string;
  idempotency_key: string;
}): Promise<{ replayed: boolean }> {
  return apiRequest(`/purchasing/orders/${id}/receive/`, { method: 'POST', body: JSON.stringify(payload) });
}

export async function cancelPurchaseOrder(id: number, reason: string): Promise<PurchaseOrder> {
  return apiRequest<PurchaseOrder>(`/purchasing/orders/${id}/cancel/`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  });
}
