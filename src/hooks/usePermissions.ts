import { useMemo } from 'react';
import { UserRole, ROLE_PERMISSIONS, RolePermissions } from '@/types/user';

export function usePermissions(role: UserRole): RolePermissions {
  return useMemo(() => ROLE_PERMISSIONS[role], [role]);
}

// Convenience hooks for specific permissions
export function useCanMeasure(role: UserRole): boolean {
  return useMemo(() => ROLE_PERMISSIONS[role].canMeasure, [role]);
}

export function useCanAnnotate(role: UserRole): boolean {
  return useMemo(() => ROLE_PERMISSIONS[role].canAnnotate, [role]);
}

export function useCanExport(role: UserRole): boolean {
  return useMemo(() => ROLE_PERMISSIONS[role].canExport, [role]);
}

export function useCanShare(role: UserRole): boolean {
  return useMemo(() => ROLE_PERMISSIONS[role].canShare, [role]);
}

export function useCanInvite(role: UserRole): boolean {
  return useMemo(() => ROLE_PERMISSIONS[role].canInvite, [role]);
}

export function useCanArchive(role: UserRole): boolean {
  return useMemo(() => ROLE_PERMISSIONS[role].canArchive, [role]);
}

export function useCanDelete(role: UserRole): boolean {
  return useMemo(() => ROLE_PERMISSIONS[role].canDelete, [role]);
}

export default usePermissions;
