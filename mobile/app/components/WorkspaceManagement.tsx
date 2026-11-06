import React, { useEffect, useState } from 'react';
import { Alert, Pressable, Text, TextInput, View } from 'react-native';
import * as Print from 'expo-print';
import { MobilePanel, MobileRow, NativeWorkspaceScreen, nativeStyles, useMobileTheme } from './NativeWorkspaceScreen';
import {
  addStaffMember,
  createBusinessExpense,
  fetchBusinessExpenses,
  fetchPeriodReport,
  fetchStaffMembers,
  fetchWorkspaceSales,
  recordSaleRefund,
  updateBusinessName,
  type BusinessExpense,
  type PeriodReport,
  type StaffMember,
  type WorkspaceSale,
} from '../../lib/workspace';
import { useAuth } from './AuthContext';
import { buildIdempotencyKey } from '../../lib/offlineQueue';

type Props = { module: 'reports' | 'staff' | 'settings' | 'sales' };
const money = (value: string | number) => `₦${Number(value || 0).toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const today = () => {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};
const escapeHtml = (value: string) => value.replace(/[&<>"']/g, (character) => {
  if (character === '&') return '&amp;';
  if (character === '<') return '&lt;';
  if (character === '>') return '&gt;';
  if (character === '"') return '&quot;';
  return '&#39;';
});

export default function WorkspaceManagement({ module }: Props) {
  const theme = useMobileTheme();
  const { session } = useAuth();
  const [report, setReport] = useState<PeriodReport | null>(null);
  const [expenses, setExpenses] = useState<BusinessExpense[]>([]);
  const [members, setMembers] = useState<StaffMember[]>([]);
  const [sales, setSales] = useState<WorkspaceSale[]>([]);
  const [period, setPeriod] = useState<PeriodReport['period']>('month');
  const [businessName, setBusinessName] = useState(session?.business.name || '');
  const [username, setUsername] = useState('');
  const [expenseTitle, setExpenseTitle] = useState('');
  const [expenseCategory, setExpenseCategory] = useState('');
  const [expenseVendor, setExpenseVendor] = useState('');
  const [expenseAmount, setExpenseAmount] = useState('');
  const [expenseNote, setExpenseNote] = useState('');
  const [refundSale, setRefundSale] = useState<WorkspaceSale | null>(null);
  const [refundAmount, setRefundAmount] = useState('');
  const [refundReason, setRefundReason] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const refresh = async () => {
    setLoading(true);
    setError('');
    try {
      if (module === 'reports') {
        const [nextReport, nextExpenses] = await Promise.all([fetchPeriodReport(period), fetchBusinessExpenses()]);
        setReport(nextReport);
        setExpenses(nextExpenses);
      } else if (module === 'staff') {
        setMembers(await fetchStaffMembers());
      } else if (module === 'sales') {
        setSales(await fetchWorkspaceSales());
      }
    } catch (requestError) {
      setError((requestError as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void refresh(); }, [module, period]);

  const addMember = async () => {
    if (!username.trim()) return setError('Enter an existing user’s username.');
    setSaving(true);
    setError('');
    try {
      const member = await addStaffMember(username.trim());
      setMembers((current) => [...current, member]);
      setUsername('');
    } catch (requestError) {
      setError((requestError as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const saveBusinessName = async () => {
    if (!businessName.trim()) return setError('Business name is required.');
    setSaving(true);
    setError('');
    try {
      const profile = await updateBusinessName(businessName.trim());
      setBusinessName(profile.name);
      if (session) session.business.name = profile.name;
      Alert.alert('Settings saved', `Business name updated to ${profile.name}.`);
    } catch (requestError) {
      setError((requestError as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const saveExpense = async () => {
    const amount = Number(expenseAmount);
    if (!expenseTitle.trim() || !Number.isFinite(amount) || amount < 0) {
      return setError('Enter an expense title and a valid non-negative amount.');
    }
    setSaving(true);
    setError('');
    try {
      const expense = await createBusinessExpense({
        title: expenseTitle.trim(),
        category: expenseCategory.trim(),
        vendor: expenseVendor.trim(),
        amount: amount.toFixed(2),
        expense_date: today(),
        note: expenseNote.trim(),
      });
      setExpenses((current) => [expense, ...current]);
      setExpenseTitle('');
      setExpenseCategory('');
      setExpenseVendor('');
      setExpenseAmount('');
      setExpenseNote('');
      await refresh();
    } catch (requestError) {
      setError((requestError as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const submitRefund = async () => {
    if (!refundSale) return;
    const amount = Number(refundAmount);
    if (!Number.isFinite(amount) || amount <= 0 || !refundReason.trim()) {
      return setError('Enter a positive refund amount and a reason.');
    }
    setSaving(true);
    setError('');
    try {
      await recordSaleRefund(refundSale.id, amount.toFixed(2), refundReason.trim(), buildIdempotencyKey('mobile-refund'));
      setRefundSale(null);
      setRefundAmount('');
      setRefundReason('');
      await refresh();
      Alert.alert('Refund recorded', 'The refund and inventory reversal have been recorded.');
    } catch (requestError) {
      setError((requestError as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const printReport = async () => {
    if (!report) return;
    const rows = [
      ['Sales total', money(report.sales_total)],
      ['Orders', String(report.order_count)],
      ['Average order', money(report.average_order)],
      ['Units sold', String(report.units_sold)],
      ['Received purchases', money(report.purchase_total)],
      ['Expenses', money(report.expense_total)],
      ['Net', money(report.net)],
      ['Low-stock lines', String(report.low_stock)],
    ];
    const html = `<html><head><meta name="viewport" content="width=device-width, initial-scale=1"><style>body{font:14px Arial,sans-serif;color:#252329;padding:28px}h1{color:#96515E}p{color:#827B82}table{width:100%;border-collapse:collapse;margin-top:24px}td{padding:12px;border-bottom:1px solid #EBE5E1}td:last-child{text-align:right;font-weight:bold}</style></head><body><h1>${escapeHtml(session?.business.name || 'Business report')}</h1><p>${escapeHtml(report.start_date)} – ${escapeHtml(report.end_date)} · ${escapeHtml(period)}</p><table>${rows.map(([label, value]) => `<tr><td>${escapeHtml(label)}</td><td>${escapeHtml(value)}</td></tr>`).join('')}</table></body></html>`;
    try {
      await Print.printAsync({ html });
    } catch (requestError) {
      setError((requestError as Error).message);
    }
  };

  const title = module === 'reports' ? 'Reports & analytics'
    : module === 'staff' ? 'Staff management'
      : module === 'settings' ? 'Settings'
        : 'Sales history';

  return <NativeWorkspaceScreen eyebrow={module.toUpperCase()} title={title} description={
    module === 'reports' ? 'Period totals use recorded business sales, receipts and expenses.'
      : module === 'staff' ? 'Manage existing business users. New members are added as Staff.'
        : module === 'settings' ? 'Update the business profile used throughout the workspace.'
          : 'Search recorded invoices and process authorized refunds.'
  }>
    {error ? <Text accessibilityRole="alert" style={{ color: theme.rose, paddingVertical: 8, fontSize: 10 }}>{error}</Text> : null}
    {loading ? <Text style={{ color: theme.muted, fontSize: 10, paddingVertical: 8 }}>Loading live business data…</Text> : null}

    {module === 'reports' ? <>
      <View style={{ flexDirection: 'row', gap: 6 }}>
        {(['week', 'month', 'year'] as const).map((value) => <Pressable key={value} accessibilityRole="button" accessibilityState={{ selected: period === value }} onPress={() => setPeriod(value)} style={[nativeStyles.button, { flex: 1, borderWidth: 1, borderColor: period === value ? theme.rose : theme.line, backgroundColor: period === value ? theme.blush : theme.card }]}><Text style={{ color: theme.ink, fontSize: 10, textTransform: 'capitalize' }}>{value}</Text></Pressable>)}
      </View>
      {report ? <MobilePanel eyebrow={`${report.start_date} – ${report.end_date}`} title="Business performance">
        {[
          ['Sales total', money(report.sales_total)],
          ['Orders', String(report.order_count)],
          ['Average order', money(report.average_order)],
          ['Units sold', String(report.units_sold)],
          ['Received purchases', money(report.purchase_total)],
          ['Expenses', money(report.expense_total)],
          ['Net', money(report.net)],
          ['Low-stock lines', String(report.low_stock)],
        ].map(([label, value]) => <View key={label} style={[nativeStyles.stat, { borderBottomColor: theme.line }]}><Text style={[nativeStyles.statLabel, { color: theme.muted }]}>{label}</Text><Text style={[nativeStyles.statValue, { color: theme.ink }]}>{value}</Text></View>)}
        <Pressable accessibilityRole="button" onPress={() => void printReport()} style={[nativeStyles.button, { marginTop: 10, borderWidth: 1, borderColor: theme.line }]}><Text style={{ color: theme.ink, fontSize: 10 }}>Print / save PDF</Text></Pressable>
      </MobilePanel> : null}
      <MobilePanel eyebrow="EXPENSES" title="Record an expense">
        {[['Expense title', expenseTitle, setExpenseTitle], ['Category', expenseCategory, setExpenseCategory], ['Vendor', expenseVendor, setExpenseVendor], ['Amount (NGN)', expenseAmount, setExpenseAmount], ['Note', expenseNote, setExpenseNote]].map(([label, value, setter]) => <TextInput key={label as string} accessibilityLabel={label as string} placeholder={label as string} value={value as string} onChangeText={setter as (text: string) => void} keyboardType={label === 'Amount (NGN)' ? 'decimal-pad' : 'default'} placeholderTextColor={theme.muted} style={{ minHeight: 44, borderWidth: 1, borderColor: theme.line, borderRadius: 7, color: theme.ink, paddingHorizontal: 10, marginBottom: 8 }} />)}
        <Pressable accessibilityRole="button" disabled={saving} onPress={() => void saveExpense()} style={[nativeStyles.button, { backgroundColor: theme.rose, opacity: saving ? 0.6 : 1 }]}><Text style={{ color: '#fff', fontSize: 10, fontWeight: '700' }}>{saving ? 'Saving…' : 'Record expense'}</Text></Pressable>
      </MobilePanel>
      <MobilePanel eyebrow="RECORDED EXPENSES" title={`${expenses.length} expenses`}>
        {expenses.map((item) => <MobileRow key={item.id} icon="₦" title={item.title} detail={`${item.expense_date} · ${item.category || 'Uncategorized'} · ${item.vendor || 'No vendor'}`} action={money(item.amount)} />)}
        {!expenses.length ? <Text style={{ color: theme.muted, fontSize: 10 }}>No expenses recorded in this business.</Text> : null}
      </MobilePanel>
    </> : null}

    {module === 'staff' ? <>
      <MobilePanel eyebrow="TEAM ACCESS" title={`${members.length} business members`}>
        {members.map((member) => <MobileRow key={member.id} icon={member.role === 'owner' ? '♙' : '•'} title={member.display_name} detail={member.username} action={member.role} />)}
        {!members.length && !loading ? <Text style={{ color: theme.muted, fontSize: 10 }}>No members are linked to this business.</Text> : null}
      </MobilePanel>
      <MobilePanel eyebrow="ADD MEMBER" title="Link existing user">
        <Text style={{ color: theme.muted, fontSize: 9, lineHeight: 14, marginBottom: 8 }}>The user must already have an active NorrisBeauty account. New members receive the Staff role.</Text>
        <TextInput accessibilityLabel="Existing username" autoCapitalize="none" value={username} onChangeText={setUsername} placeholder="Username" placeholderTextColor={theme.muted} style={{ minHeight: 44, borderWidth: 1, borderColor: theme.line, borderRadius: 7, color: theme.ink, paddingHorizontal: 10, marginBottom: 8 }} />
        <Pressable accessibilityRole="button" disabled={saving} onPress={() => void addMember()} style={[nativeStyles.button, { backgroundColor: theme.rose, opacity: saving ? 0.6 : 1 }]}><Text style={{ color: '#fff', fontSize: 10, fontWeight: '700' }}>{saving ? 'Adding…' : 'Add as Staff'}</Text></Pressable>
      </MobilePanel>
    </> : null}

    {module === 'settings' ? <MobilePanel eyebrow="BUSINESS PROFILE" title="Workspace name">
      <TextInput accessibilityLabel="Business name" value={businessName} onChangeText={setBusinessName} maxLength={160} placeholder="Business name" placeholderTextColor={theme.muted} style={{ minHeight: 46, borderWidth: 1, borderColor: theme.line, borderRadius: 7, color: theme.ink, paddingHorizontal: 10, marginBottom: 8 }} />
      <Text style={{ color: theme.muted, fontSize: 9, marginBottom: 8 }}>Currency: NGN · Timezone: Africa/Lagos</Text>
      <Pressable accessibilityRole="button" disabled={saving} onPress={() => void saveBusinessName()} style={[nativeStyles.button, { backgroundColor: theme.rose, opacity: saving ? 0.6 : 1 }]}><Text style={{ color: '#fff', fontSize: 10, fontWeight: '700' }}>{saving ? 'Saving…' : 'Save changes'}</Text></Pressable>
    </MobilePanel> : null}

    {module === 'sales' ? <>
      <MobilePanel eyebrow="TRANSACTIONS" title={`${sales.length} recorded sales`}>
        {sales.map((sale) => <View key={sale.id} style={{ borderBottomWidth: 1, borderBottomColor: theme.line, paddingVertical: 10, gap: 4 }}>
          <Text style={{ color: theme.ink, fontSize: 11, fontWeight: '700' }}>{sale.invoice_number} · {money(sale.total)}</Text>
          <Text style={{ color: theme.muted, fontSize: 9 }}>{sale.customer_name || 'Walk-in'} · {new Date(sale.created_at).toLocaleString('en-NG', { dateStyle: 'medium', timeStyle: 'short' })} · {sale.status}</Text>
          {sale.paid_amount !== '0.00' && sale.status !== 'refunded' ? <Pressable accessibilityRole="button" onPress={() => { setRefundSale(sale); setRefundAmount(sale.paid_amount); setRefundReason(''); }} style={[nativeStyles.button, { alignSelf: 'flex-start', borderWidth: 1, borderColor: theme.line, marginTop: 4 }]}><Text style={{ color: theme.ink, fontSize: 9 }}>Record refund</Text></Pressable> : null}
        </View>)}
        {!sales.length && !loading ? <Text style={{ color: theme.muted, fontSize: 10 }}>No sales have been recorded yet.</Text> : null}
      </MobilePanel>
      {refundSale ? <MobilePanel eyebrow="REFUND" title={refundSale.invoice_number}>
        <TextInput accessibilityLabel="Refund amount" value={refundAmount} onChangeText={setRefundAmount} keyboardType="decimal-pad" placeholder="Amount" placeholderTextColor={theme.muted} style={{ minHeight: 44, borderWidth: 1, borderColor: theme.line, borderRadius: 7, color: theme.ink, paddingHorizontal: 10, marginBottom: 8 }} />
        <TextInput accessibilityLabel="Refund reason" value={refundReason} onChangeText={setRefundReason} placeholder="Reason" placeholderTextColor={theme.muted} style={{ minHeight: 44, borderWidth: 1, borderColor: theme.line, borderRadius: 7, color: theme.ink, paddingHorizontal: 10, marginBottom: 8 }} />
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Pressable accessibilityRole="button" onPress={() => setRefundSale(null)} style={[nativeStyles.button, { flex: 1, borderWidth: 1, borderColor: theme.line }]}><Text style={{ color: theme.ink, fontSize: 9 }}>Cancel</Text></Pressable>
          <Pressable accessibilityRole="button" disabled={saving} onPress={() => void submitRefund()} style={[nativeStyles.button, { flex: 1, backgroundColor: theme.rose, opacity: saving ? 0.6 : 1 }]}><Text style={{ color: '#fff', fontSize: 9 }}>{saving ? 'Saving…' : 'Record refund'}</Text></Pressable>
        </View>
      </MobilePanel> : null}
    </> : null}
  </NativeWorkspaceScreen>;
}
