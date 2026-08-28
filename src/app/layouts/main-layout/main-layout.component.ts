import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AuthService } from '../../core/services/auth.service';
import { LoadingOverlayComponent } from '../../shared/components/loading-overlay/loading-overlay.component';
import { environment } from '../../../environments/environment';

interface NavItem {
  label: string;
  route: string;
  icon: string;
  /** Require any of these permissions; omit for always-visible authenticated items */
  permissions?: string[];
}

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    LoadingOverlayComponent,
  ],
  templateUrl: './main-layout.component.html',
  styleUrl: './main-layout.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MainLayoutComponent implements OnInit {
  private readonly auth = inject(AuthService);

  readonly appName = environment.appName;
  readonly user = this.auth.user;
  readonly sidebarCollapsed = signal(false);
  readonly mobileOpen = signal(false);

  private readonly allNavItems: NavItem[] = [
    { label: 'Dashboard', route: '/dashboard', icon: 'dashboard', permissions: ['dashboard:view'] },
    {
      label: 'Organization',
      route: '/organization',
      icon: 'apartment',
      permissions: ['organization:view'],
    },
    { label: 'Employees', route: '/employees', icon: 'groups', permissions: ['employees:view'] },
    { label: 'Attendance', route: '/attendance', icon: 'schedule', permissions: ['attendance:view'] },
    { label: 'Leave', route: '/leave', icon: 'event_available', permissions: ['leave:view'] },
    { label: 'Payroll', route: '/payroll', icon: 'payments', permissions: ['payroll:view'] },
    {
      label: 'Recruitment',
      route: '/recruitment',
      icon: 'work',
      permissions: ['recruitment:view'],
    },
    {
      label: 'Performance',
      route: '/performance',
      icon: 'trending_up',
      permissions: ['performance:view'],
    },
    { label: 'AI Assistant', route: '/ai', icon: 'auto_awesome', permissions: ['ai:view'] },
    { label: 'Reports', route: '/reports', icon: 'analytics', permissions: ['reports:view'] },
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

  ngOnInit(): void {
    if (this.auth.isAuthenticated()) {
      this.auth.me().subscribe({ error: () => undefined });
    }
  }

  toggleSidebar(): void {
    this.sidebarCollapsed.update((value) => !value);
  }

  toggleMobile(): void {
    this.mobileOpen.update((value) => !value);
  }

  closeMobile(): void {
    this.mobileOpen.set(false);
  }

  logout(): void {
    this.auth.logout();
  }
}
