export type UserRole = 'owner' | 'editor' | 'viewer';

export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  initials: string;
}

export interface ProjectMember {
  user: User;
  role: UserRole;
  joinedAt: string;
}

export interface RolePermissions {
  canView: boolean;
  canMeasure: boolean;
  canAnnotate: boolean;
  canExport: boolean;
  canShare: boolean;
  canInvite: boolean;
  canArchive: boolean;
  canDelete: boolean;
}

export const ROLE_PERMISSIONS: Record<UserRole, RolePermissions> = {
  owner: {
    canView: true,
    canMeasure: true,
    canAnnotate: true,
    canExport: true,
    canShare: true,
    canInvite: true,
    canArchive: true,
    canDelete: true,
  },
  editor: {
    canView: true,
    canMeasure: true,
    canAnnotate: true,
    canExport: true,
    canShare: true,
    canInvite: false,
    canArchive: false,
    canDelete: false,
  },
  viewer: {
    canView: true,
    canMeasure: false,
    canAnnotate: false,
    canExport: false,
    canShare: false,
    canInvite: false,
    canArchive: false,
    canDelete: false,
  },
};

// Mock users for the demo
export const mockUsers: User[] = [
  { id: 'user-1', name: 'John Davis', email: 'john@mirrorlabs.com', initials: 'JD' },
  { id: 'user-2', name: 'Mary Kim', email: 'mary@mirrorlabs.com', initials: 'MK' },
  { id: 'user-3', name: 'Sarah Rodriguez', email: 'sarah@mirrorlabs.com', initials: 'SR' },
  { id: 'user-4', name: 'Alex Lee', email: 'alex@mirrorlabs.com', initials: 'AL' },
  { id: 'user-5', name: 'Brian Chen', email: 'brian@mirrorlabs.com', initials: 'BC' },
  { id: 'user-6', name: 'Diana Martinez', email: 'diana@mirrorlabs.com', initials: 'DM' },
  { id: 'user-7', name: 'Lisa Park', email: 'lisa@mirrorlabs.com', initials: 'LP' },
  { id: 'user-8', name: 'Robert Mitchell', email: 'robert@mirrorlabs.com', initials: 'RM' },
  { id: 'user-9', name: 'Tom Collins', email: 'tom@mirrorlabs.com', initials: 'TC' },
  { id: 'user-10', name: 'Emily Stone', email: 'emily@mirrorlabs.com', initials: 'ES' },
];

// Current user (simulated logged-in user)
export const currentUser: User = mockUsers[0];
