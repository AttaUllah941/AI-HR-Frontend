import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import { DashboardService } from '../../core/services/dashboard.service';
import {
  BreadcrumbComponent,
  BreadcrumbItem,
} from '../../shared/components/breadcrumb/breadcrumb.component';
import { environment } from '../../../environments/environment';
import { BottomNavComponent } from './bottom-nav/bottom-nav.component';
import { AppHeaderComponent } from './header/app-header.component';
import { SidebarComponent } from './sidebar/sidebar.component';

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
  search: 'Search',
  settings: 'Settings',
  files: 'Files',
  'mfa-setup': 'MFA setup',
};

function timeOfDayGreeting(now: Date = new Date()): string {
  const hour = now.getHours();
  if (hour < 12) {
    return 'Good morning';
  }
  return hour < 18 ? 'Good afternoon' : 'Good evening';
}

/** App shell: sidebar + header around the routed page, with breadcrumbs and page title. */
@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [
    RouterOutlet,
    SidebarComponent,
    AppHeaderComponent,
    BottomNavComponent,
    BreadcrumbComponent,
  ],
  templateUrl: './main-layout.component.html',
  styleUrl: './main-layout.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MainLayoutComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly dashboard = inject(DashboardService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  readonly mobileOpen = signal(false);
  readonly breadcrumbs = signal<BreadcrumbItem[]>([{ label: 'Home', route: '/dashboard' }]);
  readonly companyName = signal(environment.appName);
  readonly greetingMessage = signal(`${timeOfDayGreeting()} 👋`);
  readonly pageTitle = signal<string | null>(null);
  readonly showBreadcrumbs = signal(false);

  ngOnInit(): void {
    this.updateBreadcrumbs(this.router.url);
    this.updatePageTitle(this.router.url);
    this.showBreadcrumbs.set(this.shouldShowBreadcrumbs(this.router.url));

    this.router.events
      .pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((event) => {
        this.updateBreadcrumbs(event.urlAfterRedirects);
        this.updatePageTitle(event.urlAfterRedirects);
        this.showBreadcrumbs.set(this.shouldShowBreadcrumbs(event.urlAfterRedirects));
        this.closeMobile();
      });

    if (this.auth.isAuthenticated()) {
      // Refresh session so JWT permissions stay in sync with role changes (e.g. new modules).
      this.auth.refresh().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
        error: () => this.auth.me().subscribe({ error: () => undefined }),
      });
      this.loadGreeting();
    }
  }

  toggleMobile(): void {
    this.mobileOpen.update((value) => !value);
  }

  closeMobile(): void {
    this.mobileOpen.set(false);
  }

  private loadGreeting(): void {
    this.dashboard.getGreeting().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (data) => {
        this.companyName.set(data.company.name);
      },
      error: () => undefined,
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
