import React from 'react';
import { Text, View } from 'react-native';
import { MobilePanel, MobileRow, NativeWorkspaceScreen, nativeStyles, useMobileTheme } from './components/NativeWorkspaceScreen';

const customers = [
  ['A', 'Ada Nwosu', 'Returning · last visit today', '12 visits'],
  ['T', 'Tomi Okafor', 'Returning · last visit yesterday', '4 visits'],
  ['Z', 'Zara Bello', 'New · last visit 21 Oct', '1 visit'],
];

export default function CustomersScreen() {
  const theme = useMobileTheme();
  return <NativeWorkspaceScreen eyebrow="RELATIONSHIPS" title="Customers" description="Sample customer directory. No real personal information or customer records are connected.">
    <MobilePanel eyebrow="DEMO DIRECTORY" title="Recent profiles">{customers.map(([icon, title, detail, action]) => <MobileRow key={title} icon={icon} title={title} detail={detail} action={action} />)}</MobilePanel>
    <View style={[nativeStyles.empty, { borderColor: theme.line, borderWidth: 1, borderRadius: 9, backgroundColor: theme.card }]}><Text style={{ color: theme.ink, fontSize: 11, fontWeight: '700' }}>Privacy first</Text><Text style={{ color: theme.muted, fontSize: 9, textAlign: 'center', paddingHorizontal: 24 }}>Real customer records will be business-scoped and permission-checked when the customers module is implemented.</Text></View>
  </NativeWorkspaceScreen>;
}
