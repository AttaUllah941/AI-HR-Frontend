import {

  ChangeDetectionStrategy,

  Component,

  OnInit,

  computed,

  inject,

  signal,

} from '@angular/core';

import { FormsModule } from '@angular/forms';

import { DatePipe } from '@angular/common';

import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

import { filter } from 'rxjs';

import { MatButtonModule } from '@angular/material/button';

import { MatIconModule } from '@angular/material/icon';

import { MatTooltipModule } from '@angular/material/tooltip';

import { MatMenuModule } from '@angular/material/menu';

import { MatBadgeModule } from '@angular/material/badge';

import { MatDividerModule } from '@angular/material/divider';

import { AuthService } from '../../core/services/auth.service';

import {

  DashboardNotificationItem,

  DashboardService,

} from '../../core/services/dashboard.service';

import { ToastService } from '../../core/services/toast.service';

import { LoadingOverlayComponent } from '../../shared/components/loading-overlay/loading-overlay.component';

import {

  BreadcrumbComponent,

  BreadcrumbItem,

} from '../../shared/components/breadcrumb/breadcrumb.component';

import { environment } from '../../../environments/environment';



interface NavItem {

  label: string;

  route: string;

  icon: string;

  permissions?: string[];

  badge?: string;

}



const ROUTE_LABELS: Record<string, string> = {

  dashboard: 'Dashboard',

  organization: 'Organization',

  overview: 'Overview',

  branches: 'Branches',

  departments: 'Departments',

  teams: 'Teams',

  designations: 'Designations',

  chart: 'Org chart',

  employees: 'Employees',

  attendance: 'Attendance',

  leave: 'Leave',

  payroll: 'Payroll',

  recruitment: 'Recruitment',

  performance: 'Performance',

  documents: 'Documents',

  policies: 'Policies',

  ai: 'AI Assistant',

  reports: 'Reports',

  notifications: 'Notifications',

  profile: 'Profile',

  settings: 'Settings',

  files: 'Files',

  'mfa-setup': 'MFA setup',

};



const ROLE_LABELS: Record<string, string> = {

  SUPER_ADMIN: 'Super Admin',

  HR_ADMIN: 'HR Admin',

  HR_MANAGER: 'HR Manager',

  RECRUITER: 'Recruiter',

  MANAGER: 'Manager',

  EMPLOYEE: 'Employee',

};



@Component({

  selector: 'app-main-layout',

  standalone: true,

  imports: [

    RouterOutlet,

    RouterLink,

    RouterLinkActive,

    FormsModule,

    DatePipe,

    MatButtonModule,

    MatIconModule,

    MatTooltipModule,

    MatMenuModule,

    MatBadgeModule,

    MatDividerModule,

    LoadingOverlayComponent,

    BreadcrumbComponent,

  ],

  templateUrl: './main-layout.component.html',

  styleUrl: './main-layout.component.scss',

  changeDetection: ChangeDetectionStrategy.OnPush,

})

export class MainLayoutComponent implements OnInit {

  private readonly auth = inject(AuthService);

  private readonly dashboard = inject(DashboardService);

  private readonly toast = inject(ToastService);

  private readonly router = inject(Router);



  readonly appName = environment.appName;

  readonly user = this.auth.user;

  readonly mobileOpen = signal(false);

  readonly searchQuery = signal('');

  readonly breadcrumbs = signal<BreadcrumbItem[]>([{ label: 'Home', route: '/dashboard' }]);

  readonly notifications = signal<DashboardNotificationItem[]>([]);

  readonly notificationCount = signal(0);

  readonly companyName = signal('Zenith Enterprises');

  readonly greetingMessage = signal('Good morning');

  readonly pageTitle = signal<string | null>(null);

  readonly showBreadcrumbs = signal(false);



  readonly displayName = computed(() => {

    const current = this.user();

    if (!current) {

      return 'Account';

    }

    return `${current.firstName} ${current.lastName}`.trim() || current.email;

  });



  readonly roleLabel = computed(() => {

    const roles = this.user()?.roles ?? [];

    const primary = roles[0];

    return primary ? (ROLE_LABELS[primary] ?? primary.replace(/_/g, ' ')) : 'User';

  });



  readonly initials = computed(() => {

    const current = this.user();

    if (!current) {

      return 'U';

    }

    const first = current.firstName?.[0] ?? '';

    const last = current.lastName?.[0] ?? '';

    return (first + last || current.email[0] || 'U').toUpperCase();

  });



