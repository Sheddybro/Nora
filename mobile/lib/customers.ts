import { apiRequest } from './auth';

export type Customer = {
  id: number;
  name: string;
  email: string;
  phone: string;
  notes?: string;
  created_at: string;
};

export type CustomerInput = {
  name: string;
  email?: string;
  phone?: string;
  notes?: string;
};

export async function fetchCustomers(search = ''): Promise<Customer[]> {
  const query = search.trim();
  const params = new URLSearchParams({ limit: '100' });
  if (query) params.set('search', query);
  const response = await apiRequest<{ results: Customer[] }>(`/customers/?${params.toString()}`);
  return response.results;
}

export async function createCustomer(input: CustomerInput): Promise<Customer> {
  const payload = {
    name: input.name.trim(),
    email: input.email?.trim() ?? '',
    phone: input.phone?.trim() ?? '',
    notes: input.notes?.trim() ?? '',
  };

  return apiRequest<Customer>('/customers/', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}
