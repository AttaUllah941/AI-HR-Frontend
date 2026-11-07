import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../../../core/services/auth.service';
import { PreloadOnHoverDirective } from '../../../core/routing/preload-on-hover.directive';
import { environment } from '../../../../environments/environment';
import { displayNameOf, initialsOf, roleLabelOf } from '../user-display';

interface NavItem {
  label: string;
  route: string;
  icon: string;
  permissions?: string[];
  badge?: string;
}

const PRIMARY_NAV: NavItem[] = [
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

const SECONDARY_NAV: NavItem[] = [
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

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, MatButtonModule, MatIconModule, PreloadOnHoverDirective],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.scss',
  host: { style: 'display: contents' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SidebarComponent {
  private readonly auth = inject(AuthService);

  /** Mobile drawer state (below 960px the sidebar slides in over the content). */
  readonly open = input(false);
  /** Emitted when a navigation link is used so the mobile drawer can close. */
  readonly closeMenu = output<void>();

  readonly appName = environment.appName;
  readonly user = this.auth.user;
  readonly displayName = computed(() => displayNameOf(this.user()));
  readonly roleLabel = computed(() => roleLabelOf(this.user()));
  readonly initials = computed(() => initialsOf(this.user()));

  readonly navItems = computed(() => this.visible(PRIMARY_NAV));
  readonly secondaryItems = computed(() => this.visible(SECONDARY_NAV));

  logout(): void {
    this.auth.logout();
  }

  private visible(items: NavItem[]): NavItem[] {
    return items.filter(
      (item) => !item.permissions?.length || this.auth.hasAnyPermission(...item.permissions),
    );
  }
}
