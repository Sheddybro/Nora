import React, { useEffect, useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { MobilePanel, MobileRow, NativeWorkspaceScreen, nativeStyles, useMobileTheme } from './components/NativeWorkspaceScreen';
import { createCustomer, fetchCustomers, type Customer } from '../lib/customers';

export default function CustomersScreen() {
  const theme = useMobileTheme();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formNotes, setFormNotes] = useState('');

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

  const handleCreate = async () => {
    const cleanedName = formName.trim();
    if (!cleanedName) {
      setError('Customer name is required.');
      return;
    }

    setError('');
    setIsSubmitting(true);
    try {
      const customer = await createCustomer({
        name: cleanedName,
        email: formEmail,
        phone: formPhone,
        notes: formNotes,
      });
      setFormName('');
      setFormEmail('');
      setFormPhone('');
      setFormNotes('');
      setIsCreating(false);
      setCustomers((current) => [customer, ...current]);
    } catch (requestError) {
      setError((requestError as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => { void refresh(); }, []);

  return <NativeWorkspaceScreen eyebrow="RELATIONSHIPS" title="Customers" description="Browse and add customer contacts for the active business.">
    <MobilePanel eyebrow="CUSTOMER DIRECTORY" title={`${customers.length} ${customers.length === 1 ? 'customer' : 'customers'}`}>
      <View style={{ flexDirection: 'row', gap: 7 }}>
        <TextInput accessibilityLabel="Search customers" placeholder="Name, email or phone" value={search} onChangeText={setSearch} onSubmitEditing={() => void refresh(search)} returnKeyType="search" placeholderTextColor={theme.muted} style={{ flex: 1, minHeight: 44, borderColor: theme.line, borderWidth: 1, borderRadius: 7, color: theme.ink, paddingHorizontal: 12 }} />
        <Pressable accessibilityRole="button" onPress={() => void refresh(search)} style={[nativeStyles.button, { borderWidth: 1, borderColor: theme.line }]}><Text style={{ color: theme.ink, fontSize: 10 }}>Search</Text></Pressable>
      </View>

      <View style={{ marginTop: 12 }}>
        {!isCreating ? (
          <Pressable accessibilityRole="button" onPress={() => setIsCreating(true)} style={[nativeStyles.button, { alignSelf: 'flex-start', borderWidth: 1, borderColor: theme.line, backgroundColor: theme.card }]}>
            <Text style={{ color: theme.ink, fontSize: 10 }}>+ Add customer</Text>
          </Pressable>
        ) : (
          <View style={{ borderWidth: 1, borderColor: theme.line, borderRadius: 10, padding: 10, gap: 8 }}>
            <Text style={{ color: theme.ink, fontSize: 11, fontWeight: '600' }}>New customer</Text>
            <TextInput value={formName} onChangeText={setFormName} placeholder="Full name" placeholderTextColor={theme.muted} style={{ minHeight: 42, borderWidth: 1, borderColor: theme.line, borderRadius: 7, paddingHorizontal: 10, color: theme.ink }} />
            <TextInput value={formEmail} onChangeText={setFormEmail} placeholder="Email" keyboardType="email-address" placeholderTextColor={theme.muted} style={{ minHeight: 42, borderWidth: 1, borderColor: theme.line, borderRadius: 7, paddingHorizontal: 10, color: theme.ink }} />
            <TextInput value={formPhone} onChangeText={setFormPhone} placeholder="Phone" keyboardType="phone-pad" placeholderTextColor={theme.muted} style={{ minHeight: 42, borderWidth: 1, borderColor: theme.line, borderRadius: 7, paddingHorizontal: 10, color: theme.ink }} />
            <TextInput value={formNotes} onChangeText={setFormNotes} placeholder="Notes" multiline placeholderTextColor={theme.muted} style={{ minHeight: 80, borderWidth: 1, borderColor: theme.line, borderRadius: 7, paddingHorizontal: 10, color: theme.ink, textAlignVertical: 'top' }} />
            <View style={{ flexDirection: 'row', gap: 8, justifyContent: 'flex-end' }}>
              <Pressable accessibilityRole="button" onPress={() => { setIsCreating(false); setError(''); }} style={[nativeStyles.button, { borderWidth: 1, borderColor: theme.line }]}><Text style={{ color: theme.ink, fontSize: 10 }}>Cancel</Text></Pressable>
              <Pressable accessibilityRole="button" onPress={() => void handleCreate()} style={[nativeStyles.button, { backgroundColor: theme.gold, borderWidth: 0 }]}><Text style={{ color: '#fff', fontSize: 10 }}>{isSubmitting ? 'Saving…' : 'Save customer'}</Text></Pressable>
            </View>
          </View>
        )}
      </View>

      {error ? <Text accessibilityRole="alert" style={{ color: theme.rose, paddingVertical: 10, fontSize: 10 }}>{error}</Text> : null}
      {isLoading ? <View style={nativeStyles.empty}><Text style={{ color: theme.muted, fontSize: 10 }}>Loading customers…</Text></View> : customers.length ? customers.map((customer) => <MobileRow key={customer.id} icon={customer.name.slice(0, 1).toUpperCase()} title={customer.name} detail={[customer.phone, customer.email].filter(Boolean).join(' · ') || 'No contact details'} action="" />) : <View style={nativeStyles.empty}><Text style={[nativeStyles.emptyTitle, { color: theme.ink }]}>No customers found</Text><Text style={[nativeStyles.emptyText, { color: theme.muted }]}>Customer records for this business will appear here.</Text></View>}
    </MobilePanel>
    <View style={[nativeStyles.empty, { borderColor: theme.line, borderWidth: 1, borderRadius: 8, backgroundColor: theme.card }]}><Text style={{ color: theme.muted, fontSize: 9, textAlign: 'center', paddingHorizontal: 24 }}>Contact details are visible only through the authenticated business membership.</Text></View>
  </NativeWorkspaceScreen>;
}
