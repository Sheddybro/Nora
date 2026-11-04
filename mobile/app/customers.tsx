import React, { useEffect, useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { MobilePanel, MobileRow, NativeWorkspaceScreen, nativeStyles, useMobileTheme } from './components/NativeWorkspaceScreen';
import { fetchCustomers, type Customer } from '../lib/customers';

export default function CustomersScreen() {
  const theme = useMobileTheme();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const refresh = async (query = '') => {
    setIsLoading(true);
    setError('');
    try {
      setCustomers(await fetchCustomers(query));
    } catch (requestError) {
      setError((requestError as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { void refresh(); }, []);

  return <NativeWorkspaceScreen eyebrow="RELATIONSHIPS" title="Customers" description="Browse customer contacts for the active business." liveData>
    <MobilePanel eyebrow="CUSTOMER DIRECTORY" title={`${customers.length} ${customers.length === 1 ? 'customer' : 'customers'}`}>
      <View style={{ flexDirection: 'row', gap: 7 }}>
        <TextInput accessibilityLabel="Search customers" placeholder="Name, email or phone" value={search} onChangeText={setSearch} onSubmitEditing={() => void refresh(search)} returnKeyType="search" placeholderTextColor={theme.muted} style={{ flex: 1, minHeight: 44, borderColor: theme.line, borderWidth: 1, borderRadius: 7, color: theme.ink, paddingHorizontal: 12 }} />
        <Pressable accessibilityRole="button" onPress={() => void refresh(search)} style={[nativeStyles.button, { borderWidth: 1, borderColor: theme.line }]}><Text style={{ color: theme.ink, fontSize: 10 }}>Search</Text></Pressable>
      </View>
      {error ? <Text accessibilityRole="alert" style={{ color: theme.rose, paddingVertical: 10, fontSize: 10 }}>{error}</Text> : null}
      {isLoading ? <View style={nativeStyles.empty}><Text style={{ color: theme.muted, fontSize: 10 }}>Loading customers…</Text></View> : customers.length ? customers.map((customer) => <MobileRow key={customer.id} icon={customer.name.slice(0, 1).toUpperCase()} title={customer.name} detail={[customer.phone, customer.email].filter(Boolean).join(' · ') || 'No contact details'} action="" />) : <View style={nativeStyles.empty}><Text style={[nativeStyles.emptyTitle, { color: theme.ink }]}>No customers found</Text><Text style={[nativeStyles.emptyText, { color: theme.muted }]}>Customer records for this business will appear here.</Text></View>}
    </MobilePanel>
    <View style={[nativeStyles.empty, { borderColor: theme.line, borderWidth: 1, borderRadius: 8, backgroundColor: theme.card }]}><Text style={{ color: theme.muted, fontSize: 9, textAlign: 'center', paddingHorizontal: 24 }}>Contact details are visible only through the authenticated business membership.</Text></View>
  </NativeWorkspaceScreen>;
}
