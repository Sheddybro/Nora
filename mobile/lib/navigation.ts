import type { SessionRole } from './auth';

export type MobileTab = { name: string; title: string; icon: string };
export type WorkspaceLink = readonly [icon: string, title: string, detail: string, route: string];

const commonTabs: readonly MobileTab[] = [
  { name: 'catalog', title: 'Catalog', icon: '◇' },
  { name: 'pos', title: 'Sell', icon: '＋' },
  { name: 'inventory', title: 'Stock', icon: '▤' },
  { name: 'more', title: 'More', icon: '•••' },
];

export function tabsForRole(role: SessionRole): readonly MobileTab[] {
  return [
    { name: 'index', title: role === 'owner' ? 'Overview' : 'Today', icon: '◫' },
    ...commonTabs,
  ];
}

const ownerLinks: readonly WorkspaceLink[] = [
  ['⇄', 'Purchases & suppliers', 'Live orders and receipts', '/more/purchases'],
  ['◎', 'Customers', 'Business customer directory', '/customers'],
  ['↗', 'Sales history', 'Recorded invoices and refunds', '/more/sales'],
  ['▥', 'Reports & analytics', 'Live period summaries and expenses', '/more/reports'],
  ['♙', 'Staff management', 'Existing business users and memberships', '/more/staff'],
  ['⚙', 'Settings', 'Business name and profile', '/more/settings'],
];

const staffLinks: readonly WorkspaceLink[] = [
  ['◎', 'Customers', 'Business customer directory', '/customers'],
  ['↗', 'Sales history', 'Recorded invoices and refunds', '/more/sales'],
];

export function workspaceLinksForRole(role: SessionRole): readonly WorkspaceLink[] {
  return role === 'owner' ? ownerLinks : staffLinks;
}

export const managementModules = ['purchases', 'reports', 'staff', 'settings', 'sales'] as const;
export type ManagementModule = typeof managementModules[number];

export function canOpenManagementModule(module: string, role: SessionRole): module is ManagementModule {
  if (!managementModules.some((candidate) => candidate === module)) return false;
  return role === 'owner' || module === 'sales';
}
