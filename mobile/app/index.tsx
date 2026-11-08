import React, { useCallback, useRef, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { Redirect, useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { fetchInventoryStock, type InventoryStock } from '../lib/catalog';
import { fetchPeriodReport, fetchWorkspaceSales, type PeriodReport, type WorkspaceSale } from '../lib/workspace';
import { useAuth } from './components/AuthContext';
import { MobilePanel, MobileRow, nativeStyles, useMobileTheme } from './components/NativeWorkspaceScreen';
import { RequestSequence } from '../lib/requestSequence';

const periods: PeriodReport['period'][] = ['week', 'month', 'year'];
const money = (value: string | number) => `₦${Number(value || 0).toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const readableDate = (value: string) => new Date(`${value}T00:00:00`).toLocaleDateString('en-NG', { dateStyle: 'medium' });

export default function Home() {
  const router = useRouter();
  const theme = useMobileTheme();
  const { session } = useAuth();
  const [report, setReport] = useState<PeriodReport | null>(null);
  const [sales, setSales] = useState<WorkspaceSale[]>([]);
  const [stock, setStock] = useState<InventoryStock[]>([]);
  const [period, setPeriod] = useState<PeriodReport['period']>('month');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const requestSequence = useRef(new RequestSequence()).current;

  const refresh = useCallback(async () => {
    if (!session) return;
    const request = requestSequence.begin();
    setLoading(true);
    setError('');
    try {
      const [nextSales, nextStock, nextReport] = await Promise.all([
        fetchWorkspaceSales(),
        fetchInventoryStock(),
        session.role === 'owner' ? fetchPeriodReport(period) : Promise.resolve(null),
      ]);
      if (!requestSequence.isCurrent(request)) return;
      setSales(nextSales);
      setStock(nextStock);
      setReport(nextReport);
    } catch (requestError) {
      if (!requestSequence.isCurrent(request)) return;
      setError((requestError as Error).message);
    } finally {
      if (requestSequence.isCurrent(request)) setLoading(false);
    }
  }, [period, requestSequence, session]);

  useFocusEffect(useCallback(() => {
    void refresh();
    return () => requestSequence.invalidate();
  }, [refresh, requestSequence]));

  if (!session) return <Redirect href="/login" />;

  const todaySales = sales.filter((sale) => new Date(sale.created_at).toDateString() === new Date().toDateString());
  const lowStock = stock.filter((item) => item.reorder_point > 0 && item.quantity <= item.reorder_point);
  const values = report?.chart.values.map(Number) ?? [];
  const peak = Math.max(...values, 0);

  return <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }} edges={['top', 'left', 'right']}>
    <ScrollView contentContainerStyle={{ padding: 18, paddingTop: 16, paddingBottom: 26, gap: 12 }} showsVerticalScrollIndicator={false}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
        <Text style={{ color: theme.ink, fontSize: 10, fontWeight: '700', letterSpacing: 1.1 }}>NORRISBEAUTY<Text style={{ color: theme.muted, fontWeight: '400', letterSpacing: 0 }}> / {session.role === 'owner' ? 'Overview' : 'Today'}</Text></Text>
        <Text accessibilityLabel={`${session.user.display_name} account`} style={{ width: 34, height: 34, borderRadius: 17, overflow: 'hidden', textAlign: 'center', textAlignVertical: 'center', color: theme.rose, backgroundColor: theme.blush, fontSize: 13, fontWeight: '700' }}>{session.user.display_name.charAt(0).toUpperCase() || 'N'}</Text>
      </View>
      <Text style={{ color: theme.rose, fontSize: 9, fontWeight: '700', letterSpacing: 1.4 }}>{session.role === 'owner' ? 'OWNER DASHBOARD · OVERVIEW' : 'STAFF WORKSPACE'}</Text>
      <Text accessibilityRole="header" accessibilityLabel={session.role === 'owner' ? 'A clear view of your business.' : 'Your day, at a glance.'} style={{ color: theme.ink, fontFamily: 'serif', fontSize: 27, lineHeight: 34, fontWeight: '600' }}>{session.role === 'owner' ? 'A clear view of your business.' : 'Your day, at a glance.'}</Text>
      <Text style={{ color: theme.muted, fontSize: 11 }}>{session.role === 'owner' ? `A calm start to your day, ${session.user.display_name}.` : `${session.business.name} · ${session.user.display_name}`}</Text>
      {error ? <Text accessibilityRole="alert" style={{ color: theme.rose, fontSize: 10 }}>{error}</Text> : null}
      {loading ? <Text style={{ color: theme.muted, fontSize: 10 }}>Loading live business data…</Text> : null}

      {session.role === 'owner' ? <Pressable accessibilityRole="button" onPress={() => router.push('/pos')} style={[nativeStyles.button, { alignSelf: 'flex-start', backgroundColor: theme.rose, borderRadius: 9, paddingHorizontal: 18 }]}>
        <Text style={{ color: theme.bg, fontSize: 11, fontWeight: '700' }}>＋ Start a sale</Text>
      </Pressable> : null}

      {session.role === 'owner' && report ? <>
        <View style={{ flexDirection: 'row', gap: 6 }}>
          {periods.map((item) => <Pressable key={item} accessibilityRole="button" accessibilityState={{ selected: item === period }} onPress={() => setPeriod(item)} style={[nativeStyles.button, { flex: 1, borderWidth: 1, borderColor: item === period ? theme.rose : theme.line, backgroundColor: item === period ? theme.blush : theme.card }]}><Text style={{ color: theme.ink, fontSize: 11, fontWeight: item === period ? '700' : '500', textTransform: 'capitalize' }}>{item}</Text></Pressable>)}
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 9 }}>
          {[
            ['Sales net of refunds', money(report.sales_total)],
            ['Orders', report.order_count.toLocaleString('en-NG')],
            ['Average order', money(report.average_order)],
            ['Low-stock lines', report.low_stock.toLocaleString('en-NG')],
          ].map(([label, value]) => <View key={label} style={{ width: '48%', minHeight: 98, justifyContent: 'space-between', padding: 13, borderWidth: 1, borderColor: theme.line, borderRadius: 12, backgroundColor: theme.card }}><Text style={{ color: theme.muted, fontSize: 10 }}>{label}</Text><Text style={{ color: theme.ink, fontSize: 20, fontWeight: '700' }}>{value}</Text></View>)}
        </View>
        <MobilePanel eyebrow="PERFORMANCE" title="Sales overview">
          <Text style={{ color: theme.ink, fontSize: 19, fontWeight: '700' }}>{money(report.sales_total)}</Text>
          <Text style={{ color: theme.muted, fontSize: 10, marginTop: 3 }}>{readableDate(report.start_date)} – {readableDate(report.end_date)}</Text>
          <View accessibilityLabel="Recorded sales chart" style={{ minHeight: 142, flexDirection: 'row', alignItems: 'flex-end', gap: 3, marginTop: 10 }}>
            {report.chart.labels.map((label, index) => {
              const value = values[index] || 0;
              const showLabel = period !== 'month' || index % 5 === 0 || index === report.chart.labels.length - 1;
              return <View key={`${label}-${index}`} style={{ flex: 1, alignItems: 'center', justifyContent: 'flex-end', height: 118, gap: 4 }}><View style={{ width: '70%', minHeight: value ? 4 : 2, height: `${peak ? Math.max(value ? 4 : 0, value / peak * 85) : 0}%`, backgroundColor: value === peak && value > 0 ? theme.rose : theme.blush, borderRadius: 3 }} /><Text style={{ color: theme.muted, fontSize: 8 }}>{showLabel ? label : ''}</Text></View>;
            })}
          </View>
          <Text style={{ color: theme.muted, fontSize: 9, lineHeight: 14, marginTop: 7 }}>Received purchases {money(report.purchase_total)} · Expenses {money(report.expense_total)} · Net {money(report.net)}</Text>
        </MobilePanel>
        <MobilePanel eyebrow="ACTION REQUIRED">
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 5, marginBottom: 8 }}>
            <Text style={{ color: theme.ink, fontSize: 15, fontWeight: '700' }}>Needs your attention</Text>
            <Text accessibilityLabel={`${lowStock.length} stock items need attention`} style={{ minWidth: 28, paddingHorizontal: 8, paddingVertical: 5, overflow: 'hidden', borderRadius: 12, color: theme.rose, backgroundColor: theme.blush, textAlign: 'center', fontSize: 10, fontWeight: '700' }}>{lowStock.length}</Text>
          </View>
          {lowStock.length ? lowStock.slice(0, 5).map((item) => <MobileRow key={`${item.variant_id}-${item.location_id}`} icon="!" title={item.product_name} detail={`${item.sku} · ${item.location_name} · ${item.quantity} units`} action="Review" onPress={() => router.push('/inventory')} />) : <Text style={{ color: theme.muted, fontSize: 10 }}>No stock lines are at or below their reorder point.</Text>}
        </MobilePanel>
      </> : null}

      {session.role === 'staff' ? <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 9 }}>
        {[['Sales today', money(todaySales.reduce((sum, sale) => sum + Number(sale.total), 0))], ['Orders today', String(todaySales.length)], ['Stock lines', String(stock.length)], ['Low stock', String(lowStock.length)]].map(([label, value]) => <View key={label} style={{ width: '48%', minHeight: 90, padding: 12, borderWidth: 1, borderColor: theme.line, borderRadius: 9, backgroundColor: theme.card }}><Text style={{ color: theme.muted, fontSize: 9 }}>{label}</Text><Text style={{ color: theme.ink, fontSize: 18, fontWeight: '700', marginTop: 12 }}>{value}</Text></View>)}
      </View> : null}

      <MobilePanel eyebrow="LATEST ACTIVITY">
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 5, marginBottom: 8 }}>
          <Text style={{ color: theme.ink, fontSize: 15, fontWeight: '700' }}>Recent sales</Text>
          <Pressable accessibilityRole="button" onPress={() => router.push('/more/sales')} style={{ minHeight: 44, justifyContent: 'center', paddingHorizontal: 4 }}>
            <Text style={{ color: theme.rose, fontSize: 10, fontWeight: '700' }}>View all ↗</Text>
          </Pressable>
        </View>
        {sales.slice(0, 5).map((sale) => <MobileRow key={sale.id} icon="↗" title={sale.invoice_number} detail={`${sale.customer_name || 'Walk-in'} · ${new Date(sale.created_at).toLocaleString('en-NG', { dateStyle: 'medium', timeStyle: 'short' })} · ${sale.status.replace(/_/g, ' ')}`} action={money(sale.total)} />)}
        {!loading && sales.length === 0 ? <Text style={{ color: theme.muted, fontSize: 10 }}>No sales have been recorded yet.</Text> : null}
      </MobilePanel>
      {session.role === 'owner' ? <MobilePanel eyebrow="SHORTCUTS" title="Quick actions">
        <MobileRow icon="＋" title="Start a sale" detail="Open point of sale" onPress={() => router.push('/pos')} />
        <MobileRow icon="◇" title="Add a product" detail="Manage your catalog" onPress={() => router.push('/catalog')} />
        <MobileRow icon="⌁" title="Review stock" detail="View inventory health" onPress={() => router.push('/inventory')} />
      </MobilePanel> : null}
      {session.role === 'staff' ? <MobilePanel eyebrow="YOUR WORKSPACE" title="Everyday tasks">
        <MobileRow icon="＋" title="Point of sale" detail="Build and record a basket" />
        <MobileRow icon="◇" title="Find a product" detail="Browse the live business catalog" />
        <MobileRow icon="⌁" title="Check stock" detail="View current stock by location" />
        <MobileRow icon="◎" title="Customer records" detail="Search the live customer directory" />
      </MobilePanel> : null}
    </ScrollView>
  </SafeAreaView>;
}
