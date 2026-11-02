import { apiRequest } from './auth';

export type ProductVariant = {
  id: number;
  name: string;
  sku: string;
  barcode: string;
  price: string;
  unit_cost: string | null;
  reorder_point: number;
  is_active: boolean;
};

export type Product = {
  id: number;
  name: string;
  description: string;
  category: number | null;
  category_name: string | null;
  is_active: boolean;
  variants: ProductVariant[];
  images: { id: number; image_url: string; alt_text: string; position: number }[];
};

export type InventoryStock = {
  variant_id: number;
  product_name: string;
  variant_name: string;
  sku: string;
  location_id: number;
  location_name: string;
  quantity: number;
  reorder_point: number;
  unit_cost: string | number;
  valuation: string | number;
};

export type StockLocation = { id: number; name: string; is_active: boolean };

export async function createProduct(payload: {
  name: string;
  description?: string;
  category?: number | null;
  variants: { name: string; sku: string; barcode?: string; price: string; unit_cost?: string | null; reorder_point: number }[];
}): Promise<Product> {
  return apiRequest<Product>('/catalog/products/', { method: 'POST', body: JSON.stringify(payload) });
}

export async function uploadProductImage(productId: number, uri: string, fileName: string, mimeType: string, altText: string): Promise<void> {
  const form = new FormData();
  form.append('image', { uri, name: fileName, type: mimeType } as unknown as Blob);
  form.append('alt_text', altText);
  form.append('is_primary', 'true');
  await apiRequest(`/catalog/products/${productId}/images/`, { method: 'POST', body: form });
}

export async function fetchStockLocations(): Promise<StockLocation[]> {
  const response = await apiRequest<{ results: StockLocation[] }>('/inventory/locations/');
  return response.results;
}

export async function createStockMovement(payload: {
  kind: 'receipt' | 'adjustment';
  variant_id: number;
  location_id: number;
  batch_number: string;
  expiry_date?: string;
  quantity_delta: number;
  unit_cost?: string;
  reason: string;
  idempotency_key: string;
}): Promise<unknown> {
  return apiRequest('/inventory/movements/', { method: 'POST', body: JSON.stringify(payload) });
}

export async function fetchProducts(): Promise<Product[]> {
  const response = await apiRequest<{ results: Product[] }>('/catalog/products/');
  return response.results;
}

export async function fetchInventoryStock(): Promise<InventoryStock[]> {
  const response = await apiRequest<{ results: InventoryStock[] }>('/inventory/stock/');
  return response.results;
}
