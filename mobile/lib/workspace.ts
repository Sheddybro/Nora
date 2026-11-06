import { apiRequest } from './auth';

export type PeriodReport = {
  period: 'week' | 'month' | 'year';
  start_date: string;
  end_date: string;
  sales_total: string;
  order_count: number;
  average_order: string;
  units_sold: number;
  purchase_total: string;
  expense_total: string;
  net: string;
  low_stock: number;
  chart: { labels: string[]; values: string[] };
};

export type BusinessProfile = { id: number; name: string };
export type StaffMember = { id: number; username: string; display_name: string; role: 'owner' | 'staff' };
export type WorkspaceSale = {
  id: number;
  invoice_number: string;
  status: string;
  total: string;
  paid_amount: string;
  created_at: string;
  customer_name: string | null;
};

export async function fetchPeriodReport(period: PeriodReport['period']): Promise<PeriodReport> {
  return apiRequest<PeriodReport>(`/reports/summary/?period=${period}`);
}

export async function fetchBusinessProfile(): Promise<BusinessProfile> {
  return apiRequest<BusinessProfile>('/business/profile/');
}

export async function updateBusinessName(name: string): Promise<BusinessProfile> {
  return apiRequest<BusinessProfile>('/business/profile/', { method: 'PATCH', body: JSON.stringify({ name }) });
}

export async function fetchStaffMembers(): Promise<StaffMember[]> {
  const response = await apiRequest<{ results: StaffMember[] }>('/staff/members/');
  return response.results;
}

export async function addStaffMember(username: string): Promise<StaffMember> {
  return apiRequest<StaffMember>('/staff/members/', { method: 'POST', body: JSON.stringify({ username }) });
}

export async function fetchWorkspaceSales(): Promise<WorkspaceSale[]> {
  const response = await apiRequest<{ results: WorkspaceSale[] }>('/sales/');
  return response.results;
}

export async function recordSaleRefund(saleId: number, amount: string, reason: string, idempotencyKey: string): Promise<WorkspaceSale> {
  return apiRequest<WorkspaceSale>(`/sales/${saleId}/refund/`, {
    method: 'POST',
    body: JSON.stringify({ amount, reason, idempotency_key: idempotencyKey }),
  });
}

export type BusinessExpense = {
  id: number;
  title: string;
  category: string;
  vendor: string;
  amount: string;
  expense_date: string;
  created_at: string;
};

export async function fetchBusinessExpenses(): Promise<BusinessExpense[]> {
  const response = await apiRequest<{ results: BusinessExpense[] }>('/expenses/');
  return response.results;
}

export async function createBusinessExpense(payload: {
  title: string;
  category: string;
  vendor: string;
  amount: string;
  expense_date: string;
  note: string;
}): Promise<BusinessExpense> {
  return apiRequest<BusinessExpense>('/expenses/', { method: 'POST', body: JSON.stringify(payload) });
}
