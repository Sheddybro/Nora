import React from 'react';
import { Redirect, useLocalSearchParams } from 'expo-router';
import { useAuth } from '../components/AuthContext';
import PurchasingWorkspace from '../components/PurchasingWorkspace';
import WorkspaceManagement from '../components/WorkspaceManagement';

const modules = ['purchases', 'reports', 'staff', 'settings', 'sales'] as const;
type WorkspaceModule = typeof modules[number];

export default function ManagementScreen() {
  const { module } = useLocalSearchParams<{ module: string }>();
  const { session } = useAuth();
  if (!session) return <Redirect href="/login" />;
  if (!modules.includes(module as WorkspaceModule)) return <Redirect href="/more" />;
  if (module !== 'sales' && session.role !== 'owner') return <Redirect href="/more" />;
  if (module === 'purchases') return <PurchasingWorkspace />;
  return <WorkspaceManagement module={module as Exclude<WorkspaceModule, 'purchases'>} />;
}
