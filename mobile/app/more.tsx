import React from 'react';
import { Redirect, useRouter } from 'expo-router';
import { MobilePanel, MobileRow, NativeWorkspaceScreen } from './components/NativeWorkspaceScreen';
import { useAuth } from './components/AuthContext';

const ownerLinks = [
  ['⇄', 'Purchases & suppliers', 'Live orders and receipts', '/more/purchases'],
  ['◎', 'Customers', 'Business customer directory', '/customers'],
  ['↗', 'Sales history', 'Recorded invoices and refunds', '/more/sales'],
  ['▥', 'Reports & analytics', 'Live period summaries and expenses', '/more/reports'],
  ['♙', 'Staff management', 'Existing business users and memberships', '/more/staff'],
  ['⚙', 'Settings', 'Business name and profile', '/more/settings'],
];
const staffLinks = [
  ['◎', 'Customers', 'Business customer directory', '/customers'],
  ['↗', 'Sales history', 'Recorded invoices and refunds', '/more/sales'],
];

export default function MoreScreen() {
  const router = useRouter();
  const { session, logout } = useAuth();
  if (!session) return <Redirect href="/login" />;
  const links = session.role === 'owner' ? ownerLinks : staffLinks;
  return <NativeWorkspaceScreen eyebrow={session.role === 'owner' ? 'OWNER TOOLS' : 'WORKSPACE'} title="More" description="Additional tools available to your business membership.">
    <MobilePanel eyebrow={session.role === 'owner' ? 'WORKSPACE MANAGEMENT' : 'OPERATIONS'} title={session.role === 'owner' ? 'Business tools' : 'Work tools'}>{links.map(([icon, title, detail, route]) => <MobileRow key={route} icon={icon} title={title} detail={detail} onPress={() => router.push(route as never)} />)}</MobilePanel>
    <MobilePanel eyebrow="ACCOUNT" title={session.business.name}><MobileRow icon="↗" title="Sign out" detail={session.user.display_name} onPress={() => { void logout().then(() => router.replace('/login' as never)); }} /></MobilePanel>
  </NativeWorkspaceScreen>;
}
