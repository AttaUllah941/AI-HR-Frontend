import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
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

  readonly appName = environment.appName;
  readonly user = this.auth.user;
  readonly sidebarCollapsed = signal(false);
  readonly mobileOpen = signal(false);

  readonly navItems: NavItem[] = [
    { label: 'Dashboard', route: '/dashboard', icon: 'dashboard' },
    { label: 'Organization', route: '/organization', icon: 'apartment' },
    { label: 'Employees', route: '/employees', icon: 'groups' },
    { label: 'Attendance', route: '/attendance', icon: 'schedule' },
    { label: 'Leave', route: '/leave', icon: 'event_available' },
    { label: 'Payroll', route: '/payroll', icon: 'payments' },
    { label: 'Recruitment', route: '/recruitment', icon: 'work' },
    { label: 'Performance', route: '/performance', icon: 'trending_up' },
    { label: 'AI Assistant', route: '/ai', icon: 'auto_awesome' },
    { label: 'Reports', route: '/reports', icon: 'analytics' },
    { label: 'Settings', route: '/settings', icon: 'settings' },
  ];

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
