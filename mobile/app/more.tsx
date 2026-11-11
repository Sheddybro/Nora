import React from 'react';
import { Redirect, useRouter } from 'expo-router';
import { MobilePanel, MobileRow, NativeWorkspaceScreen } from './components/NativeWorkspaceScreen';
import { useAuth } from './components/AuthContext';
import { workspaceLinksForRole } from '../lib/navigation';

export default function MoreScreen() {
  const router = useRouter();
  const { session, logout } = useAuth();
  if (!session) return <Redirect href="/login" />;
  const links = workspaceLinksForRole(session.role);
  return <NativeWorkspaceScreen eyebrow={session.role === 'owner' ? 'OWNER TOOLS' : 'WORKSPACE'} title="More" description="Additional tools available to your business membership.">
    <MobilePanel eyebrow={session.role === 'owner' ? 'WORKSPACE MANAGEMENT' : 'OPERATIONS'} title={session.role === 'owner' ? 'Business tools' : 'Work tools'}>{links.map(([icon, title, detail, route]) => <MobileRow key={route} icon={icon} title={title} detail={detail} onPress={() => router.push(route as never)} />)}</MobilePanel>
    <MobilePanel eyebrow="ACCOUNT" title={session.business.name}><MobileRow icon="↗" title="Sign out" detail={session.user.display_name} onPress={() => { void logout().then(() => router.replace('/login' as never)); }} /></MobilePanel>
  </NativeWorkspaceScreen>;
}
