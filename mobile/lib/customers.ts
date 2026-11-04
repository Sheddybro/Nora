import { apiRequest } from './auth';

export type Customer = {
  id: number;
  name: string;
  email: string;
  phone: string;
  created_at: string;
};

export async function fetchCustomers(search = ''): Promise<Customer[]> {
  const query = search.trim();
  const params = new URLSearchParams({ limit: '100' });
  if (query) params.set('search', query);
  const response = await apiRequest<{ results: Customer[] }>(`/customers/?${params.toString()}`);
  return response.results;
}
