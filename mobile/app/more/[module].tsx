import React from 'react';
import { useLocalSearchParams } from 'expo-router';
import { MobilePanel, MobileRow, NativeWorkspaceScreen, useMobileTheme } from '../components/NativeWorkspaceScreen';
import { usePreviewRole } from '../components/MobileRoleContext';
import { Redirect } from 'expo-router';
import PurchasingWorkspace from '../components/PurchasingWorkspace';

const screens: Record<string, { eyebrow: string; title: string; description: string; rows: [string, string, string][] }> = {
  purchases: { eyebrow: 'PROCUREMENT', title: 'Purchases & suppliers', description: 'Supplier and purchase order interface preview. No orders can be placed or received.', rows: [['⇄', 'Open purchase orders', 'Demo state · 4 sample records'], ['◎', 'Suppliers', 'Demo directory · 18 sample entries'], ['＋', 'Create purchase order', 'Not connected to inventory']] },
  reports: { eyebrow: 'BUSINESS INSIGHT', title: 'Reports & analytics', description: 'Sample reporting screens. All values are illustrative and do not represent actual business performance.', rows: [['↗', 'Sales summary', 'Demo period · sample totals'], ['▤', 'Stock movement', 'No live inventory ledger'], ['◎', 'Customer activity', 'No real customer records']] },
  staff: { eyebrow: 'TEAM ACCESS', title: 'Staff management', description: 'Team administration shell. Staff actions are restricted in the web UI; mobile authentication is not yet connected.', rows: [['♙', 'Team members', 'Demo fixture · 8 entries'], ['＋', 'Pending invitations', 'Demo fixture · 2 invites'], ['⚙', 'Access settings', 'Configurable permissions not implemented']] },
  settings: { eyebrow: 'WORKSPACE PREFERENCES', title: 'Settings', description: 'Business settings preview. Values are not saved to the backend.', rows: [['◉', 'Business profile', 'Setup required'], ['₦', 'Currency', 'NGN · Nigerian naira'], ['⌖', 'Timezone', 'Africa/Lagos']] },
  customers: { eyebrow: 'RELATIONSHIPS', title: 'Customers', description: 'Sample customer directory. No real personal information is loaded.', rows: [['A', 'Ada Nwosu', 'Returning · demo profile'], ['T', 'Tomi Okafor', 'Returning · demo profile'], ['Z', 'Zara Bello', 'New · demo profile']] },
};

export default function ManagementScreen() {
  const { module } = useLocalSearchParams<{ module: string }>();
  const { role } = usePreviewRole();
  if (role !== 'owner') return <Redirect href="/" />;
  if (module === 'purchases') return <PurchasingWorkspace />;
  const screen = screens[module || ''] || screens.settings;
  const theme = useMobileTheme();
  return <NativeWorkspaceScreen eyebrow={screen.eyebrow} title={screen.title} description={screen.description}>
    <MobilePanel eyebrow="WORKSPACE PREVIEW" title="Available sections">{screen.rows.map(([icon, title, detail]) => <MobileRow key={title} icon={icon} title={title} detail={detail} />)}</MobilePanel>
    <MobilePanel eyebrow="DATA STATUS" title="Not connected"><MobileRow icon="✦" title="Illustrative shell" detail="This screen does not read or write live business data." action="DEMO" /></MobilePanel>
  </NativeWorkspaceScreen>;
}