  private readonly allNavItems: NavItem[] = [

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



  private readonly secondaryNavItems: NavItem[] = [

    {

      label: 'Organization',

      route: '/organization',

      icon: 'apartment',

      permissions: ['organization:view'],

    },

    { label: 'Documents', route: '/files', icon: 'description', permissions: ['files:view'] },

    { label: 'Policies', route: '/policies', icon: 'policy', permissions: ['settings:view'] },

    { label: 'Reports', route: '/reports', icon: 'analytics', permissions: ['reports:view'] },

    {

      label: 'AI Assistant',

      route: '/ai',

      icon: 'auto_awesome',

      permissions: ['ai:view'],

      badge: 'NEW',

    },

    { label: 'Settings', route: '/settings', icon: 'settings', permissions: ['settings:view'] },

  ];



  readonly navItems = computed(() =>

    this.allNavItems.filter((item) => {

      if (!item.permissions?.length) {

        return true;

      }

      return this.auth.hasAnyPermission(...item.permissions);

    }),

  );



  readonly secondaryItems = computed(() =>

    this.secondaryNavItems.filter((item) => {

      if (!item.permissions?.length) {

        return true;

      }

      return this.auth.hasAnyPermission(...item.permissions);

    }),

  );



  ngOnInit(): void {

    this.updateBreadcrumbs(this.router.url);

    this.updatePageTitle(this.router.url);

    this.showBreadcrumbs.set(this.shouldShowBreadcrumbs(this.router.url));



    this.router.events

      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))

      .subscribe((event) => {

        this.updateBreadcrumbs(event.urlAfterRedirects);

        this.updatePageTitle(event.urlAfterRedirects);

        this.showBreadcrumbs.set(this.shouldShowBreadcrumbs(event.urlAfterRedirects));

        this.closeMobile();

      });



    if (this.auth.isAuthenticated()) {
      // Refresh session so JWT permissions stay in sync with role changes (e.g. new modules).
      this.auth.refresh().subscribe({
        error: () => this.auth.me().subscribe({ error: () => undefined }),
      });

      this.loadNotifications();

      this.loadGreeting();

    }

  }



  toggleMobile(): void {

    this.mobileOpen.update((value) => !value);

  }



  closeMobile(): void {

    this.mobileOpen.set(false);

  }



  onSearchSubmit(): void {

    const query = this.searchQuery().trim();

    if (!query) {

      return;

    }

    this.toast.info('Global search arrives in a later phase. Query saved locally for now.');

  }



  logout(): void {

    this.auth.logout();

  }



  private loadGreeting(): void {

    this.dashboard.getSummary().subscribe({

      next: (data) => {

        this.greetingMessage.set(`${data.greeting.message.replace(',', '')} 👋`);

        this.companyName.set(data.company.name);

      },

      error: () => undefined,

    });

  }



  private loadNotifications(): void {

    this.dashboard.getNotifications().subscribe({

      next: (data) => {

        this.notifications.set(data.items);

        this.notificationCount.set(data.unreadCount);

      },

      error: () => {

        this.notifications.set([]);

        this.notificationCount.set(0);

      },

    });

  }



  private shouldShowBreadcrumbs(url: string): boolean {
    const path = url.split('?')[0];
    if (path.startsWith('/dashboard')) {
      return false;
    }
    if (path === '/employees') {
      return false;
    }
    if (path.startsWith('/attendance')) {
      return false;
    }
    if (path.startsWith('/leave')) {
      return false;
    }
    return true;
  }

  private updatePageTitle(url: string): void {
    const path = url.split('?')[0];
    const segments = path.split('/').filter(Boolean);

    if (segments.length === 1 && segments[0] === 'employees') {
      this.pageTitle.set('Employees');
      return;
    }

    if (segments[0] === 'dashboard' && segments.length <= 1) {
      this.pageTitle.set(null);
      return;
    }

    if (segments.length >= 1 && ROUTE_LABELS[segments[0]]) {
      this.pageTitle.set(ROUTE_LABELS[segments[0]]);
      return;
    }

    this.pageTitle.set(null);
  }

  private updateBreadcrumbs(url: string): void {

    const segments = url.split('?')[0].split('/').filter(Boolean);

    const items: BreadcrumbItem[] = [{ label: 'Home', route: '/dashboard' }];



    let path = '';

    for (const segment of segments) {

      path += `/${segment}`;

      items.push({

        label: ROUTE_LABELS[segment] ?? segment,

        route: path,

      });

    }



    if (items.length === 1) {

      items.push({ label: 'Dashboard', route: '/dashboard' });

    }



    this.breadcrumbs.set(items);

  }

}


