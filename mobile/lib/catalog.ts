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

export type Category = { id: number; name: string; is_active: boolean };

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

export type SaleReceipt = {
  id: number;
  invoice_number: string;
  status: string;
  total: string;
  paid_amount: string;
  change_amount: string;
};

export async function createProduct(payload: {
  name: string;
  description?: string;
  category: number;
  variants: { name: string; sku: string; barcode?: string; price: string; unit_cost?: string | null; reorder_point: number }[];
}): Promise<Product> {
  return apiRequest<Product>('/catalog/products/', { method: 'POST', body: JSON.stringify(payload) });
}

export async function fetchCategories(): Promise<Category[]> {
  const response = await apiRequest<{ results: Category[] }>('/catalog/categories/');
  return response.results.filter((category) => category.is_active);
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
  return response.results.filter((location) => location.is_active);
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

export async function searchProducts(query: string): Promise<Product[]> {
  const trimmed = query.trim();
  if (!trimmed) {
    return fetchProducts();
  }

  const response = await apiRequest<{ results: Product[] }>(`/catalog/products/?search=${encodeURIComponent(trimmed)}`);
  return response.results;
}

export async function searchProductsByBarcode(barcode: string): Promise<Product[]> {
  const trimmed = barcode.trim();
  if (!trimmed) {
    return [];
  }

  const response = await apiRequest<{ results: Product[] }>(`/catalog/products/?barcode=${encodeURIComponent(trimmed)}`);
  return response.results;
}

export async function fetchProducts(): Promise<Product[]> {
  const response = await apiRequest<{ results: Product[] }>('/catalog/products/?limit=100');
  return response.results;
}

export async function fetchInventoryStock(): Promise<InventoryStock[]> {
  const response = await apiRequest<{ results: InventoryStock[] }>('/inventory/stock/');
  return response.results;
}

export async function checkoutSale(payload: {
  location_id: number;
  items: { variant_id: number; quantity: number; unit_price: string }[];
  payment_method: 'cash' | 'card' | 'bank_transfer' | 'wallet';
  amount_paid: string;
  idempotency_key: string;
}): Promise<SaleReceipt> {
  return apiRequest<SaleReceipt>('/pos/checkout/', { method: 'POST', body: JSON.stringify(payload) });
}
