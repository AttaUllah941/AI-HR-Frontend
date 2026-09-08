import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostListener,
  computed,
  inject,
  signal,
  viewChild,
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
  badge?: string;
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
export class MainLayoutComponent {
  private readonly auth = inject(AuthService);
  private readonly searchInput = viewChild<ElementRef<HTMLInputElement>>('globalSearch');

  readonly appName = environment.appName;
  readonly companyName = environment.companyName;
  readonly user = this.auth.user;
  readonly sidebarCollapsed = signal(false);
  readonly mobileOpen = signal(false);

  readonly displayName = computed(() => {
    const current = this.user();
    if (!current) {
      return 'User';
    }
    return `${current.firstName} ${current.lastName}`.trim() || current.email;
  });

  readonly roleLabel = computed(() => {
    const roles = this.user()?.roles ?? [];
    if (!roles.length) {
      return 'Team member';
    }
    return roles[0]
      .toLowerCase()
      .split('_')
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  });

  readonly initials = computed(() => {
    const current = this.user();
    if (!current) {
      return 'U';
    }
    const first = current.firstName?.charAt(0) ?? '';
    const last = current.lastName?.charAt(0) ?? '';
    return `${first}${last}`.toUpperCase() || current.email.charAt(0).toUpperCase();
  });

  /** Nav order mirrors Lovable Zenith/Nova shell. */
  readonly navItems: NavItem[] = [
    { label: 'Dashboard', route: '/dashboard', icon: 'dashboard' },
    { label: 'Organization', route: '/organization', icon: 'apartment' },
    { label: 'Employees', route: '/employees', icon: 'groups' },
    { label: 'Attendance', route: '/attendance', icon: 'schedule' },
    { label: 'Leave', route: '/leave', icon: 'event_available' },
    { label: 'Recruitment', route: '/recruitment', icon: 'work' },
    { label: 'Payroll', route: '/payroll', icon: 'payments' },
    { label: 'Performance', route: '/performance', icon: 'trending_up' },
    { label: 'Documents', route: '/files', icon: 'description' },
    { label: 'Policies', route: '/policies', icon: 'policy' },
    { label: 'Reports', route: '/reports', icon: 'analytics' },
    { label: 'AI Assistant', route: '/ai', icon: 'auto_awesome', badge: 'NEW' },
    { label: 'Settings', route: '/settings', icon: 'settings' },
  ];

  @HostListener('window:keydown', ['$event'])
  onGlobalKeydown(event: KeyboardEvent): void {
    const isChord = (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k';
    if (!isChord) {
      return;
    }
    event.preventDefault();
    this.searchInput()?.nativeElement.focus();
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
