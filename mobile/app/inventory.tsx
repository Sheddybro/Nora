import React from 'react';
import { Text, View } from 'react-native';
import { MobilePanel, MobileRow, NativeWorkspaceScreen, nativeStyles, useMobileTheme } from './components/NativeWorkspaceScreen';

const stock = [
  ['!', 'Radiance Serum', '8 demo units · reorder at 12', 'Reorder'],
  ['⌁', 'Velvet Matte Lip', '31 demo units · reorder at 10', 'Healthy'],
  ['!', 'Silk Repair Mask', '0 demo units · reorder at 6', 'Out'],
];

export default function InventoryScreen() {
  const theme = useMobileTheme();
  return <NativeWorkspaceScreen eyebrow="STOCK CONTROL" title="Inventory" description="Review sample quantities and attention states. No stock ledger is connected.">
    <MobilePanel eyebrow="DEMO SUMMARY" title="Stock at a glance">
      {[
        ['Units on hand', '2,486'],
        ['Items to reorder', '14'],
        ['Locations', '2 demo locations'],
      ].map(([label, value]) => <View key={label} style={[nativeStyles.stat, { borderBottomColor: theme.line }]}><Text style={[nativeStyles.statLabel, { color: theme.muted }]}>{label}</Text><Text style={[nativeStyles.statValue, { color: theme.ink }]}>{value}</Text></View>)}
    </MobilePanel>
    <MobilePanel eyebrow="SAMPLE ALERTS" title="Needs review">{stock.map(([icon, title, detail, action]) => <MobileRow key={title} icon={icon} title={title} detail={detail} action={action} />)}</MobilePanel>
  </NativeWorkspaceScreen>;
}
