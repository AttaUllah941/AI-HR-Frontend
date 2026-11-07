import type { AuthUser } from '../../core/models/api.models';

const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: 'Super Admin',
  HR_ADMIN: 'HR Admin',
  HR_MANAGER: 'HR Manager',
  RECRUITER: 'Recruiter',
  MANAGER: 'Manager',
  EMPLOYEE: 'Employee',
};

export function displayNameOf(user: AuthUser | null): string {
  if (!user) {
    return 'Account';
  }
  return `${user.firstName} ${user.lastName}`.trim() || user.email;
}

export function roleLabelOf(user: AuthUser | null): string {
  const primary = (user?.roles ?? [])[0];
  return primary ? (ROLE_LABELS[primary] ?? primary.replace(/_/g, ' ')) : 'User';
}

export function initialsOf(user: AuthUser | null): string {
  if (!user) {
    return 'U';
  }
  const first = user.firstName?.[0] ?? '';
  const last = user.lastName?.[0] ?? '';
  return (first + last || user.email[0] || 'U').toUpperCase();
}
