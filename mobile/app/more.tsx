import React from 'react';
import { Redirect, useRouter } from 'expo-router';
import { MobilePanel, MobileRow, NativeWorkspaceScreen } from './components/NativeWorkspaceScreen';
import { usePreviewRole } from './components/MobileRoleContext';

const ownerLinks = [
  ['⇄', 'Purchases & suppliers', 'Purchase order workspace', '/more/purchases'],
  ['◎', 'Customers', 'Sample customer directory', '/more/customers'],
  ['▥', 'Reports & analytics', 'Illustrative reporting shell', '/more/reports'],
  ['♙', 'Staff management', 'Team access and membership', '/more/staff'],
  ['⚙', 'Settings', 'Business profile and preferences', '/more/settings'],
];

export default function MoreScreen() {
  const router = useRouter();
  const { role } = usePreviewRole();
  if (role !== 'owner') return <Redirect href="/" />;
  return <NativeWorkspaceScreen eyebrow="OWNER TOOLS" title="More" description="Additional management screens. Every destination is currently an illustrative page shell.">
    <MobilePanel eyebrow="WORKSPACE MANAGEMENT" title="Business tools">{ownerLinks.map(([icon, title, detail, route]) => <MobileRow key={route} icon={icon} title={title} detail={detail} onPress={() => router.push(route as never)} />)}</MobilePanel>
    <MobilePanel eyebrow="ACCOUNT" title="Preview access"><MobileRow icon="↗" title="Switch preview role" detail="Open the sign-in shell to select a preview account" onPress={() => router.push('/login' as never)} /></MobilePanel>
  </NativeWorkspaceScreen>;
}
