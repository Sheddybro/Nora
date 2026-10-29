import React, { createContext, useContext } from 'react';

export type PreviewRole = 'owner' | 'staff';
export const MobileRoleContext = createContext<{ role: PreviewRole; setRole: (role: PreviewRole) => void }>({
  role: 'owner',
  setRole: () => undefined,
});

export function usePreviewRole() {
  return useContext(MobileRoleContext);
}
