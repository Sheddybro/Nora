import React, { useCallback, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { Redirect } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { fetchInventoryStock, type InventoryStock } from '../lib/catalog';
import { fetchPeriodReport, fetchWorkspaceSales, type PeriodReport, type WorkspaceSale } from '../lib/workspace';
import { useAuth } from './components/AuthContext';
import { MobilePanel, MobileRow, nativeStyles, useMobileTheme } from './components/NativeWorkspaceScreen';

const periods: PeriodReport['period'][] = ['week', 'month', 'year'];
const money = (value: string | number) => `₦${Number(value || 0).toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const readableDate = (value: string) => new Date(`${value}T00:00:00`).toLocaleDateString('en-NG', { dateStyle: 'medium' });

export default function Home() {
  const theme = useMobileTheme();
  const { session } = useAuth();
  const [report, setReport] = useState<PeriodReport | null>(null);
  const [sales, setSales] = useState<WorkspaceSale[]>([]);
  const [stock, setStock] = useState<InventoryStock[]>([]);
  const [period, setPeriod] = useState<PeriodReport['period']>('month');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!session) return;
    setLoading(true);
    setError('');
    try {
      const [nextSales, nextStock] = await Promise.all([fetchWorkspaceSales(), fetchInventoryStock()]);
      setSales(nextSales);
      setStock(nextStock);
      if (session.role === 'owner') setReport(await fetchPeriodReport(period));
      else setReport(null);
    } catch (requestError) {
      setError((requestError as Error).message);
    } finally {
      setLoading(false);
    }
  }, [period, session]);

  useFocusEffect(useCallback(() => { void refresh(); }, [refresh]));

  if (!session) return <Redirect href="/login" />;

  const todaySales = sales.filter((sale) => new Date(sale.created_at).toDateString() === new Date().toDateString());
  const lowStock = stock.filter((item) => item.reorder_point > 0 && item.quantity <= item.reorder_point);
  const values = report?.chart.values.map(Number) ?? [];
  const peak = Math.max(...values, 0);

  return <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }} edges={['top', 'left', 'right']}>
    <ScrollView contentContainerStyle={{ padding: 18, paddingTop: 16, paddingBottom: 26, gap: 12 }} showsVerticalScrollIndicator={false}>
      <Text style={{ color: theme.rose, fontSize: 9, fontWeight: '700', letterSpacing: 1.4 }}>{session.role === 'owner' ? 'OWNER OVERVIEW' : 'STAFF WORKSPACE'}</Text>
      <Text style={{ color: theme.ink, fontFamily: 'serif', fontSize: 27, lineHeight: 34, fontWeight: '600' }}>{session.role === 'owner' ? 'A clear view of your business.' : 'Your day, at a glance.'}</Text>
      <Text style={{ color: theme.muted, fontSize: 11 }}>{session.business.name} · {session.user.display_name}</Text>
      {error ? <Text accessibilityRole="alert" style={{ color: theme.rose, fontSize: 10 }}>{error}</Text> : null}
      {loading ? <Text style={{ color: theme.muted, fontSize: 10 }}>Loading live business data…</Text> : null}

      {session.role === 'owner' && report ? <>
        <View style={{ flexDirection: 'row', gap: 6 }}>
          {periods.map((item) => <Pressable key={item} accessibilityRole="button" accessibilityState={{ selected: item === period }} onPress={() => setPeriod(item)} style={[nativeStyles.button, { flex: 1, borderWidth: 1, borderColor: item === period ? theme.rose : theme.line, backgroundColor: item === period ? theme.blush : theme.card }]}><Text style={{ color: theme.ink, fontSize: 10, textTransform: 'capitalize' }}>{item}</Text></Pressable>)}
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 9 }}>
          {[
            ['Sales', money(report.sales_total)],
            ['Orders', report.order_count.toLocaleString('en-NG')],
            ['Average order', money(report.average_order)],
            ['Low stock', report.low_stock.toLocaleString('en-NG')],
          ].map(([label, value]) => <View key={label} style={{ width: '48%', minHeight: 95, padding: 12, borderWidth: 1, borderColor: theme.line, borderRadius: 9, backgroundColor: theme.card }}><Text style={{ color: theme.muted, fontSize: 9 }}>{label}</Text><Text style={{ color: theme.ink, fontSize: 18, fontWeight: '700', marginTop: 12 }}>{value}</Text></View>)}
        </View>
        <MobilePanel eyebrow="PERFORMANCE" title={`Sales · ${readableDate(report.start_date)} – ${readableDate(report.end_date)}`}>
          <Text style={{ color: theme.ink, fontSize: 17, fontWeight: '700' }}>{money(report.sales_total)}</Text>
          <View accessibilityLabel="Recorded sales chart" style={{ minHeight: 122, flexDirection: 'row', alignItems: 'flex-end', gap: 3, marginTop: 8 }}>
            {report.chart.labels.map((label, index) => {
              const value = values[index] || 0;
              return <View key={`${label}-${index}`} style={{ flex: 1, alignItems: 'center', justifyContent: 'flex-end', height: 110, gap: 3 }}><View style={{ width: '70%', minHeight: value ? 4 : 2, height: `${peak ? Math.max(value ? 4 : 0, value / peak * 85) : 0}%`, backgroundColor: value === peak && value > 0 ? theme.rose : theme.blush, borderRadius: 3 }} /><Text style={{ color: theme.muted, fontSize: 7 }}>{label}</Text></View>;
            })}
          </View>
          <Text style={{ color: theme.muted, fontSize: 8, marginTop: 5 }}>Received purchases {money(report.purchase_total)} · Expenses {money(report.expense_total)} · Net {money(report.net)}</Text>
        </MobilePanel>
        <MobilePanel eyebrow="ACTION REQUIRED" title="Needs your attention">
          {lowStock.length ? lowStock.slice(0, 5).map((item) => <MobileRow key={`${item.variant_id}-${item.location_id}`} icon="!" title={item.product_name} detail={`${item.sku} · ${item.location_name} · ${item.quantity} units`} action="Reorder" />) : <Text style={{ color: theme.muted, fontSize: 10 }}>No stock lines are at or below their reorder point.</Text>}
        </MobilePanel>
      </> : null}

      {session.role === 'staff' ? <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 9 }}>
        {[['Sales today', money(todaySales.reduce((sum, sale) => sum + Number(sale.total), 0))], ['Orders today', String(todaySales.length)], ['Stock lines', String(stock.length)], ['Low stock', String(lowStock.length)]].map(([label, value]) => <View key={label} style={{ width: '48%', minHeight: 90, padding: 12, borderWidth: 1, borderColor: theme.line, borderRadius: 9, backgroundColor: theme.card }}><Text style={{ color: theme.muted, fontSize: 9 }}>{label}</Text><Text style={{ color: theme.ink, fontSize: 18, fontWeight: '700', marginTop: 12 }}>{value}</Text></View>)}
      </View> : null}

      <MobilePanel eyebrow="LATEST ACTIVITY" title="Recent sales">
        {sales.slice(0, 5).map((sale) => <MobileRow key={sale.id} icon="↗" title={sale.invoice_number} detail={`${sale.customer_name || 'Walk-in'} · ${new Date(sale.created_at).toLocaleString('en-NG', { dateStyle: 'medium', timeStyle: 'short' })}`} action={money(sale.total)} />)}
        {!loading && sales.length === 0 ? <Text style={{ color: theme.muted, fontSize: 10 }}>No sales have been recorded yet.</Text> : null}
      </MobilePanel>
      {session.role === 'staff' ? <MobilePanel eyebrow="YOUR WORKSPACE" title="Everyday tasks">
        <MobileRow icon="＋" title="Point of sale" detail="Build and record a basket" />
        <MobileRow icon="◇" title="Find a product" detail="Browse the live business catalog" />
        <MobileRow icon="⌁" title="Check stock" detail="View current stock by location" />
        <MobileRow icon="◎" title="Customer records" detail="Search the live customer directory" />
      </MobilePanel> : null}
    </ScrollView>
  </SafeAreaView>;
}
