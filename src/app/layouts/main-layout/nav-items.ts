export interface NavItem {
  label: string;
  route: string;
  icon: string;
  permissions?: string[];
  badge?: string;
}

export const PRIMARY_NAV: NavItem[] = [
  { label: 'Dashboard', route: '/dashboard', icon: 'dashboard', permissions: ['dashboard:view'] },
  { label: 'Employees', route: '/employees', icon: 'groups', permissions: ['employees:view'] },
  { label: 'Attendance', route: '/attendance', icon: 'schedule', permissions: ['attendance:view'] },
  { label: 'Leave', route: '/leave', icon: 'event_available', permissions: ['leave:view'] },
  { label: 'Recruitment', route: '/recruitment', icon: 'work', permissions: ['recruitment:view'] },
  { label: 'Payroll', route: '/payroll', icon: 'payments', permissions: ['payroll:view'] },
  {
    label: 'Performance',
    route: '/performance',
    icon: 'trending_up',
    permissions: ['performance:view'],
  },
];

export const SECONDARY_NAV: NavItem[] = [
  {
    label: 'Organization',
    route: '/organization',
    icon: 'apartment',
    permissions: ['organization:view'],
  },
  { label: 'Documents', route: '/files', icon: 'description', permissions: ['files:view'] },
  { label: 'Policies', route: '/ai/policies', icon: 'policy', permissions: ['ai:view'] },
  { label: 'Reports', route: '/reports', icon: 'analytics', permissions: ['reports:view'] },
  {
    label: 'Notifications',
    route: '/notifications',
    icon: 'notifications',
    permissions: ['notifications:view'],
  },
  {
    label: 'AI Assistant',
    route: '/ai/assistant',
    icon: 'auto_awesome',
    permissions: ['ai:view'],
    badge: 'NEW',
  },
  { label: 'Settings', route: '/settings', icon: 'settings', permissions: ['settings:view'] },
];
