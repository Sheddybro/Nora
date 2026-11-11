import { describe, expect, it } from 'vitest';
import { canOpenManagementModule, tabsForRole, workspaceLinksForRole } from '../lib/navigation';

describe('mobile role-aware navigation', () => {
  it('exposes the same operational tabs to owners and staff without owner-only tabs', () => {
    const owner = tabsForRole('owner');
    const staff = tabsForRole('staff');
    expect(owner.map((tab) => tab.name)).toEqual(['index', 'catalog', 'pos', 'inventory', 'more']);
    expect(staff.map((tab) => tab.name)).toEqual(['index', 'catalog', 'pos', 'inventory', 'more']);
    expect(owner[0].title).toBe('Overview');
    expect(staff[0].title).toBe('Today');
  });

  it('shows management and purchasing modules to the owner', () => {
    expect(workspaceLinksForRole('owner').map((link) => link[3])).toEqual([
      '/more/purchases', '/customers', '/more/sales', '/more/reports', '/more/staff', '/more/settings',
    ]);
  });

  it('hides owner-only management links for staff', () => {
    const staffRoutes = workspaceLinksForRole('staff').map((link) => link[3]);
    expect(staffRoutes).toEqual(['/customers', '/more/sales']);
    expect(staffRoutes).not.toContain('/more/purchases');
    expect(staffRoutes).not.toContain('/more/staff');
    expect(staffRoutes).not.toContain('/more/reports');
    expect(staffRoutes).not.toContain('/more/settings');
  });

  it('also denies direct deep links to owner-only management pages for staff', () => {
    for (const module of ['purchases', 'reports', 'staff', 'settings']) {
      expect(canOpenManagementModule(module, 'staff')).toBe(false);
      expect(canOpenManagementModule(module, 'owner')).toBe(true);
    }
  });

  it('permits both roles to view sales history through a direct route', () => {
    expect(canOpenManagementModule('sales', 'owner')).toBe(true);
    expect(canOpenManagementModule('sales', 'staff')).toBe(true);
  });

  it('rejects unknown or potentially malformed deep link module names', () => {
    for (const module of ['unknown', '../staff', 'Staff', '', 'settings?role=owner']) {
      expect(canOpenManagementModule(module, 'owner')).toBe(false);
      expect(canOpenManagementModule(module, 'staff')).toBe(false);
    }
  });
});
