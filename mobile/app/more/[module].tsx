import React from 'react';
import { Redirect, useLocalSearchParams } from 'expo-router';
import { useAuth } from '../components/AuthContext';
import PurchasingWorkspace from '../components/PurchasingWorkspace';
import WorkspaceManagement from '../components/WorkspaceManagement';
import { canOpenManagementModule, type ManagementModule } from '../../lib/navigation';

export default function ManagementScreen() {
  const { module } = useLocalSearchParams<{ module: string }>();
  const { session } = useAuth();
  if (!session) return <Redirect href="/login" />;
  if (!canOpenManagementModule(module, session.role)) return <Redirect href="/more" />;
  if (module === 'purchases') return <PurchasingWorkspace />;
  return <WorkspaceManagement module={module as Exclude<ManagementModule, 'purchases'>} />;
}
